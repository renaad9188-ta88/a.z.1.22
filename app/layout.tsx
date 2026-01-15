import type { Metadata, Viewport } from 'next'
import { Cairo } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import Header from '@/components/Header'

const cairo = Cairo({ 
  subsets: ['latin', 'arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cairo',
})

export const metadata: Metadata = {
  title: 'منصة خدمات السوريين - تنظيم الزيارات والحجوزات',
  description: 'منصة شاملة لتنظيم زيارات الإخوة السوريين إلى الأردن وتسهيل جميع الإجراءات',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className={cairo.className}>
        <Header />
        <div className="pt-12 sm:pt-14">
          {children}
        </div>
        <Toaster position="top-center" />
      </body>
    </html>
  )
}

