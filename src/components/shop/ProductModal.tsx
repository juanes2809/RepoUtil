'use client';

import { Product } from '@/types';
import Image from 'next/image';
import { X, ShoppingCart, Minus, Plus, Package } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useCart } from '@/lib/cart-store';
import toast from 'react-hot-toast';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
}

export default function ProductModal({ product, onClose }: ProductModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [currentImage, setCurrentImage] = useState(0);
  const addItem = useCart((state) => state.addItem);

  useEffect(() => {
    if (product) {
      setQuantity(1);
      setCurrentImage(0);
    }
  }, [product]);

  useEffect(() => {
    if (product) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [product]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!product) return null;

  const allImages = [
    ...(product.main_image ? [product.main_image] : []),
    ...(product.images || []),
  ];

  const handleAddToCart = () => {
    if (product.stock <= 0) {
      toast.error('Producto agotado');
      return;
    }
    addItem(product, quantity);
    toast.success(
      quantity > 1
        ? `${quantity} unidades añadidas al carrito`
        : 'Añadido al carrito'
    );
    onClose();
  };

  const decreaseQty = () => setQuantity((prev) => Math.max(1, prev - 1));
  const increaseQty = () =>
    setQuantity((prev) => Math.min(product.stock, prev + 1));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full shadow-md hover:bg-neutral-100 transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Image Gallery */}
          <div className="bg-neutral-100 rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none overflow-hidden flex flex-col">
            <div className="relative h-72 md:h-80 flex-shrink-0">
              {allImages.length > 0 ? (
                <Image
                  src={allImages[currentImage]}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-neutral-400">
                  <Package className="w-20 h-20" />
                </div>
              )}

              {product.stock <= 0 && (
                <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  Agotado
                </div>
              )}
              {product.stock > 0 && product.stock <= 5 && (
                <div className="absolute top-4 left-4 bg-primary-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  ¡Últimos {product.stock}!
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImage(idx)}
                    className={`relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                      currentImage === idx
                        ? 'border-primary-500 scale-105'
                        : 'border-transparent hover:border-neutral-300'
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`Imagen ${idx + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="p-6 flex flex-col justify-between">
            <div>
              {product.categories && product.categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-1">
                  {product.categories.map(cat => (
                    <span key={cat.id} className="text-xs font-semibold text-primary-500 uppercase tracking-wider bg-primary-50 px-2 py-0.5 rounded-full">
                      {cat.name}
                    </span>
                  ))}
                </div>
              )}
              <h2 className="text-2xl font-bold text-neutral-900 mt-1 mb-3 leading-tight">
                {product.name}
              </h2>

              {product.description && (
                <p className="text-neutral-600 text-sm leading-relaxed mb-4">
                  {product.description}
                </p>
              )}

              {product.sku && (
                <p className="text-xs text-neutral-400 mb-4">
                  SKU: {product.sku}
                </p>
              )}

              <div className="mb-4">
                <p className="text-3xl font-bold text-primary-500">
                  ${product.price.toLocaleString('es-CO')}
                </p>
                <p className="text-xs text-neutral-500">COP</p>
              </div>

              {product.stock > 0 ? (
                <p className="text-sm text-neutral-600 mb-4">
                  Disponible:{' '}
                  <span className="font-semibold text-neutral-900">
                    {product.stock} unidades
                  </span>
                </p>
              ) : (
                <p className="text-sm text-red-500 font-medium mb-4">
                  Sin stock disponible
                </p>
              )}
            </div>

            {/* Quantity + Add to cart */}
            <div className="space-y-4 mt-4">
              {product.stock > 0 && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Cantidad
                  </label>
                  <div className="flex items-center border border-neutral-300 rounded-lg w-fit">
                    <button
                      onClick={decreaseQty}
                      disabled={quantity <= 1}
                      className="px-4 py-3 hover:bg-neutral-100 disabled:opacity-40 transition-colors rounded-l-lg"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-6 py-3 font-semibold text-lg min-w-[3rem] text-center select-none">
                      {quantity}
                    </span>
                    <button
                      onClick={increaseQty}
                      disabled={quantity >= product.stock}
                      className="px-4 py-3 hover:bg-neutral-100 disabled:opacity-40 transition-colors rounded-r-lg"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
                className="w-full bg-primary-500 hover:bg-primary-600 text-white py-4 rounded-xl flex items-center justify-center gap-3 font-semibold text-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <ShoppingCart className="w-6 h-6" />
                {product.stock <= 0
                  ? 'Agotado'
                  : `Añadir al carrito • $${(product.price * quantity).toLocaleString('es-CO')}`}
              </button>

              <p className="text-xs text-center text-neutral-400">
                Total a pagar:{' '}
                <span className="font-semibold text-neutral-600">
                  ${(product.price * quantity).toLocaleString('es-CO')} COP
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
