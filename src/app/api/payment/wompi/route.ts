import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Wompi payment gateway integration (Bancolombia)
export async function POST(request: NextRequest) {
  try {
    const { items, reference, customerEmail, redirectUrl } = await request.json();

    const publicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
    const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;

    if (!publicKey) {
      return NextResponse.json(
        { error: 'Wompi public key not configured' },
        { status: 500 }
      );
    }

    if (!integritySecret) {
      return NextResponse.json(
        { error: 'Wompi integrity secret not configured' },
        { status: 500 }
      );
    }

    // Calculate total in cents (COP)
    const totalCents = Math.round(
      items.reduce(
        (sum: number, item: any) => sum + item.unit_price * item.quantity * 100,
        0
      )
    );

    // Generate unique reference
    const paymentReference = reference || crypto.randomUUID();
    const currency = 'COP';

    // Generate integrity signature: SHA256(reference + amount_in_cents + currency + integrity_secret)
    const integrityString = `${paymentReference}${totalCents}${currency}${integritySecret}`;
    const integritySignature = crypto
      .createHash('sha256')
      .update(integrityString)
      .digest('hex');

    // Build Wompi checkout redirect URL
    const redirectTo = redirectUrl || `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/success`;

    const params = new URLSearchParams({
      'public-key': publicKey,
      'currency': currency,
      'amount-in-cents': String(totalCents),
      'reference': paymentReference,
      'signature:integrity': integritySignature,
      'redirect-url': redirectTo,
    });

    if (customerEmail) {
      params.set('customer-data:email', customerEmail);
    }

    const checkoutUrl = `https://checkout.wompi.co/p/?${params.toString()}`;

    return NextResponse.json({
      payment_url: checkoutUrl,
      identifier: paymentReference,
    });
  } catch (error) {
    console.error('Wompi payment creation error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
