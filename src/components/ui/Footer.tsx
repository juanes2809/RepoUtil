'use client';

import Link from 'next/link';
import { Mail, Phone } from 'lucide-react';

export default function Footer() {
  const businessName = process.env.NEXT_PUBLIC_BUSINESS_NAME || 'Tu Tienda';
  const businessEmail = process.env.NEXT_PUBLIC_BUSINESS_EMAIL || 'contact@yourstore.com';
  const businessPhone = process.env.NEXT_PUBLIC_BUSINESS_PHONE || '+57 300 123 4567';

  return (
    <footer className="bg-neutral-900 text-neutral-300 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3 className="font-display text-2xl font-bold text-white mb-4">
              {businessName}
            </h3>
            <p className="text-sm text-neutral-400">
              Tu tienda online de confianza en Colombia. Calidad garantizada y envíos a todo el país.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-white mb-4">Enlaces</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="hover:text-primary-400 transition-colors">
                  Inicio
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:text-primary-400 transition-colors">
                  Productos
                </Link>
              </li>
              <li>
                <Link href="/checkout" className="hover:text-primary-400 transition-colors">
                  Carrito
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white mb-4">Contacto</h4>
            <ul className="space-y-3">
              <li className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-primary-400" />
                <a href={`mailto:${businessEmail}`} className="hover:text-primary-400 transition-colors text-sm">
                  {businessEmail}
                </a>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-primary-400" />
                <a href={`tel:${businessPhone}`} className="hover:text-primary-400 transition-colors text-sm">
                  {businessPhone}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-neutral-800 mt-8 pt-8 text-center text-sm text-neutral-400">
          <p>© {new Date().getFullYear()} {businessName}. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
