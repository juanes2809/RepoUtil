'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import ProductCard from '@/components/shop/ProductCard';
import ProductModal from '@/components/shop/ProductModal';
import { Product, Category } from '@/types';
import { supabase } from '@/lib/supabase';
import { Search, Package } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, searchQuery]);

  async function fetchCategories() {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (data) setCategories(data);
  }

  async function fetchProducts() {
    setLoading(true);

    let query = supabase
      .from('products')
      .select('*, categories(*)')
      .eq('is_active', true);

    if (selectedCategory) {
      // Filter products that belong to the selected category via join table
      query = supabase
        .from('products')
        .select('*, categories!inner(*)')
        .eq('is_active', true)
        .eq('categories.id', selectedCategory);

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }
    } else if (searchQuery) {
      query = query.ilike('name', `%${searchQuery}%`);
    }

    query = query.order('created_at', { ascending: false });

    const { data } = await query;

    if (data) {
      setProducts(data);
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 selection:bg-primary-200 selection:text-primary-900">
      <Header />

      <main className="flex-grow pt-24 pb-12">
        {/* Page Header with Mesh Gradient */}
        <section className="relative px-4 sm:px-6 lg:px-8 py-16 lg:py-24 rounded-[3rem] mx-4 lg:mx-8 mb-12 overflow-hidden shadow-xl shadow-primary-500/5">
          <div className="absolute inset-0 mesh-bg opacity-100 z-0 object-cover mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-primary-900/40 to-accent-900/60 backdrop-blur-sm z-[1]"></div>

          <div className="relative z-10 max-w-7xl mx-auto text-center animate-slide-up">
            <h1 className="font-display text-4xl md:text-6xl font-black mb-4 tracking-tight text-white drop-shadow-md">
              Catálogo de Productos
            </h1>
            <p className="text-xl text-primary-50 max-w-2xl mx-auto font-medium">
              Explora nuestra colección premium, diseñada pensada en ti.
            </p>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Search and Filters */}
          <div className="mb-12 space-y-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            {/* Elegant Search Bar */}
            <div className="relative max-w-2xl mx-auto group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary-500 to-accent-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <div className="relative flex items-center bg-white rounded-2xl shadow-sm border border-neutral-200 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 transition-all duration-300">
                <Search className="absolute left-4 text-neutral-400 w-6 h-6 group-focus-within:text-primary-500 transition-colors" />
                <input
                  type="text"
                  placeholder="¿Qué estás buscando hoy?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-14 pr-4 py-4 bg-transparent outline-none text-neutral-900 placeholder-neutral-400 font-medium rounded-2xl"
                />
              </div>
            </div>

            {/* Premium Category Filters */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`shrink-0 px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 border ${selectedCategory === null
                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-md shadow-neutral-900/20 hover:bg-neutral-800'
                      : 'glass-card text-neutral-600 hover:text-neutral-900 hover:border-neutral-300 bg-white'
                    }`}
                >
                  Todos
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`shrink-0 px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 border ${selectedCategory === category.id
                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-md shadow-neutral-900/20 hover:bg-neutral-800'
                        : 'glass-card text-neutral-600 hover:text-neutral-900 hover:border-neutral-300 bg-white'
                      }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Products Grid */}
          <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="glass-card rounded-2xl h-[420px] animate-pulse">
                    <div className="h-64 bg-neutral-200/50 rounded-t-2xl"></div>
                    <div className="p-6">
                      <div className="h-4 bg-neutral-200 rounded w-3/4 mb-4"></div>
                      <div className="h-4 bg-neutral-200 rounded w-5/6 mb-8"></div>
                      <div className="h-8 bg-neutral-200 rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <>
                <div className="mb-8 flex items-center gap-4">
                  <div className="h-px flex-1 bg-neutral-200"></div>
                  <span className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">
                    Mostrando {products.length} productos
                  </span>
                  <div className="h-px flex-1 bg-neutral-200"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onOpenModal={setSelectedProduct}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-20 glass-card rounded-[2rem] max-w-2xl mx-auto border-dashed border-2 mt-8">
                <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Package className="w-10 h-10 text-neutral-400" />
                </div>
                <h3 className="text-2xl font-bold text-neutral-900 mb-2 font-display">
                  No se encontraron productos
                </h3>
                <p className="text-neutral-500 mb-8 max-w-md mx-auto">
                  Prueba ajustando los filtros o realiza una nueva búsqueda para encontrar lo que necesitas.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory(null);
                  }}
                  className="inline-flex items-center justify-center bg-neutral-900 text-white px-8 py-4 rounded-xl font-semibold hover:bg-primary-600 transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/30 hover:-translate-y-1"
                >
                  Limpiar filtros y buscar
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}
