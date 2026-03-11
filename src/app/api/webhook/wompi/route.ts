import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendOrderConfirmation, sendPaymentFailedEmail } from '@/lib/email';
import { sendAdminNotification } from '@/lib/whatsapp';
import crypto from 'crypto';

function verifyWompiSignature(body: any, eventsSecret: string): boolean {
  try {
    const signature = body.signature;
    if (!signature?.checksum || !signature?.properties || !body.timestamp) return false;

    // Build the concatenated string from the properties in order
    const transaction = body.data?.transaction;
    if (!transaction) return false;

    const values = signature.properties
      .map((prop: string) => {
        const keys = prop.split('.');
        let val: any = body.data;
        for (const k of keys) val = val?.[k];
        return val;
      })
      .join('');

    const toHash = `${values}${body.timestamp}${eventsSecret}`;
    const hash = crypto.createHash('sha256').update(toHash).digest('hex');

    return hash === signature.checksum;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const eventsSecret = process.env.WOMPI_EVENTS_SECRET;

    // Verify signature if secret is configured
    if (eventsSecret && !verifyWompiSignature(body, eventsSecret)) {
      console.error('[Wompi Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = body.event;
    const transaction = body.data?.transaction;

    if (event !== 'transaction.updated' || !transaction) {
      return NextResponse.json({ received: true });
    }

    const { reference, status: wompiStatus } = transaction;

    console.log('[Wompi Webhook] ref:', reference, 'status:', wompiStatus);

    if (!reference) {
      return NextResponse.json({ received: true });
    }

    let orderStatus = 'pending';
    let paymentStatus = 'pending';

    if (wompiStatus === 'APPROVED') {
      orderStatus = 'confirmed';
      paymentStatus = 'paid';
    } else if (wompiStatus === 'DECLINED' || wompiStatus === 'VOIDED' || wompiStatus === 'ERROR') {
      orderStatus = 'cancelled';
      paymentStatus = 'failed';
    }

    if (orderStatus === 'pending') {
      return NextResponse.json({ received: true });
    }

    // Atomic update: only if order is still pending (idempotency)
    const { data: updatedOrder } = await supabaseAdmin!
      .from('orders')
      .update({ status: orderStatus, payment_status: paymentStatus })
      .eq('payment_reference', reference)
      .eq('status', 'pending')
      .select('*, items:order_items(*)')
      .maybeSingle();

    if (!updatedOrder) {
      console.log('[Wompi Webhook] Order already processed:', reference);
      return NextResponse.json({ received: true });
    }

    if (orderStatus === 'confirmed') {
      // Decrement stock
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

      // Send confirmation email
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
        console.error('[Wompi Webhook] Email error:', emailError);
      }

      // WhatsApp admin notification
      try {
        const itemsSummary = updatedOrder.items
          .map((item: any) => `  - ${item.product_name} x${item.quantity}`)
          .join('\n');

        let message = `🛒 Nueva venta confirmada (Wompi)!\n📦 Pedido: #${updatedOrder.order_number}\n👤 Cliente: ${updatedOrder.customer_name}\n💰 Total: $${updatedOrder.total.toLocaleString('es-CO')} COP\n🚚 Tipo: ${updatedOrder.delivery_type === 'delivery' ? 'Envío' : 'Recogida en tienda'}\n\n📋 Productos:\n${itemsSummary}`;

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
        console.error('[Wompi Webhook] WhatsApp error:', waError);
      }
    } else {
      try {
        await sendPaymentFailedEmail({
          customerName: updatedOrder.customer_name,
          customerEmail: updatedOrder.customer_email,
          orderNumber: updatedOrder.order_number,
        });
      } catch (emailError) {
        console.error('[Wompi Webhook] Email error:', emailError);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Wompi webhook error:', error);
    return NextResponse.json({ received: true });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
