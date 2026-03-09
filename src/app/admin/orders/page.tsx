'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Order } from '@/types';
import { ShoppingCart, ArrowLeft, Search, Package, Truck, CheckCircle, XCircle, Clock, CreditCard, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('paid');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    setLoading(true);

    try {
      const response = await fetch('/api/orders');
      const { orders: ordersData } = await response.json();
      if (ordersData) setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Error al cargar las órdenes');
    }

    setLoading(false);
  }

  async function updateOrderStatus(orderId: string, status: string) {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        toast.success('Estado actualizado');
        fetchOrders();
        if (selectedOrder?.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status });
        }
      }
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Error al actualizar el estado');
    }
  }

  async function viewOrderDetails(orderId: string) {
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      const { order } = await response.json();
      setSelectedOrder(order);
      setShowModal(true);
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast.error('Error al cargar los detalles');
    }
  }

  // Primary filter: payment status
  const ordersByPayment = orders.filter(order => {
    if (paymentFilter === 'all') return true;
    return order.payment_status === paymentFilter;
  });

  // Secondary filter: order status + search
  const filteredOrders = ordersByPayment.filter(order => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Count orders per payment status for tab badges
  const paidCount = orders.filter(o => o.payment_status === 'paid').length;
  const pendingPaymentCount = orders.filter(o => o.payment_status === 'pending').length;

  // Determine which status filters to show based on payment filter
  function getAvailableStatuses() {
    if (paymentFilter === 'paid') {
      return ['all', 'confirmed', 'processing', 'shipped', 'completed'];
    }
    if (paymentFilter === 'pending') {
      return ['all', 'pending'];
    }
    return ['all', 'pending', 'confirmed', 'processing', 'shipped', 'completed', 'cancelled'];
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'processing': return <Package className="w-4 h-4" />;
      case 'shipped': return <Truck className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'pending': return 'bg-orange-100 text-orange-700';
      case 'confirmed': return 'bg-blue-100 text-blue-700';
      case 'processing': return 'bg-indigo-100 text-indigo-700';
      case 'shipped': return 'bg-purple-100 text-purple-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-neutral-100 text-neutral-700';
    }
  }

  function getStatusLabel(status: string) {
    const labels: Record<string, string> = {
      'all': 'Todos',
      'pending': 'Pendiente',
      'confirmed': 'Confirmado',
      'processing': 'Procesando',
      'shipped': 'Enviado',
      'completed': 'Completado',
      'cancelled': 'Cancelado',
    };
    return labels[status] || status;
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/admin/dashboard" className="text-neutral-600 hover:text-primary-500">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <h1 className="font-display text-2xl font-bold">Pedidos</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Primary Filter: Payment Status Tabs */}
        <div className="mb-6">
          <div className="border-b border-neutral-200">
            <nav className="flex gap-1 -mb-px">
              <button
                onClick={() => { setPaymentFilter('paid'); setStatusFilter('all'); }}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  paymentFilter === 'paid'
                    ? 'border-green-500 text-green-700 bg-green-50/50'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                Pagados
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                  paymentFilter === 'paid' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-600'
                }`}>
                  {paidCount}
                </span>
              </button>
              <button
                onClick={() => { setPaymentFilter('pending'); setStatusFilter('all'); }}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  paymentFilter === 'pending'
                    ? 'border-yellow-500 text-yellow-700 bg-yellow-50/50'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }`}
              >
                <Clock className="w-4 h-4" />
                Pago pendiente
                {pendingPaymentCount > 0 && (
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                    paymentFilter === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-yellow-100 text-yellow-600'
                  }`}>
                    {pendingPaymentCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => { setPaymentFilter('all'); setStatusFilter('all'); }}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  paymentFilter === 'all'
                    ? 'border-primary-500 text-primary-700 bg-primary-50/50'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Todos
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                  paymentFilter === 'all' ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-600'
                }`}>
                  {orders.length}
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* Secondary Filters: Search + Order Status */}
        <div className="mb-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por número de pedido, nombre o email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Order Status Filter */}
          <div className="flex flex-wrap gap-2">
            {getAvailableStatuses().map((status) => {
              const count = ordersByPayment.filter(o => status === 'all' ? true : o.status === status).length;
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? status === 'all'
                        ? 'bg-neutral-900 text-white'
                        : `${getStatusColor(status)} ring-2 ring-offset-1 ring-current`
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {getStatusLabel(status)}
                  <span className="ml-1.5 text-xs opacity-75">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Info banner for pending payments */}
        {paymentFilter === 'pending' && pendingPaymentCount > 0 && (
          <div className="mb-6 flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold">Pagos pendientes</p>
              <p>Estos pedidos aún no han sido pagados. Los pedidos pendientes de más de 24 horas se eliminan automáticamente.</p>
            </div>
          </div>
        )}

        {/* Orders Table */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Pedido</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Cliente</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Entrega</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Total</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Estado</th>
                  {paymentFilter === 'all' && (
                    <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Pago</th>
                  )}
                  <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Fecha</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-neutral-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-neutral-500">
                      Cargando...
                    </td>
                  </tr>
                ) : filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4">
                        <button
                          onClick={() => viewOrderDetails(order.id)}
                          className="font-mono font-semibold text-primary-500 hover:text-primary-600"
                        >
                          {order.order_number}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-neutral-900">{order.customer_name}</p>
                          <p className="text-xs text-neutral-500">{order.customer_email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {order.delivery_type === 'delivery' ? (
                          <div className="flex items-center space-x-1 text-neutral-600">
                            <Truck className="w-4 h-4" />
                            <span>Envío</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1 text-neutral-600">
                            <Package className="w-4 h-4" />
                            <span>Recoger</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold">
                        ${order.total.toLocaleString('es-CO')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold w-fit ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          <span>{getStatusLabel(order.status)}</span>
                        </span>
                      </td>
                      {paymentFilter === 'all' && (
                        <td className="px-6 py-4">
                          {order.payment_status === 'paid' ? (
                            <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 w-fit">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Pagado
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 w-fit">
                              <Clock className="w-3.5 h-3.5" />
                              Pendiente
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 text-sm text-neutral-600">
                        {new Date(order.created_at).toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => viewOrderDetails(order.id)}
                          className="text-primary-500 hover:text-primary-600 font-medium text-sm"
                        >
                          Ver detalles
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <ShoppingCart className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-neutral-700 mb-2">
                        No se encontraron pedidos
                      </h3>
                      <p className="text-neutral-500">
                        {searchQuery || statusFilter !== 'all'
                          ? 'Intenta con otros filtros'
                          : paymentFilter === 'pending'
                          ? 'No hay pedidos con pago pendiente'
                          : 'Los pedidos aparecerán aquí cuando los clientes compren'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-3xl w-full my-8">
            <div className="p-6 border-b border-neutral-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Pedido {selectedOrder.order_number}</h2>
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-neutral-600">
                      {new Date(selectedOrder.created_at).toLocaleString('es-CO')}
                    </p>
                    {selectedOrder.payment_status === 'paid' ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3" />
                        Pagado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                        <Clock className="w-3 h-3" />
                        Pago pendiente
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer Info */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Información del Cliente</h3>
                <div className="bg-neutral-50 rounded-lg p-4 space-y-2">
                  <p><span className="font-medium">Nombre:</span> {selectedOrder.customer_name}</p>
                  <p><span className="font-medium">Email:</span> {selectedOrder.customer_email}</p>
                  <p><span className="font-medium">Teléfono:</span> {selectedOrder.customer_phone || 'No proporcionado'}</p>
                </div>
              </div>

              {/* Delivery Info */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Información de Entrega</h3>
                <div className="bg-neutral-50 rounded-lg p-4 space-y-2">
                  <p>
                    <span className="font-medium">Tipo:</span>{' '}
                    {selectedOrder.delivery_type === 'delivery' ? 'Envío a domicilio' : 'Recoger en tienda'}
                  </p>
                  {selectedOrder.delivery_type === 'delivery' && (
                    <>
                      <p><span className="font-medium">Dirección:</span> {selectedOrder.address}</p>
                      <p><span className="font-medium">Ciudad:</span> {selectedOrder.city}</p>
                      <p><span className="font-medium">Departamento:</span> {selectedOrder.department}</p>
                    </>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Productos</h3>
                <div className="border border-neutral-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th className="text-left px-4 py-3 text-sm font-semibold">Producto</th>
                        <th className="text-center px-4 py-3 text-sm font-semibold">Cantidad</th>
                        <th className="text-right px-4 py-3 text-sm font-semibold">Precio</th>
                        <th className="text-right px-4 py-3 text-sm font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {selectedOrder.items?.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3">{item.product_name}</td>
                          <td className="px-4 py-3 text-center">{item.quantity}</td>
                          <td className="px-4 py-3 text-right">${item.product_price.toLocaleString('es-CO')}</td>
                          <td className="px-4 py-3 text-right font-semibold">${item.total.toLocaleString('es-CO')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Order Summary */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Resumen del Pedido</h3>
                <div className="bg-neutral-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${selectedOrder.subtotal.toLocaleString('es-CO')}</span>
                  </div>
                  {selectedOrder.delivery_cost > 0 && (
                    <div className="flex justify-between">
                      <span>Envío:</span>
                      <span>${selectedOrder.delivery_cost.toLocaleString('es-CO')}</span>
                    </div>
                  )}
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Descuento:</span>
                      <span>-${selectedOrder.discount.toLocaleString('es-CO')}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-neutral-200 text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-primary-500">${selectedOrder.total.toLocaleString('es-CO')} COP</span>
                  </div>
                </div>
              </div>

              {/* Update Status - only for paid orders */}
              {selectedOrder.payment_status === 'paid' && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Actualizar Estado</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {['confirmed', 'processing', 'shipped', 'completed'].map((status) => (
                      <button
                        key={status}
                        onClick={() => updateOrderStatus(selectedOrder.id, status)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          selectedOrder.status === status
                            ? getStatusColor(status)
                            : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                        }`}
                      >
                        {getStatusLabel(status)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-neutral-200 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
