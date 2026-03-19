'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Package, Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

interface ShippingBox {
  id: string;
  name: string;
  width: number;
  height: number;
  length: number;
  max_weight: number;
  is_active: boolean;
  created_at: string;
}

export default function AdminBoxesPage() {
  const [boxes, setBoxes] = useState<ShippingBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBox, setEditingBox] = useState<ShippingBox | null>(null);

  const [name, setName] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [length, setLength] = useState('');
  const [maxWeight, setMaxWeight] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchBoxes();
  }, []);

  async function fetchBoxes() {
    setLoading(true);
    const { data } = await supabase
      .from('shipping_boxes')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setBoxes(data);
    setLoading(false);
  }

  function resetForm() {
    setName('');
    setWidth('');
    setHeight('');
    setLength('');
    setMaxWeight('');
    setIsActive(true);
  }

  function openCreate() {
    setEditingBox(null);
    resetForm();
    setShowModal(true);
  }

  function openEdit(box: ShippingBox) {
    setEditingBox(box);
    setName(box.name);
    setWidth(box.width.toString());
    setHeight(box.height.toString());
    setLength(box.length.toString());
    setMaxWeight(box.max_weight.toString());
    setIsActive(box.is_active);
    setShowModal(true);
  }

  async function handleSave() {
    if (!name || !width || !height || !length || !maxWeight) {
      toast.error('Completa todos los campos');
      return;
    }

    const boxData = {
      name,
      width: parseFloat(width),
      height: parseFloat(height),
      length: parseFloat(length),
      max_weight: parseFloat(maxWeight),
      is_active: isActive,
    };

    try {
      if (editingBox) {
        const { error } = await supabase
          .from('shipping_boxes')
          .update(boxData)
          .eq('id', editingBox.id);
        if (error) throw error;
        toast.success('Caja actualizada');
      } else {
        const { error } = await supabase
          .from('shipping_boxes')
          .insert(boxData);
        if (error) throw error;
        toast.success('Caja creada');
      }
      setShowModal(false);
      fetchBoxes();
    } catch (error) {
      console.error('Error saving box:', error);
      toast.error('Error al guardar la caja');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta caja?')) return;
    try {
      const { error } = await supabase.from('shipping_boxes').delete().eq('id', id);
      if (error) throw error;
      toast.success('Caja eliminada');
      fetchBoxes();
    } catch (error) {
      console.error('Error deleting box:', error);
      toast.error('Error al eliminar');
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/admin/dashboard" className="text-neutral-600 hover:text-neutral-900">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <Package className="w-6 h-6 text-primary-500" />
              <h1 className="text-xl font-bold">Cajas de Envío</h1>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center space-x-2 bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Nueva Caja</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-50">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-semibold text-neutral-600">Nombre</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-neutral-600">Dimensiones (cm)</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-neutral-600">Peso Máx (kg)</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-neutral-600">Estado</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-neutral-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">Cargando...</td>
                </tr>
              ) : boxes.length > 0 ? (
                boxes.map((box) => (
                  <tr key={box.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 font-medium">{box.name}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600">
                      {box.width} x {box.height} x {box.length}
                    </td>
                    <td className="px-6 py-4 text-sm">{box.max_weight} kg</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        box.is_active ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'
                      }`}>
                        {box.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openEdit(box)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(box.id)}
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
                  <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                    No hay cajas configuradas. Agrega una para optimizar los envíos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-neutral-200">
              <h2 className="text-xl font-bold">
                {editingBox ? 'Editar Caja' : 'Nueva Caja'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nombre *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Caja pequeña"
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Ancho (cm) *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Alto (cm) *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Largo (cm) *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Peso Máximo (kg) *</label>
                <input
                  type="number"
                  step="0.1"
                  value={maxWeight}
                  onChange={(e) => setMaxWeight(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="boxActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-primary-500 rounded"
                />
                <label htmlFor="boxActive" className="text-sm font-medium">Caja activa</label>
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
                {editingBox ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
