import type { Metadata, Viewport } from 'next'
import { Cairo } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

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
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  )
}

