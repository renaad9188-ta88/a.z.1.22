import type { Metadata, Viewport } from 'next'
import { Cairo } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import Header from '@/components/Header'

const cairo = Cairo({ 
  subsets: ['latin', 'arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cairo',
  display: 'swap', // تحسين تحميل الخط
  fallback: ['Cairo', 'Arial', 'sans-serif'], // fallback fonts
})

export const metadata: Metadata = {
  title: 'سوريا بلس (Syria Plus) خدمات - تنظيم الزيارات والحجوزات',
  description: 'منصة شاملة لتنظيم زيارات الإخوة السوريين إلى الأردن وتسهيل جميع الإجراءات',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  colorScheme: 'light', // إجبار Light Mode
  themeColor: '#ffffff', // لون ثيم فاتح
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" style={{ colorScheme: 'light' }}>
      <body className={cairo.className} style={{ colorScheme: 'light' }}>
        <Header />
        {/* Padding top matches fixed header height (header is taller due to back button) */}
        <div className="pt-20 sm:pt-24">
          {children}
        </div>
        <Toaster position="top-center" />
      </body>
    </html>
  )
}

