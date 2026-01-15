import Link from 'next/link'
import { Phone, Mail, Globe, MessageCircle } from 'lucide-react'
import HeroCarousel from '@/components/HeroCarousel'
import ServicesSection from '@/components/ServicesSection'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">

      {/* Hero Carousel - Starts from top */}
      <div className="pt-6">
        <HeroCarousel />
      </div>

      {/* Services Section - بعد البنر مباشرة */}
      <ServicesSection />

      {/* Contact Section - أنيق ومدمج */}
      <section className="container mx-auto px-2 sm:px-3 md:px-4 py-4 sm:py-6 md:py-8 max-w-full overflow-x-hidden">
        <div className="text-center mb-5 sm:mb-6">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-2">تواصل معنا</h2>
          <div className="w-20 sm:w-24 h-0.5 bg-blue-600 rounded-full mx-auto"></div>
        </div>
        <div className="max-w-3xl mx-auto bg-white p-4 sm:p-6 rounded-xl shadow-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <a href="tel:+966541700017" className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition">
              <span className="text-xl sm:text-2xl">📱</span>
              <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-xs sm:text-sm mb-0.5">الهاتف</p>
                <p className="text-gray-600 text-xs truncate">+966541700017</p>
              </div>
            </a>
            <a href="https://wa.me/966541700017" target="_blank" className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-green-50 rounded-lg hover:bg-green-100 transition">
              <span className="text-xl sm:text-2xl">💬</span>
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-xs sm:text-sm mb-0.5">واتساب</p>
                <p className="text-gray-600 text-xs truncate">+966541700017</p>
              </div>
            </a>
            <a href="mailto:info@maidaa-sa.com" className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition">
              <span className="text-xl sm:text-2xl">✉️</span>
              <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-xs sm:text-sm mb-0.5">البريد الإلكتروني</p>
                <p className="text-gray-600 text-xs truncate">info@maidaa-sa.com</p>
              </div>
            </a>
            <a href="https://www.maidaa-sa.com" target="_blank" className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition">
              <span className="text-xl sm:text-2xl">🌐</span>
              <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-xs sm:text-sm mb-0.5">الموقع الإلكتروني</p>
                <p className="text-gray-600 text-xs truncate">www.maidaa-sa.com</p>
              </div>
            </a>
          </div>
          <div className="mt-4 sm:mt-6">
            <Link 
              href="/contact" 
              className="block w-full text-center px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs sm:text-sm font-semibold"
            >
              نموذج التواصل المباشر
            </Link>
          </div>
        </div>
      </section>

      {/* About Section - أنيق ومدمج */}
      <section className="bg-gray-50 py-6 sm:py-8 md:py-10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-5 sm:mb-6">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-2">نبذة عن المنصة</h2>
            <div className="w-16 sm:w-20 h-0.5 bg-blue-600 rounded-full mx-auto"></div>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
              <div className="space-y-5 sm:space-y-6 text-gray-700">
                <div>
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <span className="text-xl sm:text-2xl">✈️</span>
                    <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">تنظيم الزيارات</h3>
                  </div>
                  <p className="text-xs sm:text-sm md:text-base leading-relaxed">
                    نقدم منصة شاملة لتنظيم جميع أنواع الزيارات بما في ذلك الزيارات العائلية، العمرة، والسياحة. 
                    نساعدك في إتمام جميع الإجراءات بسهولة وسرعة.
                  </p>
                </div>
                <div className="border-t border-gray-200 pt-5 sm:pt-6">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <span className="text-xl sm:text-2xl">⚡</span>
                    <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">تسهيل الإجراءات</h3>
                  </div>
                  <p className="text-xs sm:text-sm md:text-base leading-relaxed">
                    نوفر لك جميع الخدمات اللازمة من تأشيرات، فنادق، نقل، وسياحة. 
                    كل ما تحتاجه في مكان واحد مع متابعة مستمرة لحالة طلبك.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6 sm:py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="mb-3 sm:mb-4 text-sm sm:text-base">© 2024 منصة خدمات السوريين - جميع الحقوق محفوظة</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-6 text-sm sm:text-base">
            <Link href="/terms" className="hover:text-blue-400 transition">الشروط والأحكام</Link>
            <Link href="/privacy" className="hover:text-blue-400 transition">الخصوصية</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

