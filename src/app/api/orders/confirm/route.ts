import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendOrderConfirmation, sendPaymentFailedEmail } from '@/lib/email';
import { sendAdminNotification } from '@/lib/whatsapp';

export async function POST(request: NextRequest) {
  try {
    const { external_reference, status } = await request.json();

    if (!external_reference || !status) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    let orderStatus = 'pending';
    let paymentStatus = 'pending';

    if (status === 'approved') {
      orderStatus = 'confirmed';
      paymentStatus = 'paid';
    } else if (status === 'rejected' || status === 'failure') {
      orderStatus = 'cancelled';
      paymentStatus = 'failed';
    }

    if (orderStatus === 'pending') {
      return NextResponse.json({ ok: true, updated: false });
    }

    // Actualización atómica: solo actualiza si el pedido sigue en estado 'pending'
    // Esto evita enviar correos o descontar stock dos veces (idempotencia con el webhook)
    const { data: updatedOrder } = await supabaseAdmin!
      .from('orders')
      .update({ status: orderStatus, payment_status: paymentStatus })
      .eq('payment_reference', external_reference)
      .eq('status', 'pending')
      .select('*, items:order_items(*)')
      .maybeSingle();

    if (!updatedOrder) {
      // El pedido ya fue procesado (por el webhook o una solicitud previa)
      return NextResponse.json({ ok: true, updated: false });
    }

    if (orderStatus === 'confirmed') {
      // Descontar stock de cada producto
      for (const item of updatedOrder.items) {
        const { data: product } = await supabaseAdmin!
          .from('products')
          .select('stock')
          .eq('id', item.product_id)
          .single();

        if (product) {
          await supabaseAdmin!
            .from('products')
            .update({ stock: product.stock - item.quantity })
            .eq('id', item.product_id);
        }
      }

      // Enviar correo de pago exitoso
      try {
        await sendOrderConfirmation({
          customerName: updatedOrder.customer_name,
          customerEmail: updatedOrder.customer_email,
          orderNumber: updatedOrder.order_number,
          items: updatedOrder.items.map((item: any) => ({
            name: item.product_name,
            quantity: item.quantity,
            price: item.product_price,
            total: item.total,
          })),
          subtotal: updatedOrder.subtotal,
          deliveryCost: updatedOrder.delivery_cost,
          discount: updatedOrder.discount,
          total: updatedOrder.total,
          deliveryType: updatedOrder.delivery_type,
          address: updatedOrder.address,
          department: updatedOrder.department,
          city: updatedOrder.city,
        });
      } catch (emailError) {
        console.error('Error enviando correo de éxito:', emailError);
      }

      // Notificación WhatsApp al admin
      try {
        const itemsSummary = updatedOrder.items
          .map((item: any) => `  - ${item.product_name} x${item.quantity}`)
          .join('\n');

        let message = `🛒 Nueva venta confirmada!\n📦 Pedido: #${updatedOrder.order_number}\n👤 Cliente: ${updatedOrder.customer_name}\n💰 Total: $${updatedOrder.total.toLocaleString('es-CO')} COP\n🚚 Tipo: ${updatedOrder.delivery_type === 'delivery' ? 'Envío' : 'Recogida en tienda'}\n\n📋 Productos:\n${itemsSummary}`;

        // Check for low stock warnings
        const lowStockWarnings: string[] = [];
        for (const item of updatedOrder.items) {
          const { data: product } = await supabaseAdmin!
            .from('products')
            .select('name, stock')
            .eq('id', item.product_id)
            .single();

          if (product && product.stock <= 5 && product.stock > 0) {
            lowStockWarnings.push(`  - "${product.name}" - quedan ${product.stock} unidades`);
          } else if (product && product.stock <= 0) {
            lowStockWarnings.push(`  - "${product.name}" - ¡AGOTADO!`);
          }
        }

        if (lowStockWarnings.length > 0) {
          message += `\n\n⚠️ Stock bajo:\n${lowStockWarnings.join('\n')}`;
        }

        await sendAdminNotification(message);
      } catch (waError) {
        console.error('Error enviando WhatsApp:', waError);
      }
    } else {
      // Enviar correo de pago fallido
      try {
        await sendPaymentFailedEmail({
          customerName: updatedOrder.customer_name,
          customerEmail: updatedOrder.customer_email,
          orderNumber: updatedOrder.order_number,
        });
      } catch (emailError) {
        console.error('Error enviando correo de fallo:', emailError);
      }
    }

    return NextResponse.json({ ok: true, updated: true, order: { id: updatedOrder.id, order_number: updatedOrder.order_number, status: updatedOrder.status } });
  } catch (error) {
    console.error('Confirm error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
