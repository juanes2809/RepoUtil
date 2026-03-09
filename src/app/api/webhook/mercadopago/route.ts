import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendOrderConfirmation, sendPaymentFailedEmail } from '@/lib/email';
import { sendAdminNotification } from '@/lib/whatsapp';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get('topic') || searchParams.get('type');
    const id = searchParams.get('id');

    // MercadoPago también puede enviar el body con data.id
    let paymentId = id;
    if (!paymentId || topic === 'payment') {
      try {
        const body = await request.json();
        paymentId = body?.data?.id || id;
      } catch {
        // body vacío, usamos el id del query param
      }
    }

    if (!paymentId) {
      return NextResponse.json({ received: true });
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json({ error: 'No access token' }, { status: 500 });
    }

    // Consultar el estado real del pago en MercadoPago
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!mpResponse.ok) {
      return NextResponse.json({ received: true });
    }

    const payment = await mpResponse.json();
    const externalReference = payment.external_reference;
    const status = payment.status;

    console.log('[MP IPN] payment:', paymentId, 'status:', status, 'ref:', externalReference);

    if (!externalReference) {
      return NextResponse.json({ received: true });
    }

    let orderStatus = 'pending';
    let paymentStatus = 'pending';

    if (status === 'approved') {
      orderStatus = 'confirmed';
      paymentStatus = 'paid';
    } else if (status === 'rejected' || status === 'cancelled') {
      orderStatus = 'cancelled';
      paymentStatus = 'failed';
    }

    if (orderStatus === 'pending') {
      return NextResponse.json({ received: true });
    }

    // Actualización atómica: solo actualiza si el pedido sigue en estado 'pending'
    // Esto evita procesar el mismo pedido dos veces (idempotencia)
    const { data: updatedOrder } = await supabaseAdmin!
      .from('orders')
      .update({ status: orderStatus, payment_status: paymentStatus })
      .eq('payment_reference', externalReference)
      .eq('status', 'pending')
      .select('*, items:order_items(*)')
      .maybeSingle();

    if (!updatedOrder) {
      // El pedido ya fue procesado por otra solicitud (redirect o webhook previo)
      console.log('[MP IPN] Pedido ya procesado, skipping:', externalReference);
      return NextResponse.json({ received: true });
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
        console.error('[MP IPN] Error enviando correo de éxito:', emailError);
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
        console.error('[MP IPN] Error enviando WhatsApp:', waError);
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
        console.error('[MP IPN] Error enviando correo de fallo:', emailError);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('MercadoPago IPN error:', error);
    return NextResponse.json({ received: true });
  }
}

// MercadoPago a veces hace GET para validar el endpoint
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
