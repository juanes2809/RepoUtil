import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendAdminNotification } from '@/lib/whatsapp';
import { sendOrderConfirmation } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { customer_name, customer_phone, customer_email, items, notes, discount } = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    // Validate stock availability
    for (const item of items) {
      const { data: product } = await supabaseAdmin!
        .from('products')
        .select('id, name, stock')
        .eq('id', item.product_id)
        .single();

      if (!product) {
        return NextResponse.json({ error: `Producto no encontrado: ${item.product_name}` }, { status: 400 });
      }
      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Stock insuficiente para "${product.name}". Disponible: ${product.stock}, solicitado: ${item.quantity}` },
          { status: 400 }
        );
      }
    }

    const subtotal = items.reduce((sum: number, item: any) => sum + item.total, 0);
    const discountAmount = discount || 0;
    const total = subtotal - discountAmount;

    const orderNumber = `VPP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Create order as completed + paid (in-person sale)
    const { data: orderData, error: orderError } = await supabaseAdmin!
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_name: customer_name || 'Venta en persona',
        customer_email: customer_email || 'venta-en-persona@tienda.local',
        customer_phone: customer_phone || null,
        delivery_type: 'pickup',
        payment_method: 'in_person',
        payment_status: 'paid',
        subtotal,
        delivery_cost: 0,
        discount: discountAmount,
        total,
        status: 'completed',
        notes: notes || 'Venta registrada manualmente desde el panel de administración',
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    const orderItems = items.map((item: any) => ({
      order_id: orderData.id,
      product_id: item.product_id,
      product_name: item.product_name,
      product_price: item.product_price,
      quantity: item.quantity,
      total: item.total,
    }));

    const { error: itemsError } = await supabaseAdmin!
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    // Decrement stock immediately (sale is already completed)
    for (const item of items) {
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

    // Fetch the complete order with items for the receipt
    const { data: completeOrder } = await supabaseAdmin!
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('id', orderData.id)
      .single();

    // Send email receipt if customer email was provided
    if (customer_email && customer_email !== 'venta-en-persona@tienda.local') {
      try {
        await sendOrderConfirmation({
          customerName: customer_name || 'Cliente',
          customerEmail: customer_email,
          orderNumber,
          items: items.map((item: any) => ({
            name: item.product_name,
            quantity: item.quantity,
            price: item.product_price,
            total: item.total,
          })),
          subtotal,
          deliveryCost: 0,
          discount: discountAmount,
          total,
          deliveryType: 'pickup',
        });
      } catch (emailError) {
        console.error('Error enviando recibo por email:', emailError);
      }
    }

    // Notificación WhatsApp al admin
    try {
      const itemsSummary = items
        .map((item: any) => `  - ${item.product_name} x${item.quantity}`)
        .join('\n');

      let message = `🏪 Venta en persona registrada!\n📦 Pedido: #${orderNumber}\n👤 Cliente: ${customer_name || 'Sin nombre'}\n💰 Total: $${total.toLocaleString('es-CO')} COP\n\n📋 Productos:\n${itemsSummary}`;

      // Check for low stock warnings
      const lowStockWarnings: string[] = [];
      for (const item of items) {
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

    return NextResponse.json({ order: completeOrder });
  } catch (error) {
    console.error('Manual sale error:', error);
    return NextResponse.json({ error: 'Error al registrar la venta' }, { status: 500 });
  }
}
