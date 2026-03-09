import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { items, successUrl, failureUrl, pendingUrl } = await request.json();

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json(
        { error: 'MercadoPago access token not configured' },
        { status: 500 }
      );
    }

    const identifier = crypto.randomUUID();

    const isLocalhost =
      successUrl.includes('localhost') || successUrl.includes('127.0.0.1');

    const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const preference: Record<string, any> = {
      items: items.map((item: any) => ({
        id: item.id || crypto.randomUUID(),
        title: item.title,
        description: item.description || '',
        quantity: item.quantity,
        unit_price: item.unit_price,
        currency_id: 'COP',
      })),
      back_urls: {
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl,
      },
      // IPN: MercadoPago llama a esta URL servidor-a-servidor cuando el pago se procesa
      // En local usa localtunnel; en producción usa el dominio de Vercel
      notification_url: `${appUrl}/api/webhook/mercadopago`,
      binary_mode: true,
      external_reference: identifier,
      metadata: { identifier },
    };

    // auto_return solo funciona con URLs HTTPS públicas (no localhost)
    if (!isLocalhost) {
      preference.auto_return = 'approved';
    }

    const response = await fetch(
      'https://api.mercadopago.com/checkout/preferences',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(preference),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('MercadoPago error:', data);
      return NextResponse.json(
        { error: 'Error creating preference', detail: data },
        { status: 500 }
      );
    }

    const isTest = accessToken.startsWith('TEST-');
    const paymentUrl = isTest
      ? data.sandbox_init_point
      : data.init_point;

    return NextResponse.json({
      payment_url: paymentUrl,
      identifier,
    });
  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
