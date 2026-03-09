'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import { useUser } from '@clerk/nextjs';
import { Order } from '@/types';
import { Package, ShoppingBag, ChevronDown, ChevronUp, MapPin, CreditCard, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const statusLabels: Record<string, { label: string; bg: string, text: string, dot: string }> = {
  pending: { label: 'Pendiente', bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  confirmed: { label: 'Confirmado', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' },
  processing: { label: 'En preparación', bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-400' },
  shipped: { label: 'Enviado', bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-400' },
  delivered: { label: 'Entregado', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  cancelled: { label: 'Cancelado', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-400' },
};

const paymentStatusLabels: Record<string, { label: string; text: string; icon: JSX.Element }> = {
  pending: { label: 'Pago pendiente', text: 'text-yellow-600', icon: <CreditCard className="w-3 h-3" /> },
  approved: { label: 'Pago aprobado', text: 'text-emerald-600', icon: <CreditCard className="w-3 h-3" /> },
  rejected: { label: 'Pago rechazado', text: 'text-red-600', icon: <CreditCard className="w-3 h-3" /> },
};

export default function MisPedidosPage() {
  const { user, isLoaded } = useUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded) {
      if (user) {
        fetchOrders();
      } else {
        setLoading(false);
      }
    }
  }, [isLoaded, user]);

  async function fetchOrders() {
    try {
      const res = await fetch('/api/user/orders');
      const data = await res.json();
      if (data.orders) setOrders(data.orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50">
        <Header />
        <main className="flex-grow flex items-center justify-center pt-24 pb-12">
          <div className="space-y-6 w-full max-w-3xl px-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-card rounded-2xl h-32 animate-pulse" />
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isLoaded && !user) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50 selection:bg-primary-200 selection:text-primary-900">
        <Header />
        <main className="flex-grow pt-24 pb-12 flex items-center justify-center">
          <div className="max-w-md w-full mx-4">
            <div className="glass-card rounded-[2.5rem] p-10 text-center shadow-xl shadow-primary-500/10 border border-white/50 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-400 via-accent-400 to-primary-400"></div>
              <div className="bg-primary-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Package className="w-10 h-10 text-primary-500" />
              </div>
              <h2 className="text-3xl font-display font-black text-neutral-900 mb-3 tracking-tight">Acceso Requerido</h2>
              <p className="text-neutral-500 mb-8 text-lg">
                Inicia sesión para ver tu historial de pedidos y hacer seguimiento a tus compras.
              </p>
              <div className="space-y-4">
                <Link
                  href="/sign-in?redirect_url=/mis-pedidos"
                  className="flex justify-center items-center py-4 bg-gradient-to-r from-neutral-900 to-neutral-800 text-white rounded-xl font-bold hover:from-primary-600 hover:to-accent-600 transition-all duration-300 shadow-md hover:shadow-primary-500/25"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  href="/"
                  className="flex justify-center items-center py-4 bg-white text-neutral-700 rounded-xl font-bold border border-neutral-200 hover:border-primary-200 hover:bg-primary-50 transition-all duration-300"
                >
                  Volver al Inicio
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 selection:bg-primary-200 selection:text-primary-900">
      <Header />

      <main className="flex-grow pt-24 pb-12">
        {/* Page Header with Mesh Gradient */}
        <section className="relative px-4 sm:px-6 lg:px-8 py-12 lg:py-20 rounded-[3rem] mx-4 lg:mx-8 mb-12 overflow-hidden shadow-xl shadow-primary-500/5">
          <div className="absolute inset-0 mesh-bg opacity-100 z-0 object-cover mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-primary-900/40 to-accent-900/60 backdrop-blur-sm z-[1]"></div>

          <div className="relative z-10 max-w-4xl mx-auto text-center animate-slide-up">
            <h1 className="font-display text-4xl md:text-5xl font-black mb-4 tracking-tight text-white drop-shadow-md">
              Mis Pedidos
            </h1>
            <p className="text-lg md:text-xl text-primary-50 max-w-2xl mx-auto font-medium">
              Hola, {user?.firstName || user?.emailAddresses[0]?.emailAddress}. Aquí está tu historial de compras.
            </p>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {orders.length === 0 ? (
            <div className="text-center py-20 glass-card rounded-[2.5rem] shadow-xl animate-scale-in">
              <div className="bg-neutral-100 rounded-3xl w-24 h-24 flex items-center justify-center mx-auto mb-8">
                <ShoppingBag className="w-12 h-12 text-neutral-400" />
              </div>
              <h3 className="text-3xl font-display font-black text-neutral-900 mb-4 tracking-tight">
                Aún no tienes pedidos
              </h3>
              <p className="text-neutral-500 mb-10 text-lg">
                ¡Cuando realices tu primera compra aparecerá aquí!
              </p>
              <Link
                href="/products"
                className="inline-flex justify-center items-center gap-2 bg-neutral-900 text-white px-8 py-4 rounded-xl font-semibold hover:bg-primary-600 transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/30 hover:-translate-y-1"
              >
                Ver catálogo
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center gap-4 mb-8">
                <div className="h-px flex-1 bg-neutral-200"></div>
                <span className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">
                  {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'} en total
                </span>
                <div className="h-px flex-1 bg-neutral-200"></div>
              </div>

              {orders.map((order) => {
                const status = statusLabels[order.status] || { label: order.status, bg: 'bg-neutral-100', text: 'text-neutral-700', dot: 'bg-neutral-400' };
                const paymentStatus = paymentStatusLabels[order.payment_status] || { label: order.payment_status, text: 'text-neutral-600', icon: <CreditCard className="w-3 h-3" /> };
                const isExpanded = expandedOrder === order.id;

                return (
                  <div
                    key={order.id}
                    className={`glass-card rounded-[2rem] border transition-all duration-300 overflow-hidden ${isExpanded ? 'border-primary-200 shadow-lg shadow-primary-500/5' : 'border-neutral-200/50 shadow-sm hover:shadow-md hover:border-primary-100'
                      }`}
                  >
                    {/* Order Header */}
                    <button
                      onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                      className="w-full p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:bg-white/40 transition-colors text-left group"
                    >
                      <div className="flex items-start sm:items-center gap-5">
                        <div className={`p-4 rounded-2xl transition-colors ${isExpanded ? 'bg-primary-100' : 'bg-neutral-100 group-hover:bg-primary-50'}`}>
                          <Package className={`w-6 h-6 ${isExpanded ? 'text-primary-600' : 'text-neutral-500 group-hover:text-primary-500'}`} />
                        </div>
                        <div>
                          <p className="font-bold text-neutral-900 text-lg sm:text-xl mb-1 flex items-center gap-2">
                            Pedido #{order.order_number.slice(-6).toUpperCase()}
                          </p>
                          <p className="text-sm text-neutral-500 font-medium">
                            {new Date(order.created_at).toLocaleDateString('es-CO', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:items-end gap-3 sm:gap-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${status.bg} ${status.text} border border-current shadow-sm`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                            {status.label}
                          </span>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-6 w-full mt-2 sm:mt-0">
                          <div className="text-left sm:text-right">
                            <span className={`text-xs font-bold flex items-center gap-1 mt-1 ${paymentStatus.text}`}>
                              {paymentStatus.icon}
                              {paymentStatus.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-black text-xl text-neutral-900 tracking-tight">
                                ${order.total.toLocaleString('es-CO')}
                              </p>
                            </div>
                            <div className={`p-2 rounded-full transition-colors ${isExpanded ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-400 group-hover:bg-neutral-200'}`}>
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5" />
                              ) : (
                                <ChevronDown className="w-5 h-5" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Order Details Sliding Content */}
                    <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                      <div className="overflow-hidden">
                        <div className="border-t border-neutral-100 bg-white/40 p-6 sm:p-8 space-y-8">
                          {/* Items Grid */}
                          <div>
                            <h4 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
                              <ShoppingBag className="w-4 h-4 text-primary-500" />
                              Productos del Pedido
                            </h4>
                            <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
                              {order.items?.map((item, index) => (
                                <div
                                  key={item.id}
                                  className={`flex justify-between items-center p-4 sm:p-5 hover:bg-neutral-50 transition-colors ${order.items && index !== order.items.length - 1 ? 'border-b border-neutral-100' : ''}`}
                                >
                                  <div>
                                    <p className="font-bold text-neutral-900 mb-1">{item.product_name}</p>
                                    <p className="text-sm font-medium text-neutral-500">
                                      {item.quantity} x ${item.product_price.toLocaleString('es-CO')}
                                    </p>
                                  </div>
                                  <p className="font-black text-neutral-900">
                                    ${item.total.toLocaleString('es-CO')}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Delivery info */}
                            <div>
                              <h4 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-primary-500" />
                                Información de Entrega
                              </h4>
                              <div className="bg-white rounded-2xl p-5 border border-neutral-100">
                                <div className="text-sm text-neutral-600 space-y-3">
                                  {order.delivery_type === 'pickup' ? (
                                    <div className="flex items-center gap-3">
                                      <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                                        <Package className="w-5 h-5" />
                                      </div>
                                      <div>
                                        <p className="font-bold text-neutral-900">Retiro en tienda</p>
                                        <p className="text-neutral-500">Punto de venta principal</p>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      <p className="flex flex-col">
                                        <span className="font-bold text-neutral-900 mb-1">Dirección de envío:</span>
                                        <span className="text-neutral-600 leading-relaxed">{order.address}</span>
                                      </p>
                                      {order.city && (
                                        <p className="pt-2 border-t border-neutral-100">
                                          <span className="font-medium text-neutral-900">{order.city}</span>, {order.department}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Totals Box */}
                            <div>
                              <h4 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-primary-500" />
                                Resumen de Pago
                              </h4>
                              <div className="bg-white text-neutral-900 rounded-2xl p-6 border border-neutral-100 shadow-sm">
                                <div className="space-y-3 mb-4">
                                  <div className="flex justify-between text-sm text-neutral-600 font-medium">
                                    <span>Subtotal</span>
                                    <span className="text-neutral-900">${order.subtotal.toLocaleString('es-CO')}</span>
                                  </div>
                                  {order.delivery_cost > 0 && (
                                    <div className="flex justify-between text-sm text-neutral-600 font-medium">
                                      <span>Envío a domicilio</span>
                                      <span className="text-neutral-900">${order.delivery_cost.toLocaleString('es-CO')}</span>
                                    </div>
                                  )}
                                  {order.discount > 0 && (
                                    <div className="flex justify-between text-sm text-emerald-600 font-medium">
                                      <span>Descuento {order.coupon_code && `(${order.coupon_code})`}</span>
                                      <span>-${order.discount.toLocaleString('es-CO')}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex justify-between items-end pt-4 border-t border-neutral-200">
                                  <span className="font-bold text-neutral-900">Total</span>
                                  <div className="text-right">
                                    <span className="block text-2xl font-black tracking-tight text-primary-600">
                                      ${order.total.toLocaleString('es-CO')}
                                    </span>
                                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">COP</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
