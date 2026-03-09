import { NextRequest, NextResponse } from 'next/server';
import { chatWithGemini } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const { name, currentDescription, category, price } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    const businessName = process.env.NEXT_PUBLIC_BUSINESS_NAME || 'Tu Tienda';

    let prompt = '';
    if (currentDescription) {
      prompt = `Mejora y reescribe esta descripción de producto para una tienda online colombiana llamada "${businessName}".

Producto: ${name}
${category ? `Categoría: ${category}` : ''}
${price ? `Precio: $${price} COP` : ''}
Descripción actual: ${currentDescription}

Reescribe la descripción haciéndola más atractiva, profesional y orientada a la venta. Mantén la información clave pero mejora el estilo.`;
    } else {
      prompt = `Genera una descripción de producto atractiva para una tienda online colombiana llamada "${businessName}".

Producto: ${name}
${category ? `Categoría: ${category}` : ''}
${price ? `Precio: $${price} COP` : ''}

Genera una descripción corta (2-3 oraciones), atractiva y profesional orientada a vender el producto.`;
    }

    const systemPrompt = `Eres un copywriter experto en e-commerce colombiano.
Genera descripciones de producto concisas, atractivas y en español colombiano natural.
NO uses markdown, asteriscos, ni formato especial. Solo texto plano.
NO incluyas el nombre del producto ni el precio en la descripción (ya están en otros campos).
Máximo 200 caracteres.`;

    const description = await chatWithGemini(systemPrompt, [], prompt);

    return NextResponse.json({ description: description.trim() });
  } catch (error) {
    console.error('Generate description error:', error);
    return NextResponse.json({ error: 'Error generating description' }, { status: 500 });
  }
}
