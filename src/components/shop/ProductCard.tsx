'use client';

import { Product } from '@/types';
import Image from 'next/image';
import { ShoppingCart, Eye } from 'lucide-react';
import { useCart } from '@/lib/cart-store';
import toast from 'react-hot-toast';

interface ProductCardProps {
  product: Product;
  onOpenModal?: (product: Product) => void;
}

export default function ProductCard({ product, onOpenModal }: ProductCardProps) {
  const addItem = useCart((state) => state.addItem);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.stock <= 0) {
      toast.error('Producto agotado');
      return;
    }
    addItem(product, 1);
    toast.success('Añadido al carrito');
  };

  return (
    <div
      className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-neutral-100 cursor-pointer hover:-translate-y-1"
      onClick={() => onOpenModal?.(product)}
    >
      {/* Image */}
      <div className="relative h-72 bg-neutral-50 overflow-hidden">
        {product.main_image ? (
          <Image
            src={product.main_image}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-neutral-300">
            <ShoppingCart className="w-16 h-16" />
          </div>
        )}

        {/* Stock badge */}
        {product.stock <= 0 && (
          <div className="absolute top-4 right-4 bg-red-500/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold tracking-wide">
            AGOTADO
          </div>
        )}

        {product.stock > 0 && product.stock <= 5 && (
          <div className="absolute top-4 right-4 bg-orange-500/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold tracking-wide shadow-lg shadow-orange-500/20">
            ¡ÚLTIMOS {product.stock}!
          </div>
        )}

        {/* Quick view overlay */}
        <div className="absolute inset-0 bg-neutral-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <span className="bg-white/95 backdrop-blur-md text-neutral-900 px-6 py-3 rounded-full text-sm font-semibold shadow-2xl flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
            <Eye className="w-4 h-4" />
            Vista rápida
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors font-display tracking-tight leading-snug">
          {product.name}
        </h3>

        <div className="flex items-end justify-between mt-auto">
          <div>
            <p className="text-xs text-neutral-400 font-medium mb-1">Precio</p>
            <p className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-accent-500">
              ${product.price.toLocaleString('es-CO')}
            </p>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={product.stock <= 0}
            className="relative overflow-hidden bg-neutral-900 hover:bg-primary-600 text-white w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group/btn hover:shadow-lg hover:shadow-primary-500/30 hover:w-32"
          >
            <div className="absolute inset-0 flex items-center justify-center w-full h-full group-hover/btn:opacity-0 transition-opacity">
              <ShoppingCart className="w-5 h-5 pointer-events-none" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center space-x-2 opacity-0 group-hover/btn:opacity-100 transition-opacity">
              <ShoppingCart className="w-4 h-4" />
              <span className="text-sm font-semibold">Añadir</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
