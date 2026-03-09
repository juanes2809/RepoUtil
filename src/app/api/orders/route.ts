import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { order, items } = await request.json();

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create order
    const { data: orderData, error: orderError } = await supabaseAdmin!
      .from('orders')
      .insert({
        ...order,
        order_number: orderNumber,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    const orderItems = items.map((item: any) => ({
      ...item,
      order_id: orderData.id,
    }));

    const { error: itemsError } = await supabaseAdmin!
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    // NOTE: Stock is NOT decremented here.
    // It is decremented only after payment is confirmed (webhook or confirm endpoint).

    // NOTE: Confirmation email is NOT sent here.
    // It is sent only after payment status is known (success or failure).

    return NextResponse.json({ order: orderData });
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('payment_status');

    // Auto-cleanup: delete failed payments and pending payments older than 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Delete failed payment orders (they're useless)
    await supabaseAdmin!
      .from('orders')
      .delete()
      .eq('payment_status', 'failed');

    // Delete pending payment orders older than 24 hours (abandoned)
    await supabaseAdmin!
      .from('orders')
      .delete()
      .eq('payment_status', 'pending')
      .lt('created_at', oneDayAgo);

    let query = supabaseAdmin!
      .from('orders')
      .select('*, items:order_items(*)')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (paymentStatus) {
      query = query.eq('payment_status', paymentStatus);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ orders: data });
  } catch (error) {
    console.error('Orders fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
