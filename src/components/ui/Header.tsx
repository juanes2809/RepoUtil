'use client';

import Link from 'next/link';
import { ShoppingCart, Menu, X, Package } from 'lucide-react';
import { useCart } from '@/lib/cart-store';
import { useState, useEffect } from 'react';
import { UserButton, SignInButton, useUser } from '@clerk/nextjs';

export default function Header() {
  const itemCount = useCart((state) => state.getItemCount());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="fixed top-4 left-4 right-4 z-50 glass-card rounded-2xl transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link
            href="/"
            className="text-2xl font-display font-black tracking-tight text-gradient hover:scale-105 transition-transform duration-300"
          >
            {process.env.NEXT_PUBLIC_BUSINESS_NAME || 'Tu Tienda'}
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-10">
            <Link
              href="/"
              className="text-neutral-700 hover:text-primary-600 transition-colors font-medium text-sm tracking-wide"
            >
              Inicio
            </Link>
            <Link
              href="/products"
              className="text-neutral-700 hover:text-primary-600 transition-colors font-medium text-sm tracking-wide"
            >
              Productos
            </Link>

            {/* Mis Pedidos — visible solo si está autenticado */}
            {isLoaded && isSignedIn && (
              <Link
                href="/mis-pedidos"
                className="flex items-center gap-2 text-neutral-700 hover:text-primary-600 transition-colors font-medium text-sm tracking-wide"
              >
                <Package className="w-4 h-4" />
                Mis Pedidos
              </Link>
            )}

            {/* Cart */}
            <Link href="/checkout" className="relative group">
              <div className="flex items-center space-x-2 text-neutral-700 group-hover:text-primary-600 transition-colors p-2 rounded-full group-hover:bg-primary-50">
                <ShoppingCart className="w-5 h-5" />
                {mounted && itemCount > 0 && (
                  <span className="absolute 0 -right-1 -top-1 bg-primary-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-scale-in">
                    {itemCount}
                  </span>
                )}
              </div>
            </Link>

            {/* Auth */}
            {isLoaded && (
              isSignedIn ? (
                <div className="pl-4 border-l border-neutral-200">
                  <UserButton afterSignOutUrl="/" />
                </div>
              ) : (
                <SignInButton mode="modal">
                  <button className="bg-neutral-900 hover:bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 shadow-md hover:shadow-primary-500/25">
                    Entrar
                  </button>
                </SignInButton>
              )
            )}
          </nav>

          {/* Mobile: right side */}
          <div className="md:hidden flex items-center gap-4">
            {isLoaded && (
              isSignedIn ? (
                <UserButton afterSignOutUrl="/" />
              ) : (
                <SignInButton mode="modal">
                  <button className="text-sm font-semibold text-primary-600">
                    Entrar
                  </button>
                </SignInButton>
              )
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-neutral-700 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-6 border-t border-neutral-200/50 animate-slide-down">
            <nav className="flex flex-col space-y-6">
              <Link
                href="/"
                className="text-neutral-700 hover:text-primary-600 transition-colors font-medium px-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Inicio
              </Link>
              <Link
                href="/products"
                className="text-neutral-700 hover:text-primary-600 transition-colors font-medium px-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Productos
              </Link>
              {isLoaded && isSignedIn && (
                <Link
                  href="/mis-pedidos"
                  className="flex items-center gap-2 text-neutral-700 hover:text-primary-600 transition-colors font-medium px-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Package className="w-5 h-5" />
                  Mis Pedidos
                </Link>
              )}
              <Link
                href="/checkout"
                className="flex items-center space-x-3 text-neutral-700 hover:text-primary-600 transition-colors font-medium px-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="relative">
                  <ShoppingCart className="w-5 h-5" />
                  {mounted && itemCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-primary-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {itemCount}
                    </span>
                  )}
                </div>
                <span>Carrito</span>
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
