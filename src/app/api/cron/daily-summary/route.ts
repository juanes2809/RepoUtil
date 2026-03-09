import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendAdminNotification } from '@/lib/whatsapp';

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get today's date range in Colombia time (UTC-5)
    const now = new Date();
    const colombiaOffset = -5 * 60;
    const colombiaTime = new Date(now.getTime() + (colombiaOffset - now.getTimezoneOffset()) * 60000);
    const todayStart = new Date(colombiaTime);
    todayStart.setHours(0, 0, 0, 0);
    // Convert back to UTC for DB query
    const todayStartUTC = new Date(todayStart.getTime() - colombiaOffset * 60000);
    const todayEndUTC = new Date(todayStartUTC.getTime() + 24 * 60 * 60 * 1000);

    // Fetch today's paid orders with items
    const { data: orders } = await supabaseAdmin!
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('payment_status', 'paid')
      .gte('created_at', todayStartUTC.toISOString())
      .lt('created_at', todayEndUTC.toISOString());

    const orderCount = orders?.length || 0;
    const totalSales = orders?.reduce((sum, order) => sum + order.total, 0) || 0;

    // Find top product
    const productCounts: Record<string, { name: string; quantity: number }> = {};
    orders?.forEach(order => {
      order.items?.forEach((item: any) => {
        if (!productCounts[item.product_id]) {
          productCounts[item.product_id] = { name: item.product_name, quantity: 0 };
        }
        productCounts[item.product_id].quantity += item.quantity;
      });
    });

    const topProduct = Object.values(productCounts).sort((a, b) => b.quantity - a.quantity)[0];

    // Fetch low stock products
    const { data: lowStockProducts } = await supabaseAdmin!
      .from('products')
      .select('name, stock')
      .lte('stock', 5)
      .gt('stock', 0)
      .eq('is_active', true);

    // Fetch out of stock products
    const { data: outOfStockProducts } = await supabaseAdmin!
      .from('products')
      .select('name')
      .lte('stock', 0)
      .eq('is_active', true);

    // Format date
    const dateStr = colombiaTime.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    let message = `📊 Resumen del día - ${dateStr}\n`;
    message += `💰 Ventas: $${totalSales.toLocaleString('es-CO')} COP (${orderCount} pedido${orderCount !== 1 ? 's' : ''})\n`;

    if (topProduct) {
      message += `🏆 Más vendido: ${topProduct.name} (${topProduct.quantity} unid${topProduct.quantity !== 1 ? 's' : ''})\n`;
    }

    if (orderCount === 0) {
      message += `\n📭 No hubo ventas hoy.`;
    }

    if (lowStockProducts && lowStockProducts.length > 0) {
      message += `\n\n⚠️ Stock bajo:\n`;
      message += lowStockProducts.map(p => `  - ${p.name}: ${p.stock} unid${p.stock !== 1 ? 's' : ''}`).join('\n');
    }

    if (outOfStockProducts && outOfStockProducts.length > 0) {
      message += `\n\n🚫 Agotados:\n`;
      message += outOfStockProducts.map(p => `  - ${p.name}`).join('\n');
    }

    await sendAdminNotification(message);

    return NextResponse.json({ success: true, orderCount, totalSales });
  } catch (error) {
    console.error('Daily summary error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
