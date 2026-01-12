import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="text-center px-4">
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-gray-800 mb-3 sm:mb-4">404</h1>
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-600 mb-3 sm:mb-4">الصفحة غير موجودة</h2>
        <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">عذراً، الصفحة التي تبحث عنها غير موجودة.</p>
        <Link
          href="/"
          className="inline-block px-5 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm sm:text-base font-semibold"
        >
          العودة للصفحة الرئيسية
        </Link>
      </div>
    </div>
  )
}

