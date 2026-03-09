'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Package, ShoppingCart, TrendingUp, AlertCircle,
  CheckCircle, LogOut, Settings, Tag, Grid, Receipt
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Order, Product } from '@/types';

interface Stats {
  paidOrders: number;
  totalOrders: number;
  pendingOrders: number;
  lowStockProducts: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    paidOrders: 0,
    totalOrders: 0,
    pendingOrders: 0,
    lowStockProducts: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      // Fetch orders
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (orders) {
        const paidOrders = orders.filter(o => o.payment_status === 'paid').length;
        const pendingOrders = orders.filter(o => o.status === 'pending').length;

        setStats(prev => ({
          ...prev,
          paidOrders,
          totalOrders: orders.length,
          pendingOrders,
        }));

        setRecentOrders(orders.slice(0, 5));
      }

      // Fetch low stock products
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .lte('stock', 5)
        .gt('stock', 0);

      if (products) {
        setStats(prev => ({
          ...prev,
          lowStockProducts: products.length,
        }));
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  }

  function handleLogout() {
    document.cookie = 'admin_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.push('/admin');
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Settings className="w-8 h-8 text-primary-500" />
              <h1 className="font-display text-2xl font-bold text-gradient">
                Admin Panel
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <Link
                href="/"
                target="_blank"
                className="text-neutral-600 hover:text-primary-500 transition-colors"
              >
                Ver Tienda
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-neutral-600 hover:text-red-500 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-neutral-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold text-neutral-900">
              {stats.paidOrders}
            </h3>
            <p className="text-sm text-neutral-600 mt-1">Pedidos Pagados</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-neutral-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-neutral-900">
              {stats.totalOrders}
            </h3>
            <p className="text-sm text-neutral-600 mt-1">Total de Pedidos</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-neutral-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Package className="w-6 h-6 text-orange-600" />
              </div>
              {stats.pendingOrders > 0 && (
                <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                  {stats.pendingOrders}
                </span>
              )}
            </div>
            <h3 className="text-2xl font-bold text-neutral-900">
              {stats.pendingOrders}
            </h3>
            <p className="text-sm text-neutral-600 mt-1">Pedidos Pendientes</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-neutral-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              {stats.lowStockProducts > 0 && (
                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                  {stats.lowStockProducts}
                </span>
              )}
            </div>
            <h3 className="text-2xl font-bold text-neutral-900">
              {stats.lowStockProducts}
            </h3>
            <p className="text-sm text-neutral-600 mt-1">Stock Bajo</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Link
            href="/admin/sales"
            className="bg-gradient-to-br from-primary-50 to-primary-100 hover:from-primary-100 hover:to-primary-200 rounded-xl p-6 shadow-sm border border-primary-200 transition-all hover:scale-105 group"
          >
            <Receipt className="w-8 h-8 text-primary-600 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-lg text-primary-900">Venta en Persona</h3>
            <p className="text-sm text-primary-700 mt-1">Registrar venta directa</p>
          </Link>

          <Link
            href="/admin/products"
            className="bg-white hover:bg-neutral-50 rounded-xl p-6 shadow-sm border border-neutral-200 transition-all hover:scale-105 group"
          >
            <Package className="w-8 h-8 text-primary-500 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-lg">Productos</h3>
            <p className="text-sm text-neutral-600 mt-1">Gestionar inventario</p>
          </Link>

          <Link
            href="/admin/orders"
            className="bg-white hover:bg-neutral-50 rounded-xl p-6 shadow-sm border border-neutral-200 transition-all hover:scale-105 group"
          >
            <ShoppingCart className="w-8 h-8 text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-lg">Pedidos</h3>
            <p className="text-sm text-neutral-600 mt-1">Ver y actualizar pedidos</p>
          </Link>

          <Link
            href="/admin/categories"
            className="bg-white hover:bg-neutral-50 rounded-xl p-6 shadow-sm border border-neutral-200 transition-all hover:scale-105 group"
          >
            <Grid className="w-8 h-8 text-purple-500 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-lg">Categorías</h3>
            <p className="text-sm text-neutral-600 mt-1">Organizar productos</p>
          </Link>

          <Link
            href="/admin/coupons"
            className="bg-white hover:bg-neutral-50 rounded-xl p-6 shadow-sm border border-neutral-200 transition-all hover:scale-105 group"
          >
            <Tag className="w-8 h-8 text-green-500 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-lg">Cupones</h3>
            <p className="text-sm text-neutral-600 mt-1">Gestionar descuentos</p>
          </Link>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200">
          <div className="p-6 border-b border-neutral-200">
            <h2 className="text-xl font-semibold">Pedidos Recientes</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-neutral-600">
                    Pedido
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-neutral-600">
                    Cliente
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-neutral-600">
                    Total
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-neutral-600">
                    Estado
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-neutral-600">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                      Cargando...
                    </td>
                  </tr>
                ) : recentOrders.length > 0 ? (
                  recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-medium text-primary-500 hover:text-primary-600"
                        >
                          {order.order_number}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600">
                        {order.customer_name}
                      </td>
                      <td className="px-6 py-4 font-semibold">
                        ${order.total.toLocaleString('es-CO')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          order.status === 'completed' ? 'bg-green-100 text-green-700' :
                          order.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                          'bg-neutral-100 text-neutral-700'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600">
                        {new Date(order.created_at).toLocaleDateString('es-CO')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                      No hay pedidos recientes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {recentOrders.length > 0 && (
            <div className="p-4 border-t border-neutral-200 text-center">
              <Link
                href="/admin/orders"
                className="text-primary-500 hover:text-primary-600 font-medium"
              >
                Ver todos los pedidos →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
