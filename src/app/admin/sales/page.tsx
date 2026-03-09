'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Search, Plus, Minus, Trash2, ShoppingBag,
  User, Phone, Mail, FileText, Receipt, CheckCircle, AlertCircle, Printer, MessageCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Product } from '@/types';
import toast from 'react-hot-toast';

interface SaleItem {
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  total: number;
  stock: number;
}

interface CompletedSale {
  id: string;
  order_number: string;
  customer_name: string;
  total: number;
  subtotal: number;
  discount: number;
  items: Array<{
    product_name: string;
    quantity: number;
    product_price: number;
    total: number;
  }>;
  created_at: string;
}

export default function AdminSalesPage() {
  const router = useRouter();

  // Product search
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Sale items
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);

  // Customer info (optional)
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState(0);

  // State
  const [loading, setLoading] = useState(false);
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function fetchProducts() {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .gt('stock', 0)
      .order('name');
    if (data) setProducts(data);
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  function addProduct(product: Product) {
    const existing = saleItems.find(item => item.product_id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        toast.error(`Stock máximo alcanzado para "${product.name}"`);
        return;
      }
      setSaleItems(saleItems.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.product_price }
          : item
      ));
    } else {
      setSaleItems([...saleItems, {
        product_id: product.id,
        product_name: product.name,
        product_price: product.price,
        quantity: 1,
        total: product.price,
        stock: product.stock,
      }]);
    }
    setSearchTerm('');
    setShowDropdown(false);
  }

  function updateQuantity(productId: string, newQuantity: number) {
    if (newQuantity <= 0) {
      removeItem(productId);
      return;
    }
    setSaleItems(saleItems.map(item => {
      if (item.product_id === productId) {
        if (newQuantity > item.stock) {
          toast.error(`Stock máximo: ${item.stock}`);
          return item;
        }
        return { ...item, quantity: newQuantity, total: newQuantity * item.product_price };
      }
      return item;
    }));
  }

  function removeItem(productId: string) {
    setSaleItems(saleItems.filter(item => item.product_id !== productId));
  }

  const subtotal = saleItems.reduce((sum, item) => sum + item.total, 0);
  const total = subtotal - discount;

  async function handleSubmitSale() {
    if (saleItems.length === 0) {
      toast.error('Agrega al menos un producto');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName || undefined,
          customer_phone: customerPhone || undefined,
          customer_email: customerEmail || undefined,
          notes: notes || undefined,
          discount,
          items: saleItems.map(({ product_id, product_name, product_price, quantity, total }) => ({
            product_id, product_name, product_price, quantity, total,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Error al registrar la venta');
        return;
      }

      setCompletedSale(data.order);
      toast.success('Venta registrada exitosamente');

      // Refresh products to get updated stock
      fetchProducts();
    } catch (error) {
      console.error('Sale error:', error);
      toast.error('Error al registrar la venta');
    } finally {
      setLoading(false);
    }
  }

  function handleNewSale() {
    setSaleItems([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setNotes('');
    setDiscount(0);
    setCompletedSale(null);
  }

  function handlePrintReceipt() {
    window.print();
  }

  // Receipt view after successful sale
  if (completedSale) {
    const businessName = process.env.NEXT_PUBLIC_BUSINESS_NAME || 'Tu Tienda Colombia';
    const businessPhone = process.env.NEXT_PUBLIC_BUSINESS_PHONE || '';
    const storeAddress = process.env.NEXT_PUBLIC_STORE_ADDRESS || '';
    const storeCity = process.env.NEXT_PUBLIC_STORE_CITY || '';

    return (
      <div className="min-h-screen bg-neutral-50">
        {/* Header - hidden when printing */}
        <header className="bg-white border-b border-neutral-200 print:hidden">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="font-display text-xl font-bold text-neutral-900">Recibo de Venta</h1>
              <div className="flex gap-3">
                <Link
                  href="/admin/dashboard"
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors text-sm font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Admin
                </Link>
                <button
                  onClick={handlePrintReceipt}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm font-medium"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `🧾 *Recibo de compra - ${businessName}*\n` +
                    `📦 Pedido: ${completedSale.order_number}\n` +
                    `📅 Fecha: ${new Date(completedSale.created_at).toLocaleString('es-CO')}\n\n` +
                    completedSale.items.map(item =>
                      `• ${item.product_name} x${item.quantity} - $${item.total.toLocaleString('es-CO')}`
                    ).join('\n') +
                    `\n\n💰 *Total: $${completedSale.total.toLocaleString('es-CO')} COP*` +
                    (completedSale.discount > 0 ? `\n🏷️ Descuento: -$${completedSale.discount.toLocaleString('es-CO')}` : '') +
                    `\n\n✅ Pago recibido\n¡Gracias por su compra!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </a>
                <button
                  onClick={handleNewSale}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Nueva Venta
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Receipt */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8 print:shadow-none print:border-none">
            {/* Receipt Header */}
            <div className="text-center mb-8 pb-6 border-b border-dashed border-neutral-300">
              <h2 className="text-2xl font-bold text-neutral-900">{businessName}</h2>
              {storeAddress && <p className="text-sm text-neutral-600 mt-1">{storeAddress}</p>}
              {storeCity && <p className="text-sm text-neutral-600">{storeCity}</p>}
              {businessPhone && <p className="text-sm text-neutral-600">{businessPhone}</p>}
            </div>

            {/* Sale Info */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-sm text-neutral-500">N° de Venta</p>
                <p className="font-bold text-neutral-900">{completedSale.order_number}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-500">Fecha</p>
                <p className="font-medium text-neutral-900">
                  {new Date(completedSale.created_at).toLocaleString('es-CO')}
                </p>
              </div>
            </div>

            {completedSale.customer_name && completedSale.customer_name !== 'Venta en persona' && (
              <div className="mb-6 p-3 bg-neutral-50 rounded-lg">
                <p className="text-sm text-neutral-500">Cliente</p>
                <p className="font-medium text-neutral-900">{completedSale.customer_name}</p>
              </div>
            )}

            {/* Items */}
            <table className="w-full mb-6">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-2 text-sm font-semibold text-neutral-600">Producto</th>
                  <th className="text-center py-2 text-sm font-semibold text-neutral-600">Cant.</th>
                  <th className="text-right py-2 text-sm font-semibold text-neutral-600">Precio</th>
                  <th className="text-right py-2 text-sm font-semibold text-neutral-600">Total</th>
                </tr>
              </thead>
              <tbody>
                {completedSale.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-neutral-100">
                    <td className="py-3 text-sm text-neutral-900">{item.product_name}</td>
                    <td className="py-3 text-sm text-neutral-600 text-center">{item.quantity}</td>
                    <td className="py-3 text-sm text-neutral-600 text-right">
                      ${item.product_price.toLocaleString('es-CO')}
                    </td>
                    <td className="py-3 text-sm font-medium text-neutral-900 text-right">
                      ${item.total.toLocaleString('es-CO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="border-t-2 border-dashed border-neutral-300 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Subtotal</span>
                <span className="text-neutral-900">${completedSale.subtotal.toLocaleString('es-CO')}</span>
              </div>
              {completedSale.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Descuento</span>
                  <span className="text-green-600">-${completedSale.discount.toLocaleString('es-CO')}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-neutral-200">
                <span className="text-neutral-900">Total</span>
                <span className="text-neutral-900">${completedSale.total.toLocaleString('es-CO')}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-dashed border-neutral-300 text-center">
              <div className="inline-flex items-center gap-2 text-green-600 mb-2">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Pago recibido - Venta completada</span>
              </div>
              <p className="text-xs text-neutral-500 mt-2">Gracias por su compra</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/dashboard"
                className="text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2">
                <Receipt className="w-6 h-6 text-primary-500" />
                <h1 className="font-display text-xl font-bold text-neutral-900">
                  Registrar Venta en Persona
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Product selection + items */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            {/* Product Search */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-neutral-200">
              <h2 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary-500" />
                Agregar Productos
              </h2>
              <div ref={searchRef} className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Buscar producto por nombre o SKU..."
                    className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-neutral-900"
                  />
                </div>

                {/* Product dropdown */}
                {showDropdown && searchTerm && (
                  <div className="absolute z-10 mt-1 w-full bg-white rounded-xl shadow-lg border border-neutral-200 max-h-64 overflow-y-auto">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.slice(0, 10).map(product => (
                        <button
                          key={product.id}
                          onClick={() => addProduct(product)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50 transition-colors text-left border-b border-neutral-100 last:border-0"
                        >
                          <div>
                            <p className="font-medium text-neutral-900">{product.name}</p>
                            <p className="text-sm text-neutral-500">
                              {product.sku && <span className="mr-2">SKU: {product.sku}</span>}
                              Stock: {product.stock}
                            </p>
                          </div>
                          <span className="font-bold text-primary-600">
                            ${product.price.toLocaleString('es-CO')}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-neutral-500 text-center">
                        No se encontraron productos
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Sale Items */}
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200">
              <div className="p-6 border-b border-neutral-200">
                <h2 className="text-lg font-bold text-neutral-900">
                  Productos en la Venta ({saleItems.length})
                </h2>
              </div>

              {saleItems.length === 0 ? (
                <div className="p-12 text-center">
                  <ShoppingBag className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                  <p className="text-neutral-500">Busca y agrega productos a la venta</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {saleItems.map(item => (
                    <div key={item.product_id} className="flex items-center justify-between p-4 hover:bg-neutral-50">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-neutral-900 truncate">{item.product_name}</p>
                        <p className="text-sm text-neutral-500">
                          ${item.product_price.toLocaleString('es-CO')} c/u
                          <span className="ml-2 text-neutral-400">· Stock: {item.stock}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-4 ml-4">
                        {/* Quantity controls */}
                        <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-1">
                          <button
                            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                            className="p-1.5 hover:bg-white rounded-md transition-colors"
                          >
                            <Minus className="w-4 h-4 text-neutral-600" />
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.product_id, parseInt(e.target.value) || 0)}
                            className="w-12 text-center bg-transparent font-semibold text-sm text-neutral-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            min={1}
                            max={item.stock}
                          />
                          <button
                            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                            className="p-1.5 hover:bg-white rounded-md transition-colors"
                            disabled={item.quantity >= item.stock}
                          >
                            <Plus className="w-4 h-4 text-neutral-600" />
                          </button>
                        </div>

                        {/* Total */}
                        <span className="font-bold text-neutral-900 w-28 text-right">
                          ${item.total.toLocaleString('es-CO')}
                        </span>

                        {/* Remove */}
                        <button
                          onClick={() => removeItem(item.product_id)}
                          className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Customer info + totals */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6">
            {/* Customer Info (optional) */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-neutral-200">
              <h2 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-primary-500" />
                Cliente <span className="text-sm font-normal text-neutral-400">(opcional)</span>
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Nombre</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nombre del cliente"
                      className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm text-neutral-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Teléfono</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+57 300 123 4567"
                      className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm text-neutral-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Correo</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm text-neutral-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Notas</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Notas adicionales..."
                      rows={2}
                      className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm text-neutral-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-neutral-200">
              <h2 className="text-lg font-bold text-neutral-900 mb-4">Resumen</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Subtotal ({saleItems.length} productos)</span>
                  <span className="font-medium text-neutral-900">${subtotal.toLocaleString('es-CO')}</span>
                </div>

                {/* Discount */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-neutral-600 flex-shrink-0">Descuento</span>
                  <div className="flex-1 flex items-center gap-1">
                    <span className="text-neutral-400 text-sm">$</span>
                    <input
                      type="number"
                      value={discount || ''}
                      onChange={(e) => setDiscount(Math.max(0, Math.min(subtotal, parseInt(e.target.value) || 0)))}
                      placeholder="0"
                      className="w-full text-right py-1 px-2 border border-neutral-200 rounded-lg text-sm font-medium text-neutral-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-200">
                  <div className="flex justify-between">
                    <span className="text-lg font-bold text-neutral-900">Total</span>
                    <span className="text-2xl font-black text-primary-600">
                      ${total.toLocaleString('es-CO')}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 text-right mt-1">COP</p>
                </div>
              </div>

              <button
                onClick={handleSubmitSale}
                disabled={loading || saleItems.length === 0}
                className="w-full bg-neutral-900 hover:bg-neutral-800 text-white py-4 rounded-xl font-bold text-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Registrando...
                  </span>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Registrar Venta
                  </>
                )}
              </button>

              {saleItems.length > 0 && saleItems.some(item => item.stock <= 5) && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-amber-700">
                      <p className="font-semibold mb-1">Stock bajo:</p>
                      {saleItems.filter(item => item.stock <= 5).map(item => (
                        <p key={item.product_id}>
                          {item.product_name}: quedan {item.stock - item.quantity} después de esta venta
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
