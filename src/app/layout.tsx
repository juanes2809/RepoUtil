import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { ClerkProvider } from '@clerk/nextjs'
import FloatingWhatsApp from '@/components/ui/FloatingWhatsApp'

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_BUSINESS_NAME || 'Tu Tienda Colombia',
  description: 'Tienda online con los mejores productos de Colombia',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="es">
        <body>
          {children}
          <FloatingWhatsApp />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1c1917',
                color: '#fafaf9',
              },
              success: {
                iconTheme: {
                  primary: '#f5a438',
                  secondary: '#fafaf9',
                },
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  )
}
