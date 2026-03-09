'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Product, Category } from '@/types';
import { Package, Plus, Pencil, Trash2, Search, AlertTriangle, ArrowLeft, Sparkles, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [sku, setSku] = useState('');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [mainImage, setMainImage] = useState('');
  const [images, setImages] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [generatingDescription, setGeneratingDescription] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    
    const { data: productsData } = await supabase
      .from('products')
      .select('*, categories(*)')
      .order('created_at', { ascending: false });
    
    const { data: categoriesData } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (productsData) setProducts(productsData);
    if (categoriesData) setCategories(categoriesData);
    setLoading(false);
  }

  function openCreateModal() {
    setEditingProduct(null);
    resetForm();
    setShowModal(true);
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);
    setName(product.name);
    setDescription(product.description || '');
    setPrice(product.price.toString());
    setStock(product.stock.toString());
    setSku(product.sku || '');
    setCategoryIds(product.categories?.map(c => c.id) || []);
    setMainImage(product.main_image || '');
    setImages(product.images?.join(', ') || '');
    setIsActive(product.is_active);
    setShowModal(true);
  }

  function resetForm() {
    setName('');
    setDescription('');
    setPrice('');
    setStock('');
    setSku('');
    setCategoryIds([]);
    setMainImage('');
    setImages('');
    setIsActive(true);
  }

  async function handleSave() {
    if (!name || !price || !stock) {
      toast.error('Por favor completa los campos requeridos');
      return;
    }

    const slug = name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const productData = {
      name,
      slug: editingProduct ? editingProduct.slug : slug,
      description: description || null,
      price: parseFloat(price),
      stock: parseInt(stock),
      sku: sku || null,
      main_image: mainImage || null,
      images: images ? images.split(',').map(url => url.trim()).filter(Boolean) : null,
      is_active: isActive,
    };

    try {
      let productId: string;

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        productId = editingProduct.id;

        // Remove old category associations
        await supabase
          .from('product_categories')
          .delete()
          .eq('product_id', productId);
      } else {
        const { data: newProduct, error } = await supabase
          .from('products')
          .insert(productData)
          .select('id')
          .single();

        if (error) throw error;
        productId = newProduct.id;
      }

      // Insert new category associations
      if (categoryIds.length > 0) {
        const { error: catError } = await supabase
          .from('product_categories')
          .insert(categoryIds.map(catId => ({ product_id: productId, category_id: catId })));

        if (catError) throw catError;
      }

      toast.success(editingProduct ? 'Producto actualizado' : 'Producto creado');
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Error al guardar el producto');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Producto eliminado');
      fetchData();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Error al eliminar el producto');
    }
  }

  async function handleGenerateDescription() {
    if (!name) {
      toast.error('Primero escribe el nombre del producto');
      return;
    }

    setGeneratingDescription(true);
    try {
      const selectedCategories = categories.filter(c => categoryIds.includes(c.id));
      const res = await fetch('/api/admin/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          currentDescription: description || undefined,
          category: selectedCategories.map(c => c.name).join(', ') || undefined,
          price: price || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Error al generar descripción');
        return;
      }

      setDescription(data.description);
      toast.success(description ? 'Descripción mejorada con IA' : 'Descripción generada con IA');
    } catch (error) {
      console.error('Error generating description:', error);
      toast.error('Error al generar descripción');
    } finally {
      setGeneratingDescription(false);
    }
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <h1 className="font-display text-2xl font-bold">Productos</h1>
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center space-x-2 bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Nuevo Producto</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Producto</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Categoría</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Precio</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Stock</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600">Estado</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-neutral-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                      Cargando...
                    </td>
                  </tr>
                ) : filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          {product.main_image ? (
                            <img
                              src={product.main_image}
                              alt={product.name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-neutral-100 rounded-lg flex items-center justify-center">
                              <Package className="w-6 h-6 text-neutral-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-neutral-900">{product.name}</p>
                            {product.sku && (
                              <p className="text-xs text-neutral-500">SKU: {product.sku}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600">
                        {product.categories && product.categories.length > 0
                          ? <div className="flex flex-wrap gap-1">{product.categories.map(c => (
                              <span key={c.id} className="px-2 py-0.5 bg-neutral-100 rounded-full text-xs">{c.name}</span>
                            ))}</div>
                          : '-'}
                      </td>
                      <td className="px-6 py-4 font-semibold">
                        ${product.price.toLocaleString('es-CO')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`flex items-center space-x-1 ${
                          product.stock === 0 ? 'text-red-600' :
                          product.stock <= 5 ? 'text-orange-600' :
                          'text-green-600'
                        }`}>
                          {product.stock === 0 && <AlertTriangle className="w-4 h-4" />}
                          <span className="font-semibold">{product.stock}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          product.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-neutral-100 text-neutral-700'
                        }`}>
                          {product.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => openEditModal(product)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
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
                    <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                      No se encontraron productos
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
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-neutral-200">
              <h2 className="text-2xl font-bold">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nombre *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">Descripción</label>
                  <button
                    type="button"
                    onClick={handleGenerateDescription}
                    disabled={generatingDescription || !name}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingDescription ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {description ? 'Mejorar con IA' : 'Generar con IA'}
                  </button>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Escribe una descripción o genera una con IA..."
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Precio (COP) *</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Stock *</label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">SKU</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Categorías</label>
                  <div className="border border-neutral-300 rounded-lg p-3 max-h-36 overflow-y-auto space-y-2">
                    {categories.length > 0 ? categories.map((cat) => (
                      <label key={cat.id} className="flex items-center gap-2 cursor-pointer hover:bg-neutral-50 px-2 py-1 rounded">
                        <input
                          type="checkbox"
                          checked={categoryIds.includes(cat.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCategoryIds([...categoryIds, cat.id]);
                            } else {
                              setCategoryIds(categoryIds.filter(id => id !== cat.id));
                            }
                          }}
                          className="w-4 h-4 text-primary-500 rounded focus:ring-2 focus:ring-primary-500"
                        />
                        <span className="text-sm">{cat.name}</span>
                      </label>
                    )) : (
                      <p className="text-sm text-neutral-400">No hay categorías</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Imagen Principal (URL)</label>
                <input
                  type="url"
                  value={mainImage}
                  onChange={(e) => setMainImage(e.target.value)}
                  placeholder="https://ejemplo.com/imagen.jpg"
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Imágenes Adicionales (URLs separadas por coma)</label>
                <textarea
                  value={images}
                  onChange={(e) => setImages(e.target.value)}
                  rows={2}
                  placeholder="https://ejemplo.com/img1.jpg, https://ejemplo.com/img2.jpg"
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
                  Producto activo (visible en la tienda)
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
                {editingProduct ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
