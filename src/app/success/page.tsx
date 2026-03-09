'use client';

import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import Link from 'next/link';
import { CheckCircle, Mail, Clock } from 'lucide-react';
import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart-store';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clearCart } = useCart();

  useEffect(() => {
    const status =
      searchParams.get('status') ||
      searchParams.get('collection_status') ||
      'approved';

    // Si MP redirigió aquí con pago rechazado/cancelado, mandamos a /failure
    if (status === 'rejected' || status === 'cancelled' || status === 'failure') {
      router.replace('/failure');
      return;
    }

    // MP puede volver con external_reference en la URL, o usamos el localStorage como fallback
    const externalReference =
      searchParams.get('external_reference') ||
      localStorage.getItem('mp_pending_identifier');

    if (!externalReference) return;

    localStorage.removeItem('mp_pending_identifier');

    // Limpiar el carrito ahora que el pago fue exitoso
    clearCart();

    fetch('/api/orders/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ external_reference: externalReference, status }),
    }).catch(console.error);
  }, [searchParams]);

  const isPending =
    searchParams.get('status') === 'pending' ||
    searchParams.get('collection_status') === 'pending';

  return (
    <div className="max-w-md w-full text-center">
      <div
        className={`${isPending ? 'bg-yellow-100' : 'bg-green-100'} rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 animate-scale-in`}
      >
        {isPending ? (
          <Clock className="w-12 h-12 text-yellow-600" />
        ) : (
          <CheckCircle className="w-12 h-12 text-green-600" />
        )}
      </div>

      <h1 className="font-display text-4xl font-bold text-neutral-900 mb-4">
        {isPending ? '¡Pago en proceso!' : '¡Pago Exitoso!'}
      </h1>

      <p className="text-lg text-neutral-600 mb-8">
        {isPending
          ? 'Tu pago está siendo procesado. Te notificaremos por email cuando se confirme.'
          : 'Tu pedido ha sido confirmado. Hemos enviado un correo electrónico con los detalles de tu compra.'}
      </p>

      <div className="bg-primary-50 border-l-4 border-primary-500 p-6 rounded-lg mb-8 text-left">
        <div className="flex items-start space-x-3">
          <Mail className="w-6 h-6 text-primary-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-neutral-900 mb-1">
              Revisa tu email
            </h3>
            <p className="text-sm text-neutral-700">
              Hemos enviado la confirmación del pedido a tu correo electrónico.
              Si no lo ves, revisa tu carpeta de spam.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Link
          href="/"
          className="block w-full bg-primary-500 text-white px-8 py-4 rounded-lg font-semibold hover:bg-primary-600 transition-colors"
        >
          Volver al inicio
        </Link>

        <Link
          href="/products"
          className="block w-full bg-neutral-100 text-neutral-700 px-8 py-4 rounded-lg font-semibold hover:bg-neutral-200 transition-colors"
        >
          Seguir comprando
        </Link>
      </div>

      <p className="text-sm text-neutral-500 mt-8">
        Si tienes alguna pregunta, contáctanos a{' '}
        {process.env.NEXT_PUBLIC_BUSINESS_EMAIL || 'contact@yourstore.com'}
      </p>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow flex items-center justify-center py-20 px-4">
        <Suspense fallback={<div className="text-neutral-500">Cargando...</div>}>
          <SuccessContent />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
