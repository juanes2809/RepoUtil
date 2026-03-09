'use client';

import { useState, useEffect, useTransition } from 'react';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import { useCart } from '@/lib/cart-store';
import { Department, City, Coupon } from '@/types';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Trash2, Minus, Plus, Tag, ShoppingBag, CreditCard, ChevronRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useUser } from '@clerk/nextjs';

export default function CheckoutPage() {
  const { items, removeItem, updateQuantity, getTotal } = useCart();
  const [isPending, startTransition] = useTransition();
  const { user, isLoaded, isSignedIn } = useUser();

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('delivery');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [address, setAddress] = useState('');
  const [couponCode, setCouponCode] = useState('');

  // Data state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [filteredCities, setFilteredCities] = useState<City[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [deliveryCost, setDeliveryCost] = useState(0);

  const subtotal = getTotal();
  const discount = appliedCoupon
    ? appliedCoupon.discount_type === 'percentage'
      ? (subtotal * appliedCoupon.discount_value) / 100
      : appliedCoupon.discount_value
    : 0;
  const total = subtotal + deliveryCost - discount;

  // Pre-fill form with Clerk user data
  useEffect(() => {
    if (isLoaded && user) {
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
      if (fullName) setCustomerName(fullName);
      if (user.primaryEmailAddress?.emailAddress) {
        setCustomerEmail(user.primaryEmailAddress.emailAddress);
      }
      if (user.primaryPhoneNumber?.phoneNumber) {
        setCustomerPhone(user.primaryPhoneNumber.phoneNumber);
      }
    }
  }, [isLoaded, user]);

  useEffect(() => {
    fetchDepartments();
    fetchCities();
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      const filtered = cities.filter(city => city.department_id === selectedDepartment);
      setFilteredCities(filtered);
      setSelectedCity('');
      setDeliveryCost(0);
    }
  }, [selectedDepartment, cities]);

  useEffect(() => {
    if (selectedCity && deliveryType === 'delivery') {
      const city = cities.find(c => c.id === selectedCity);
      if (city) {
        setDeliveryCost(city.delivery_cost);
      }
    } else {
      setDeliveryCost(0);
    }
  }, [selectedCity, deliveryType, cities]);

  async function fetchDepartments() {
    const { data } = await supabase
      .from('departments')
      .select('*')
      .order('name');
    if (data) setDepartments(data);
  }

  async function fetchCities() {
    const { data } = await supabase
      .from('cities')
      .select('*, department:departments(*)');
    if (data) setCities(data);
  }

  async function applyCoupon() {
    if (!couponCode) return;

    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !data) {
      toast.error('Cupón inválido o expirado');
      return;
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      toast.error('Cupón expirado');
      return;
    }

    if (subtotal < data.min_purchase) {
      toast.error(`Compra mínima de $${data.min_purchase.toLocaleString('es-CO')} requerida`);
      return;
    }

    if (data.max_uses && data.current_uses >= data.max_uses) {
      toast.error('Cupón agotado');
      return;
    }

    setAppliedCoupon(data);
    toast.success('¡Cupón aplicado!');
  }

  async function handleCheckout() {
    // Validation
    if (!customerName || !customerEmail || !customerPhone) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    if (deliveryType === 'delivery' && (!selectedDepartment || !selectedCity || !address)) {
      toast.error('Por favor completa la información de entrega');
      return;
    }

    if (items.length === 0) {
      toast.error('Tu carrito está vacío');
      return;
    }

    startTransition(async () => {
      try {
        // Create order in database
        const department = departments.find(d => d.id === selectedDepartment)?.name;
        const city = cities.find(c => c.id === selectedCity)?.name;

        const orderData = {
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          delivery_type: deliveryType,
          department: department || null,
          city: city || null,
          address: deliveryType === 'delivery' ? address : null,
          subtotal,
          delivery_cost: deliveryCost,
          discount,
          coupon_code: appliedCoupon?.code || null,
          total,
          status: 'pending',
          payment_status: 'pending',
          clerk_user_id: user?.id || null,
        };

        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order: orderData,
            items: items.map(item => ({
              product_id: item.product.id,
              product_name: item.product.name,
              product_price: item.product.price,
              quantity: item.quantity,
              total: item.product.price * item.quantity,
            })),
          }),
        });

        const { order } = await response.json();

        const paymentItems = items.map(item => ({
          id: item.product.id,
          title: item.product.name,
          description: item.product.description || '',
          quantity: item.quantity,
          unit_price: item.product.price,
        }));

        // Add delivery cost as an item if applicable
        if (deliveryCost > 0) {
          paymentItems.push({
            id: 'delivery',
            title: 'Costo de envío',
            description: `Envío a ${city}, ${department}`,
            quantity: 1,
            unit_price: deliveryCost,
          });
        }

        // Apply discount as negative item
        if (discount > 0) {
          paymentItems.push({
            id: 'discount',
            title: 'Descuento',
            description: appliedCoupon ? `Cupón: ${appliedCoupon.code}` : '',
            quantity: 1,
            unit_price: -discount,
          });
        }

        const paymentRes = await fetch('/api/payment/mercadopago', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: paymentItems,
            successUrl: `${window.location.origin}/success`,
            pendingUrl: `${window.location.origin}/success`,
            failureUrl: `${window.location.origin}/failure`,
          }),
        });

        if (!paymentRes.ok) throw new Error('Error al crear el pago');

        const paymentData = await paymentRes.json();

        // Update order with payment ID
        await fetch(`/api/orders/${order.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payment_reference: paymentData.identifier,
          }),
        });

        // Guardar identifier como fallback (por si MP no redirige automáticamente)
        localStorage.setItem('mp_pending_identifier', paymentData.identifier);

        // Redirigir a MercadoPago sin limpiar el carrito.
        // El carrito se limpia en la página de éxito al confirmar el pago.
        // Si el pago falla, el carrito sigue intacto para que el usuario pueda reintentar.
        window.location.href = paymentData.payment_url;
      } catch (error) {
        console.error('Checkout error:', error);
        toast.error('Error al procesar el pago. Por favor intenta de nuevo.');
      }
    });
  }

  // Bloquear si no está autenticado
  if (isLoaded && !isSignedIn) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50 selection:bg-primary-200 selection:text-primary-900">
        <Header />
        <main className="flex-grow flex items-center justify-center pt-24 pb-12 px-4">
          <div className="text-center max-w-lg glass-card p-12 rounded-[2.5rem] shadow-xl animate-scale-in">
            <div className="bg-gradient-to-br from-primary-100 to-accent-100 rounded-3xl w-24 h-24 flex items-center justify-center mx-auto mb-8 shadow-inner">
              <ShoppingBag className="w-12 h-12 text-primary-600" />
            </div>
            <h2 className="text-3xl font-display font-black text-neutral-900 mb-4 tracking-tight">
              Inicia sesión para continuar
            </h2>
            <p className="text-neutral-500 mb-10 text-lg leading-relaxed">
              Necesitas una cuenta para completar tu compra. Así podrás hacer un seguimiento de tu envío y ver tu historial de pedidos.
            </p>
            <div className="flex flex-col gap-4">
              <Link
                href="/sign-in"
                className="inline-flex justify-center items-center bg-neutral-900 text-white px-8 py-4 rounded-xl font-semibold hover:bg-primary-600 transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/30 hover:-translate-y-1 w-full"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex justify-center items-center bg-white text-neutral-900 border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 px-8 py-4 rounded-xl font-semibold transition-all duration-300 w-full"
              >
                Regístrate gratis
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50">
        <Header />
        <main className="flex-grow flex items-center justify-center pt-24 pb-12 px-4">
          <div className="text-center max-w-lg glass-card p-12 rounded-[2.5rem] shadow-xl animate-scale-in">
            <div className="bg-neutral-100 rounded-3xl w-24 h-24 flex items-center justify-center mx-auto mb-8">
              <ShoppingBag className="w-12 h-12 text-neutral-400" />
            </div>
            <h2 className="text-3xl font-display font-black text-neutral-900 mb-4 tracking-tight">
              Tu carrito está vacío
            </h2>
            <p className="text-neutral-500 mb-10 text-lg">
              Añade productos de nuestro catálogo para continuar con tu compra
            </p>
            <Link
              href="/products"
              className="inline-flex justify-center items-center gap-2 bg-neutral-900 text-white px-8 py-4 rounded-xl font-semibold hover:bg-primary-600 transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/30 hover:-translate-y-1"
            >
              Explorar productos
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 selection:bg-primary-200 selection:text-primary-900">
      <Header />

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 w-full animate-fade-in">
        <h1 className="font-display text-4xl md:text-5xl font-black mb-10 tracking-tight text-neutral-900">
          Finalizar Compra
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Main Checkout Flow */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-8">

            {/* Cart Items */}
            <div className="glass-card rounded-[2rem] p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="bg-primary-100 p-3 rounded-full">
                  <ShoppingBag className="w-6 h-6 text-primary-600" />
                </div>
                <h2 className="text-2xl font-bold font-display text-neutral-900">Tu Pedido</h2>
              </div>

              <div className="space-y-6">
                {items.map((item) => (
                  <div key={item.product.id} className="flex gap-6 py-2 border-b border-neutral-100 last:border-0 pb-6 last:pb-2">
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 bg-neutral-100 rounded-2xl overflow-hidden flex-shrink-0 border border-neutral-200/50 shadow-inner">
                      {item.product.main_image && (
                        <Image
                          src={item.product.main_image}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>

                    <div className="flex-grow flex flex-col justify-between">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h3 className="font-bold text-neutral-900 text-lg leading-tight mb-1">{item.product.name}</h3>
                          <p className="text-sm text-primary-600 font-semibold mb-3">
                            ${item.product.price.toLocaleString('es-CO')}
                          </p>
                        </div>
                        <p className="font-bold text-lg text-neutral-900 hidden sm:block">
                          ${(item.product.price * item.quantity).toLocaleString('es-CO')}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-1 bg-neutral-100 rounded-xl p-1 border border-neutral-200/60">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-neutral-600"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-semibold text-sm">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-neutral-600 disabled:opacity-50"
                            disabled={item.quantity >= item.product.stock}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.product.id)}
                          className="text-neutral-400 hover:text-red-500 p-2 rounded-xl hover:bg-red-50 transition-colors"
                          title="Eliminar producto"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <p className="font-bold text-lg text-neutral-900 sm:hidden mt-2">
                        ${(item.product.price * item.quantity).toLocaleString('es-CO')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Info */}
            <div className="glass-card rounded-[2rem] p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="bg-primary-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold font-display text-neutral-900">Datos de Contacto</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">Nombre Completo</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-5 py-3.5 bg-white/60 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium text-neutral-900 shadow-sm"
                    placeholder="Ej. Juan Pérez"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">Correo Electrónico</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-5 py-3.5 bg-white/60 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium text-neutral-900 shadow-sm"
                    placeholder="tucorreo@ejemplo.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">Teléfono Móvil</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-5 py-3.5 bg-white/60 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium text-neutral-900 shadow-sm"
                    placeholder="+57 300 123 4567"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Delivery Options */}
            <div className="glass-card rounded-[2rem] p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="bg-primary-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold font-display text-neutral-900">Método de Entrega</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <label className={`relative flex items-start p-5 cursor-pointer rounded-2xl transition-all duration-300 border-2 ${deliveryType === 'delivery'
                  ? 'bg-primary-50/50 border-primary-500 shadow-sm'
                  : 'bg-white/60 border-neutral-200 hover:border-neutral-300'
                  }`}>
                  <div className="flex items-center h-6">
                    <input
                      type="radio"
                      value="delivery"
                      checked={deliveryType === 'delivery'}
                      onChange={(e) => setDeliveryType(e.target.value as 'delivery')}
                      className="w-5 h-5 text-primary-600 border-neutral-300 focus:ring-primary-500"
                    />
                  </div>
                  <div className="ml-4">
                    <span className="block text-base font-bold text-neutral-900 mb-1">Envío a domicilio</span>
                    <span className="block text-sm text-neutral-500">Recibe tu compra en la puerta de tu casa</span>
                  </div>
                </label>

                <label className={`relative flex items-start p-5 cursor-pointer rounded-2xl transition-all duration-300 border-2 ${deliveryType === 'pickup'
                  ? 'bg-primary-50/50 border-primary-500 shadow-sm'
                  : 'bg-white/60 border-neutral-200 hover:border-neutral-300'
                  }`}>
                  <div className="flex items-center h-6">
                    <input
                      type="radio"
                      value="pickup"
                      checked={deliveryType === 'pickup'}
                      onChange={(e) => setDeliveryType(e.target.value as 'pickup')}
                      className="w-5 h-5 text-primary-600 border-neutral-300 focus:ring-primary-500"
                    />
                  </div>
                  <div className="ml-4">
                    <span className="block text-base font-bold text-neutral-900 mb-1">Recoger en tienda</span>
                    <span className="block text-sm text-neutral-500">Retira gratis en nuestro punto físico</span>
                  </div>
                </label>
              </div>

              {deliveryType === 'delivery' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-neutral-50/50 rounded-2xl border border-neutral-100">
                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-2">Departamento *</label>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="w-full px-5 py-3.5 bg-white/80 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium text-neutral-900 shadow-sm"
                      required
                    >
                      <option value="">Selecciona un departamento</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-2">Ciudad *</label>
                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      className="w-full px-5 py-3.5 bg-white/80 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium text-neutral-900 shadow-sm disabled:bg-neutral-100 disabled:opacity-50"
                      required
                      disabled={!selectedDepartment}
                    >
                      <option value="">Selecciona una ciudad</option>
                      {filteredCities.map((city) => (
                        <option key={city.id} value={city.id}>
                          {city.name} - ${city.delivery_cost.toLocaleString('es-CO')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-neutral-700 mb-2">Dirección completa *</label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-5 py-3.5 bg-white/80 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium text-neutral-900 shadow-sm"
                      placeholder="Calle, Carrera, Número, Barrio, Detalles adicionales"
                      rows={3}
                      required
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: Order Summary */}
          <div className="lg:col-span-5 xl:col-span-4">
            <div className="glass-card rounded-[2.5rem] p-8 shadow-xl shadow-primary-500/5 lg:sticky lg:top-28">
              <h2 className="text-2xl font-bold font-display text-neutral-900 mb-8 tracking-tight">Resumen de Compra</h2>

              {/* Coupon */}
              <div className="mb-8">
                <label className="block text-sm font-bold text-neutral-700 mb-3 uppercase tracking-wider">Código de Descuento</label>
                <div className="flex flex-col sm:flex-row gap-3 relative">
                  <div className="relative flex-grow">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                      <Tag className="w-5 h-5 text-neutral-400" />
                    </div>
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Escribe tu código"
                      className="w-full pl-12 pr-4 py-4 bg-white/80 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all uppercase font-semibold text-neutral-900 shadow-sm"
                    />
                  </div>
                  <button
                    onClick={applyCoupon}
                    className="w-full sm:w-auto px-8 py-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-bold transition-all shadow-md active:scale-95 whitespace-nowrap"
                  >
                    Aplicar
                  </button>
                </div>
                {appliedCoupon && (
                  <div className="mt-3 inline-flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg border border-green-200 text-sm font-semibold">
                    <Tag className="w-4 h-4" />
                    ¡Cupón aplicado: {appliedCoupon.code}!
                  </div>
                )}
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center text-neutral-600 font-medium pb-4 border-b border-neutral-100">
                  <span>Subtotal ({items.length} prod.)</span>
                  <span className="text-neutral-900">${subtotal.toLocaleString('es-CO')}</span>
                </div>

                {deliveryCost > 0 && (
                  <div className="flex justify-between items-center text-neutral-600 font-medium pb-4 border-b border-neutral-100">
                    <span>Costo de envío</span>
                    <span className="text-neutral-900">${deliveryCost.toLocaleString('es-CO')}</span>
                  </div>
                )}

                {discount > 0 && (
                  <div className="flex justify-between items-center text-green-600 font-semibold pb-4 border-b border-neutral-100">
                    <span>Descuento</span>
                    <span>-${discount.toLocaleString('es-CO')}</span>
                  </div>
                )}

                <div className="pt-2">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-xl font-bold text-neutral-900">Total a Pagar</span>
                    <div className="text-right">
                      <span className="block text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-accent-500 tracking-tight">
                        ${total.toLocaleString('es-CO')}
                      </span>
                      <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">COP</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative group/payBtn">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary-500 to-accent-500 rounded-2xl blur opacity-30 group-hover/payBtn:opacity-60 transition duration-500 group-disabled/payBtn:hidden"></div>
                <button
                  onClick={handleCheckout}
                  disabled={isPending}
                  className="relative w-full bg-neutral-900 hover:bg-neutral-800 text-white py-6 rounded-2xl font-bold text-xl transition-all duration-300 hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 overflow-hidden"
                >
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Procesando...
                    </span>
                  ) : (
                    <>
                      <span>Pagar con MercadoPago</span>
                      <CreditCard className="w-6 h-6 flex-shrink-0" />
                    </>
                  )}
                </button>
              </div>

              <div className="mt-6 flex flex-col items-center gap-3">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Pago 100% Seguro
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
