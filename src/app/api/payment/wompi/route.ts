import { NextRequest, NextResponse } from 'next/server';

// Wompi payment gateway integration (Bancolombia)
export async function POST(request: NextRequest) {
  try {
    const { items, reference, customerEmail, redirectUrl } = await request.json();

    const publicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
    if (!publicKey) {
      return NextResponse.json(
        { error: 'Wompi public key not configured' },
        { status: 500 }
      );
    }

    // Calculate total in cents (COP)
    const totalCents = items.reduce(
      (sum: number, item: any) => sum + item.unit_price * item.quantity * 100,
      0
    );

    // Generate unique reference
    const paymentReference = reference || crypto.randomUUID();

    // Build Wompi checkout redirect URL
    const baseUrl = process.env.WOMPI_SANDBOX === 'true'
      ? 'https://checkout.wompi.co/p/'
      : 'https://checkout.wompi.co/p/';

    const params = new URLSearchParams({
      'public-key': publicKey,
      'currency': 'COP',
      'amount-in-cents': String(totalCents),
      'reference': paymentReference,
      'redirect-url': redirectUrl || `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/success`,
    });

    if (customerEmail) {
      params.set('customer-data:email', customerEmail);
    }

    const checkoutUrl = `${baseUrl}?${params.toString()}`;

    return NextResponse.json({
      payment_url: checkoutUrl,
      identifier: paymentReference,
    });
  } catch (error) {
    console.error('Wompi payment creation error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
