'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import ProductCard from '@/components/shop/ProductCard';
import ProductModal from '@/components/shop/ProductModal';
import { Product, Category } from '@/types';
import { supabase } from '@/lib/supabase';
import { ArrowRight, Package, ShieldCheck, Zap } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [selectedCategory]);

  const [topProduct, setTopProduct] = useState<Product | null>(null);

  async function fetchData() {
    setLoading(true);

    // Fetch categories
    const { data: categoriesData } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (categoriesData) {
      setCategories(categoriesData);
    }

    // Fetch top selling product for hero section
    if (!topProduct) {
      const { data: topItems } = await supabase
        .from('order_items')
        .select('product_id, quantity');

      if (topItems && topItems.length > 0) {
        const salesMap: Record<string, number> = {};
        topItems.forEach(item => {
          if (item.product_id) {
            salesMap[item.product_id] = (salesMap[item.product_id] || 0) + item.quantity;
          }
        });
        const topId = Object.entries(salesMap).sort((a, b) => b[1] - a[1])[0]?.[0];
        if (topId) {
          const { data: topProd } = await supabase
            .from('products')
            .select('*, categories(*)')
            .eq('id', topId)
            .single();
          if (topProd) setTopProduct(topProd);
        }
      }
    }

    // Fetch products (many-to-many categories via product_categories join table)
    let query = supabase
      .from('products')
      .select('*, categories(*)')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (selectedCategory) {
      // Filter products that belong to the selected category via join table
      query = supabase
        .from('products')
        .select('*, categories!inner(*)')
        .eq('is_active', true)
        .eq('categories.id', selectedCategory)
        .order('created_at', { ascending: false });
    }

    const { data: productsData } = await query.limit(12);

    if (productsData) {
      setProducts(productsData);
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 selection:bg-primary-200 selection:text-primary-900">
      <Header />

      <main className="flex-grow pt-24 pb-12 overflow-hidden">
        {/* Animated Hero Section */}
        <section className="relative px-4 sm:px-6 lg:px-8 py-20 lg:py-32 rounded-[3rem] mx-4 lg:mx-8 mb-24 overflow-hidden shadow-2xl shadow-primary-500/10">
          <div className="absolute inset-0 mesh-bg opacity-100 z-0 object-cover mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-primary-900/40 to-accent-900/60 backdrop-blur-sm z-[1]"></div>

          <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="max-w-2xl animate-slide-up">
              <h1 className="font-display text-5xl md:text-7xl font-black mb-6 leading-[1.1] text-white drop-shadow-md tracking-tight text-balance">
                Descubre productos <span className="text-gradient inline-block animate-float">únicos</span>
              </h1>
              <p className="text-lg md:text-xl mb-10 text-primary-50 font-medium leading-relaxed max-w-xl text-balance">
                La mejor selección de productos premium con envíos a toda Colombia.
                Calidad garantizada y los mejores precios del mercado.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center space-x-2 bg-neutral-900 text-white px-8 py-4 rounded-full font-semibold hover:bg-neutral-800 transition-all duration-300 hover:shadow-xl hover:shadow-neutral-900/20 hover:-translate-y-1"
                >
                  <span>Explorar Catálogo</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="#features"
                  className="inline-flex items-center justify-center space-x-2 bg-white/60 backdrop-blur-md border border-white/40 text-neutral-900 px-8 py-4 rounded-full font-semibold hover:bg-white/80 transition-all duration-300"
                >
                  <span>Saber más</span>
                </Link>
              </div>
            </div>

            {/* Featured Product on right for large screens */}
            <div className="hidden lg:block relative w-[400px] animate-scale-in" style={{ animationDelay: '0.2s' }}>
              <div className="absolute inset-0 bg-gradient-to-tr from-primary-400 to-accent-300 rounded-[3rem] rotate-6 opacity-60 blur-2xl animate-pulse-slow"></div>
              <div className="relative z-20 translate-y-[-10px]">
                {(topProduct || products[0]) && (
                  <div className="relative">
                    <div className="absolute -top-6 -right-6 z-30 bg-gradient-to-r from-accent-500 to-rose-500 text-white font-black px-6 py-2 rounded-full shadow-xl shadow-rose-500/30 transform rotate-12 flex items-center gap-2 border-2 border-white/20 animate-bounce">
                      <Zap className="w-5 h-5" />
                      TOP VENTAS
                    </div>
                    <div className="transform transition-transform hover:scale-105 duration-500">
                      <ProductCard
                        product={topProduct || products[0]}
                        onOpenModal={setSelectedProduct}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Categories */}
        {categories.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div>
                <h2 className="text-3xl font-display font-bold text-neutral-900 hidden md:block">Categorías</h2>
                <p className="text-neutral-500 mt-2 hidden md:block">Explora nuestra cuidada selección</p>
              </div>
              <div className="flex flex-wrap gap-3 overflow-x-auto pb-4 md:pb-0 hide-scrollbar justify-start md:justify-end">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`shrink-0 px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 border ${selectedCategory === null
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-md shadow-neutral-900/20'
                    : 'glass-card text-neutral-600 hover:text-neutral-900 hover:border-neutral-300'
                    }`}
                >
                  Todos
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`shrink-0 px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 border ${selectedCategory === category.id
                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-md shadow-neutral-900/20'
                      : 'glass-card text-neutral-600 hover:text-neutral-900 hover:border-neutral-300'
                      }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Products Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onOpenModal={setSelectedProduct}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 glass-card rounded-[2rem] max-w-2xl mx-auto border-dashed border-2">
              <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Package className="w-10 h-10 text-neutral-400" />
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 mb-2 font-display">
                No hay productos disponibles
              </h3>
              <p className="text-neutral-500">
                Por favor, vuelve más tarde o intenta con otra categoría.
              </p>
            </div>
          )}
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 mx-4 lg:mx-8 glass-card rounded-[3rem] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-200/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-200/40 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <h2 className="text-4xl font-display font-black text-neutral-900 mb-4 tracking-tight">¿Por qué elegirnos?</h2>
              <p className="text-neutral-500 text-lg">Nos esforzamos por brindarte la mejor experiencia de compra en línea de principio a fin.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
              <div className="text-center p-8 bg-white/50 backdrop-blur-sm rounded-3xl border border-white/60 hover:-translate-y-2 transition-transform duration-300 shadow-sm hover:shadow-xl hover:shadow-primary-500/5">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm rotate-3">
                  <Zap className="w-8 h-8 text-primary-600 -rotate-3" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-neutral-900">Envíos Rápidos</h3>
                <p className="text-neutral-600 leading-relaxed font-medium">
                  Entrega en 1 día en tu ciudad y 5-6 días a nivel nacional con seguimiento en tiempo real.
                </p>
              </div>

              <div className="text-center p-8 bg-white/50 backdrop-blur-sm rounded-3xl border border-white/60 hover:-translate-y-2 transition-transform duration-300 shadow-sm hover:shadow-xl hover:shadow-primary-500/5">
                <div className="w-16 h-16 bg-gradient-to-br from-accent-100 to-accent-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm -rotate-3">
                  <ShieldCheck className="w-8 h-8 text-accent-600 rotate-3" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-neutral-900">Calidad Premium</h3>
                <p className="text-neutral-600 leading-relaxed font-medium">
                  Todos nuestros productos pasan por rigurosos controles de calidad certificados.
                </p>
              </div>

              <div className="text-center p-8 bg-white/50 backdrop-blur-sm rounded-3xl border border-white/60 hover:-translate-y-2 transition-transform duration-300 shadow-sm hover:shadow-xl hover:shadow-primary-500/5">
                <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm rotate-3">
                  <svg className="w-8 h-8 text-emerald-600 -rotate-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3 text-neutral-900">Pago Seguro</h3>
                <p className="text-neutral-600 leading-relaxed font-medium">
                  Transacciones encriptadas de extremo a extremo con múltiples métodos de pago fiables.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}
