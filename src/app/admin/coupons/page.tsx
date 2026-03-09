'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Coupon } from '@/types';
import { Tag, Plus, Pencil, Trash2, ArrowLeft, Percent, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  
  // Form state
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [minPurchase, setMinPurchase] = useState('0');
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchCoupons();
  }, []);

  async function fetchCoupons() {
    setLoading(true);
    
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setCoupons(data);
    setLoading(false);
  }

  function openCreateModal() {
    setEditingCoupon(null);
    resetForm();
    setShowModal(true);
  }

  function openEditModal(coupon: Coupon) {
    setEditingCoupon(coupon);
    setCode(coupon.code);
    setDiscountType(coupon.discount_type);
    setDiscountValue(coupon.discount_value.toString());
    setMinPurchase(coupon.min_purchase.toString());
    setMaxUses(coupon.max_uses?.toString() || '');
    setExpiresAt(coupon.expires_at ? new Date(coupon.expires_at).toISOString().split('T')[0] : '');
    setIsActive(coupon.is_active);
    setShowModal(true);
  }

  function resetForm() {
    setCode('');
    setDiscountType('percentage');
    setDiscountValue('');
    setMinPurchase('0');
    setMaxUses('');
    setExpiresAt('');
    setIsActive(true);
  }

  async function handleSave() {
    if (!code || !discountValue) {
      toast.error('Por favor completa los campos requeridos');
      return;
    }

    const couponData = {
      code: code.toUpperCase(),
      discount_type: discountType,
      discount_value: parseFloat(discountValue),
      min_purchase: parseFloat(minPurchase),
      max_uses: maxUses ? parseInt(maxUses) : null,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      is_active: isActive,
      current_uses: editingCoupon?.current_uses || 0,
    };

    try {
      if (editingCoupon) {
        const { error } = await supabase
          .from('coupons')
          .update(couponData)
          .eq('id', editingCoupon.id);

        if (error) throw error;
        toast.success('Cupón actualizado');
      } else {
        const { error } = await supabase
          .from('coupons')
          .insert(couponData);

        if (error) throw error;
        toast.success('Cupón creado');
      }

      setShowModal(false);
      fetchCoupons();
    } catch (error: any) {
      console.error('Error saving coupon:', error);
      if (error.code === '23505') {
        toast.error('Este código ya existe');
      } else {
        toast.error('Error al guardar el cupón');
      }
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar este cupón?')) return;

    try {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Cupón eliminado');
      fetchCoupons();
    } catch (error) {
      console.error('Error deleting coupon:', error);
      toast.error('Error al eliminar el cupón');
    }
  }

  function isExpired(coupon: Coupon): boolean {
    if (!coupon.expires_at) return false;
    return new Date(coupon.expires_at) < new Date();
  }

  function isMaxUsesReached(coupon: Coupon): boolean {
    if (!coupon.max_uses) return false;
    return coupon.current_uses >= coupon.max_uses;
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
              <h1 className="font-display text-2xl font-bold">Cupones</h1>
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center space-x-2 bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Nuevo Cupón</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Coupons Table */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Código</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Descuento</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Compra Mínima</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Usos</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Expira</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Estado</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-neutral-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-neutral-500">
                      Cargando...
                    </td>
                  </tr>
                ) : coupons.length > 0 ? (
                  coupons.map((coupon) => (
                    <tr key={coupon.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <Tag className="w-4 h-4 text-primary-500" />
                          <span className="font-mono font-semibold text-neutral-900">
                            {coupon.code}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1 text-green-600 font-semibold">
                          {coupon.discount_type === 'percentage' ? (
                            <>
                              <Percent className="w-4 h-4" />
                              <span>{coupon.discount_value}%</span>
                            </>
                          ) : (
                            <>
                              <DollarSign className="w-4 h-4" />
                              <span>${coupon.discount_value.toLocaleString('es-CO')}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600">
                        ${coupon.min_purchase.toLocaleString('es-CO')}
                      </td>
                      <td className="px-6 py-4">
                        {coupon.max_uses ? (
                          <span className={`text-sm ${
                            isMaxUsesReached(coupon) ? 'text-red-600 font-semibold' : 'text-neutral-600'
                          }`}>
                            {coupon.current_uses} / {coupon.max_uses}
                          </span>
                        ) : (
                          <span className="text-sm text-neutral-600">
                            {coupon.current_uses} (ilimitado)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {coupon.expires_at ? (
                          <span className={isExpired(coupon) ? 'text-red-600 font-semibold' : 'text-neutral-600'}>
                            {new Date(coupon.expires_at).toLocaleDateString('es-CO')}
                          </span>
                        ) : (
                          <span className="text-neutral-400">Sin expiración</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          !coupon.is_active ? 'bg-neutral-100 text-neutral-700' :
                          isExpired(coupon) || isMaxUsesReached(coupon) ? 'bg-red-100 text-red-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {!coupon.is_active ? 'Inactivo' :
                           isExpired(coupon) ? 'Expirado' :
                           isMaxUsesReached(coupon) ? 'Agotado' :
                           'Activo'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => openEditModal(coupon)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(coupon.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-neutral-500">
                      <Tag className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-neutral-700 mb-2">
                        No hay cupones
                      </h3>
                      <p className="text-neutral-500 mb-6">
                        Crea cupones de descuento para tus clientes
                      </p>
                      <button
                        onClick={openCreateModal}
                        className="inline-flex items-center space-x-2 bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                        <span>Crear Cupón</span>
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="p-6 border-b border-neutral-200">
              <h2 className="text-2xl font-bold">
                {editingCoupon ? 'Editar Cupón' : 'Nuevo Cupón'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Código *</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="VERANO2024"
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent uppercase font-mono"
                  required
                  disabled={!!editingCoupon}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tipo de Descuento *</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="percentage">Porcentaje (%)</option>
                  <option value="fixed">Valor Fijo (COP)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Valor del Descuento * {discountType === 'percentage' ? '(%)' : '(COP)'}
                </label>
                <input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === 'percentage' ? '20' : '10000'}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Compra Mínima (COP)</label>
                <input
                  type="number"
                  value={minPurchase}
                  onChange={(e) => setMinPurchase(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Usos Máximos (dejar vacío para ilimitado)
                </label>
                <input
                  type="number"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder="Ilimitado"
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Fecha de Expiración (opcional)
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-primary-500 rounded focus:ring-2 focus:ring-primary-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium">
                  Cupón activo
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-neutral-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                {editingCoupon ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
