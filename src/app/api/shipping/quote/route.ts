import { NextRequest, NextResponse } from 'next/server';
import { getShippingQuotes } from '@/lib/mipaquete';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ProductDimension {
  weight: number | null;
  width: number | null;
  height: number | null;
  length: number | null;
  quantity: number;
}

interface ShippingBox {
  id: string;
  name: string;
  width: number;
  height: number;
  length: number;
  max_weight: number;
}

function findBestBox(products: ProductDimension[], boxes: ShippingBox[]) {
  // Calculate total weight and total volume of all products
  let totalWeight = 0;
  let totalVolume = 0;

  for (const p of products) {
    const w = p.weight || 0.5;
    const pw = p.width || 10;
    const ph = p.height || 10;
    const pl = p.length || 10;
    totalWeight += w * p.quantity;
    totalVolume += pw * ph * pl * p.quantity;
  }

  // Sort boxes by volume (smallest first)
  const sortedBoxes = [...boxes].sort((a, b) => {
    const volA = a.width * a.height * a.length;
    const volB = b.width * b.height * b.length;
    return volA - volB;
  });

  // Find the smallest box that fits
  for (const box of sortedBoxes) {
    const boxVolume = box.width * box.height * box.length;
    if (boxVolume >= totalVolume && box.max_weight >= totalWeight) {
      return { box, totalWeight };
    }
  }

  // No box fits — use total dimensions with fallback
  if (sortedBoxes.length > 0) {
    const largest = sortedBoxes[sortedBoxes.length - 1];
    return { box: largest, totalWeight };
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { destinationCity, declaredValue, products } = body;

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

    let weight: number;
    let width: number;
    let height: number;
    let length: number;

    // If products are provided, calculate optimal box
    if (products && Array.isArray(products) && products.length > 0) {
      // Single item with quantity 1: use product dimensions directly (bubble wrap)
      const totalItems = products.reduce((sum: number, p: ProductDimension) => sum + p.quantity, 0);
      if (totalItems === 1 && products[0].width && products[0].height && products[0].length) {
        weight = products[0].weight || parseFloat(process.env.MIPAQUETE_DEFAULT_WEIGHT || '1');
        width = products[0].width;
        height = products[0].height;
        length = products[0].length;
      } else {
      const { data: boxes } = await supabaseAdmin
        .from('shipping_boxes')
        .select('*')
        .eq('is_active', true);

      if (boxes && boxes.length > 0) {
        const result = findBestBox(products as ProductDimension[], boxes);
        if (result) {
          weight = result.totalWeight;
          width = result.box.width;
          height = result.box.height;
          length = result.box.length;
        } else {
          weight = parseFloat(process.env.MIPAQUETE_DEFAULT_WEIGHT || '1');
          width = parseFloat(process.env.MIPAQUETE_DEFAULT_WIDTH || '20');
          height = parseFloat(process.env.MIPAQUETE_DEFAULT_HEIGHT || '15');
          length = parseFloat(process.env.MIPAQUETE_DEFAULT_LENGTH || '30');
        }
      } else {
        // No boxes configured, use defaults
        weight = parseFloat(process.env.MIPAQUETE_DEFAULT_WEIGHT || '1');
        width = parseFloat(process.env.MIPAQUETE_DEFAULT_WIDTH || '20');
        height = parseFloat(process.env.MIPAQUETE_DEFAULT_HEIGHT || '15');
        length = parseFloat(process.env.MIPAQUETE_DEFAULT_LENGTH || '30');
      }
      } // close single-item else
    } else {
      weight = body.weight || parseFloat(process.env.MIPAQUETE_DEFAULT_WEIGHT || '1');
      width = body.width || parseFloat(process.env.MIPAQUETE_DEFAULT_WIDTH || '20');
      height = body.height || parseFloat(process.env.MIPAQUETE_DEFAULT_HEIGHT || '15');
      length = body.length || parseFloat(process.env.MIPAQUETE_DEFAULT_LENGTH || '30');
    }

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
