'use client';

import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import Link from 'next/link';
import { XCircle } from 'lucide-react';
import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function FailureContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Marcar el pedido como cancelado en la base de datos
    // Esto es un respaldo en caso de que el webhook de MercadoPago no llegue
    const externalReference =
      searchParams.get('external_reference') ||
      localStorage.getItem('mp_pending_identifier');

    if (!externalReference) return;

    localStorage.removeItem('mp_pending_identifier');

    const status =
      searchParams.get('status') ||
      searchParams.get('collection_status') ||
      'rejected';

    fetch('/api/orders/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ external_reference: externalReference, status }),
    }).catch(console.error);
  }, [searchParams]);

  return (
    <div className="max-w-md w-full text-center">
      <div className="bg-red-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 animate-scale-in">
        <XCircle className="w-12 h-12 text-red-600" />
      </div>

      <h1 className="font-display text-4xl font-bold text-neutral-900 mb-4">
        Pago no procesado
      </h1>

      <p className="text-lg text-neutral-600 mb-8">
        Tu pago no se pudo completar. <strong>Tu pedido no fue realizado</strong> y no se realizó ningún cargo.
      </p>

      <div className="bg-neutral-50 border border-neutral-200 p-6 rounded-lg mb-8 text-left">
        <h3 className="font-semibold text-neutral-900 mb-3">
          ¿Qué puedes hacer?
        </h3>
        <ul className="space-y-2 text-sm text-neutral-700">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Verifica que tu método de pago tenga fondos suficientes</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Intenta con otro método de pago</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Contacta a tu banco si el problema persiste</span>
          </li>
        </ul>
      </div>

      <div className="space-y-3">
        <Link
          href="/checkout"
          className="block w-full bg-primary-500 text-white px-8 py-4 rounded-lg font-semibold hover:bg-primary-600 transition-colors"
        >
          Intentar de nuevo
        </Link>

        <Link
          href="/products"
          className="block w-full bg-neutral-100 text-neutral-700 px-8 py-4 rounded-lg font-semibold hover:bg-neutral-200 transition-colors"
        >
          Ver productos
        </Link>
      </div>

      <p className="text-sm text-neutral-500 mt-8">
        ¿Necesitas ayuda? Contáctanos a{' '}
        {process.env.NEXT_PUBLIC_BUSINESS_EMAIL || 'contact@yourstore.com'}
      </p>
    </div>
  );
}

export default function FailurePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow flex items-center justify-center py-20 px-4">
        <Suspense fallback={<div className="text-neutral-500">Cargando...</div>}>
          <FailureContent />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
