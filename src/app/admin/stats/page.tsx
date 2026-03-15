'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, BarChart3, TrendingUp, DollarSign, ShoppingCart, Package } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface MonthlyData {
  month: string;
  ventas: number;
  ingresos: number;
  pedidos: number;
}

interface TopProductData {
  name: string;
  quantity: number;
  revenue: number;
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function AdminStatsPage() {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // Summary stats
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [avgOrderValue, setAvgOrderValue] = useState(0);
  const [totalProductsSold, setTotalProductsSold] = useState(0);

  useEffect(() => {
    fetchStats();
  }, [selectedYear]);

  async function fetchStats() {
    setLoading(true);
    try {
      // Fetch all paid orders
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('payment_status', 'paid');

      if (!orders) {
        setLoading(false);
        return;
      }

      // Determine available years
      const yearsSet = new Set(orders.map(o => new Date(o.created_at).getFullYear()));
      const years = Array.from(yearsSet).sort((a, b) => b - a);
      if (years.length === 0) years.push(new Date().getFullYear());
      setAvailableYears(years);

      // Filter by selected year
      const yearOrders = orders.filter(o => new Date(o.created_at).getFullYear() === selectedYear);

      // Monthly aggregation
      const monthly: MonthlyData[] = MONTHS.map((month, idx) => {
        const monthOrders = yearOrders.filter(o => new Date(o.created_at).getMonth() === idx);
        return {
          month,
          ventas: monthOrders.length,
          ingresos: monthOrders.reduce((sum, o) => sum + (o.total || 0), 0),
          pedidos: monthOrders.length,
        };
      });
      setMonthlyData(monthly);

      // Summary
      const rev = yearOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      setTotalRevenue(rev);
      setTotalOrders(yearOrders.length);
      setAvgOrderValue(yearOrders.length > 0 ? rev / yearOrders.length : 0);

      // Top products
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_name, product_price, quantity, order_id');

      if (orderItems) {
        const yearOrderIds = new Set(yearOrders.map(o => o.id));
        const yearItems = orderItems.filter(item => yearOrderIds.has(item.order_id));

        const productMap: Record<string, { quantity: number; revenue: number }> = {};
        let totalSold = 0;

        yearItems.forEach(item => {
          if (!productMap[item.product_name]) {
            productMap[item.product_name] = { quantity: 0, revenue: 0 };
          }
          productMap[item.product_name].quantity += item.quantity;
          productMap[item.product_name].revenue += item.product_price * item.quantity;
          totalSold += item.quantity;
        });

        setTotalProductsSold(totalSold);

        const sorted = Object.entries(productMap)
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 10);

        setTopProducts(sorted);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (value: number) => `$${value.toLocaleString('es-CO')}`;

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/admin/dashboard" className="text-neutral-600 hover:text-neutral-900">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <BarChart3 className="w-6 h-6 text-blue-500" />
              <h1 className="text-xl font-bold">Estadísticas</h1>
            </div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-20 text-neutral-500">Cargando estadísticas...</div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-neutral-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <h3 className="text-2xl font-bold text-neutral-900">{formatCurrency(totalRevenue)}</h3>
                <p className="text-sm text-neutral-600 mt-1">Ingresos Totales</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-neutral-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <ShoppingCart className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-neutral-900">{totalOrders}</h3>
                <p className="text-sm text-neutral-600 mt-1">Pedidos Totales</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-neutral-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-neutral-900">{formatCurrency(avgOrderValue)}</h3>
                <p className="text-sm text-neutral-600 mt-1">Ticket Promedio</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-neutral-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <Package className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-neutral-900">{totalProductsSold}</h3>
                <p className="text-sm text-neutral-600 mt-1">Productos Vendidos</p>
              </div>
            </div>

            {/* Revenue Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 mb-8">
              <h2 className="text-lg font-semibold mb-4">Ingresos Mensuales ({selectedYear})</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), 'Ingresos']}
                      labelStyle={{ fontWeight: 'bold' }}
                    />
                    <Bar dataKey="ingresos" fill="#6366f1" radius={[4, 4, 0, 0]} name="Ingresos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Orders Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 mb-8">
              <h2 className="text-lg font-semibold mb-4">Pedidos Mensuales ({selectedYear})</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number) => [value, 'Pedidos']}
                      labelStyle={{ fontWeight: 'bold' }}
                    />
                    <Bar dataKey="pedidos" fill="#10b981" radius={[4, 4, 0, 0]} name="Pedidos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Top 10 Productos ({selectedYear})</h2>
              {topProducts.length > 0 ? (
                <>
                  <div className="h-80 mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topProducts} layout="vertical" margin={{ left: 100 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" tick={{ fontSize: 12 }} />
                        <YAxis
                          dataKey="name"
                          type="category"
                          tick={{ fontSize: 11 }}
                          width={90}
                        />
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            name === 'quantity' ? value : formatCurrency(value),
                            name === 'quantity' ? 'Unidades' : 'Ingresos'
                          ]}
                        />
                        <Legend />
                        <Bar dataKey="quantity" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Unidades" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-neutral-50">
                        <tr>
                          <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-600">#</th>
                          <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-600">Producto</th>
                          <th className="text-right px-4 py-3 text-sm font-semibold text-neutral-600">Unidades</th>
                          <th className="text-right px-4 py-3 text-sm font-semibold text-neutral-600">Ingresos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {topProducts.map((p, i) => (
                          <tr key={p.name} className="hover:bg-neutral-50">
                            <td className="px-4 py-3 text-sm font-medium text-neutral-400">{i + 1}</td>
                            <td className="px-4 py-3 font-medium">{p.name}</td>
                            <td className="px-4 py-3 text-right">{p.quantity}</td>
                            <td className="px-4 py-3 text-right font-semibold">{formatCurrency(p.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="text-neutral-500 text-center py-8">No hay datos de ventas para este año.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
