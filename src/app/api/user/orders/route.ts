import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin!
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('clerk_user_id', userId)
    .neq('payment_status', 'failed')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('User orders fetch error:', error);
    return NextResponse.json({ error: 'Error al obtener pedidos' }, { status: 500 });
  }

  return NextResponse.json({ orders: data });
}
