import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendShippingGuideEmail } from '@/lib/email';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { guideNumber } = await request.json();

    if (!guideNumber?.trim()) {
      return NextResponse.json({ error: 'El número de guía es requerido' }, { status: 400 });
    }

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    await sendShippingGuideEmail({
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      orderNumber: order.order_number,
      guideNumber: guideNumber.trim(),
      city: order.city,
      department: order.department,
      address: order.address,
    });

    // Guardar el número de guía en las notas del pedido
    const guideNote = `Guía Coordinadora: ${guideNumber.trim()}`;
    const updatedNotes = order.notes
      ? `${order.notes}\n${guideNote}`
      : guideNote;

    await supabaseAdmin
      .from('orders')
      .update({ notes: updatedNotes, status: 'shipped' })
      .eq('id', params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending guide email:', error);
    return NextResponse.json({ error: 'Error al enviar el correo' }, { status: 500 });
  }
}
