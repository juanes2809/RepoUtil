import { NextRequest, NextResponse } from 'next/server';
import { getShippingQuotes } from '@/lib/mipaquete';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { destinationCity, declaredValue } = body;

    if (!destinationCity || !declaredValue) {
      return NextResponse.json(
        { error: 'destinationCity and declaredValue are required' },
        { status: 400 }
      );
    }

    const originCity = process.env.MIPAQUETE_ORIGIN_CITY;
    if (!originCity) {
      return NextResponse.json(
        { error: 'MIPAQUETE_ORIGIN_CITY not configured' },
        { status: 500 }
      );
    }

    // Default package dimensions - can be overridden per request
    const weight = body.weight || parseFloat(process.env.MIPAQUETE_DEFAULT_WEIGHT || '1');
    const width = body.width || parseFloat(process.env.MIPAQUETE_DEFAULT_WIDTH || '20');
    const height = body.height || parseFloat(process.env.MIPAQUETE_DEFAULT_HEIGHT || '15');
    const length = body.length || parseFloat(process.env.MIPAQUETE_DEFAULT_LENGTH || '30');

    const quotes = await getShippingQuotes({
      originCity,
      destinationCity,
      weight,
      width,
      height,
      length,
      declaredValue,
    });

    return NextResponse.json({ quotes });
  } catch (error) {
    console.error('Shipping quote error:', error);
    return NextResponse.json(
      { error: 'Failed to get shipping quotes' },
      { status: 500 }
    );
  }
}
