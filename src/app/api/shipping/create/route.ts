import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createShipment } from '@/lib/mipaquete';

export async function POST(request: NextRequest) {
  try {
    const { orderId, boxId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    // Get order with items
    const { data: order, error: orderError } = await supabaseAdmin!
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.delivery_type !== 'delivery') {
      return NextResponse.json({ error: 'Order is pickup, no shipping needed' }, { status: 400 });
    }

    // Get the city's MiPaquete code
    const { data: cityData } = await supabaseAdmin!
      .from('cities')
      .select('mipaquete_code')
      .eq('name', order.city)
      .single();

    if (!cityData?.mipaquete_code) {
      return NextResponse.json(
        { error: 'La ciudad no tiene código MiPaquete configurado' },
        { status: 400 }
      );
    }

    const originCity = process.env.MIPAQUETE_ORIGIN_CITY;
    if (!originCity) {
      return NextResponse.json({ error: 'MIPAQUETE_ORIGIN_CITY not configured' }, { status: 500 });
    }

    // Get box dimensions if boxId provided, otherwise use defaults
    let weight = parseFloat(process.env.MIPAQUETE_DEFAULT_WEIGHT || '1');
    let width = parseFloat(process.env.MIPAQUETE_DEFAULT_WIDTH || '20');
    let height = parseFloat(process.env.MIPAQUETE_DEFAULT_HEIGHT || '15');
    let length = parseFloat(process.env.MIPAQUETE_DEFAULT_LENGTH || '30');
    let boxName = 'Medidas por defecto';

    if (boxId) {
      const { data: box } = await supabaseAdmin!
        .from('shipping_boxes')
        .select('*')
        .eq('id', boxId)
        .single();

      if (box) {
        width = box.width;
        height = box.height;
        length = box.length;
        weight = box.max_weight;
        boxName = box.name;
      }
    }

    // Parse receiver name
    const nameParts = order.customer_name.split(' ');
    const receiverName = nameParts[0] || '';
    const receiverSurname = nameParts.slice(1).join(' ') || '';

    const senderName = process.env.NEXT_PUBLIC_BUSINESS_NAME || 'Tienda';

    const shipment = await createShipment({
      originCity,
      destinationCity: cityData.mipaquete_code,
      weight,
      width,
      height,
      length,
      declaredValue: order.subtotal,
      sender: {
        name: senderName,
        surname: '',
        phone: process.env.NEXT_PUBLIC_BUSINESS_PHONE?.replace(/[^0-9]/g, '') || '',
        email: process.env.NEXT_PUBLIC_BUSINESS_EMAIL || '',
        address: process.env.NEXT_PUBLIC_STORE_ADDRESS || '',
      },
      receiver: {
        name: receiverName,
        surname: receiverSurname,
        phone: order.customer_phone?.replace(/[^0-9]/g, '') || '',
        email: order.customer_email,
        address: order.address || '',
      },
      comments: `Pedido ${order.order_number} | Caja: ${boxName}`,
    });

    // Save tracking info in order notes
    const trackingInfo = `MiPaquete - Guía: ${shipment.trackingNumber} | Transportadora: ${shipment.carrier} | Caja: ${boxName}`;
    await supabaseAdmin!
      .from('orders')
      .update({
        notes: order.notes ? `${order.notes}\n${trackingInfo}` : trackingInfo,
        status: 'shipped',
      })
      .eq('id', orderId);

    return NextResponse.json({
      shipment,
      message: 'Guía creada exitosamente',
    });
  } catch (error) {
    console.error('Create shipment error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create shipment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
