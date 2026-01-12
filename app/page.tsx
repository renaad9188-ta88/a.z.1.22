import Link from 'next/link'
import { Phone, Mail, Globe, MessageCircle } from 'lucide-react'
import HeroCarousel from '@/components/HeroCarousel'
import Header from '@/components/Header'
import ServicesSection from '@/components/ServicesSection'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header with user authentication */}
      <Header />

      {/* Hero Carousel - Starts from top */}
      <div className="pt-6">
        <HeroCarousel />
      </div>

      {/* Services Section - بعد البنر مباشرة */}
      <ServicesSection />

      {/* Contact Section */}
      <section className="container mx-auto px-4 py-8 sm:py-12 md:py-16">
        <div className="text-center mb-6 sm:mb-8 md:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-3 sm:mb-4">تواصل معنا</h2>
          <div className="w-20 sm:w-24 h-1 bg-blue-600 mx-auto"></div>
        </div>
        <div className="max-w-2xl mx-auto bg-white p-4 sm:p-6 md:p-8 rounded-lg shadow-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
            <a href="tel:+966541700017" className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition">
              <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-sm sm:text-base">الهاتف</p>
                <p className="text-gray-600 text-xs sm:text-sm truncate">+966541700017</p>
              </div>
            </a>
            <a href="https://wa.me/966541700017" target="_blank" className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-green-50 rounded-lg hover:bg-green-100 transition">
              <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-sm sm:text-base">واتساب</p>
                <p className="text-gray-600 text-xs sm:text-sm truncate">+966541700017</p>
              </div>
            </a>
            <a href="mailto:info@maidaa-sa.com" className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition">
              <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-sm sm:text-base">البريد الإلكتروني</p>
                <p className="text-gray-600 text-xs sm:text-sm truncate">info@maidaa-sa.com</p>
              </div>
            </a>
            <a href="https://www.maidaa-sa.com" target="_blank" className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition">
              <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-sm sm:text-base">الموقع الإلكتروني</p>
                <p className="text-gray-600 text-xs sm:text-sm truncate">www.maidaa-sa.com</p>
              </div>
            </a>
          </div>
          <div className="mt-6 sm:mt-8">
            <Link 
              href="/contact" 
              className="block w-full text-center px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm sm:text-base font-semibold"
            >
              نموذج التواصل المباشر
            </Link>
          </div>
        </div>
      </section>

      {/* About Section - Before Footer */}
      <section className="bg-gray-50 py-6 sm:py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-4 sm:mb-6 md:mb-8">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-2 sm:mb-3">نبذة عن المنصة</h2>
            <div className="w-16 sm:w-20 h-1 bg-blue-600 mx-auto"></div>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="bg-white p-4 sm:p-6 md:p-8 rounded-lg shadow-md">
              <div className="space-y-4 sm:space-y-4 md:space-y-6 text-gray-700">
                <div>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-2 sm:mb-3">تنظيم الزيارات</h3>
                  <p className="text-sm sm:text-base md:text-lg leading-relaxed">
                    نقدم منصة شاملة لتنظيم جميع أنواع الزيارات بما في ذلك الزيارات العائلية، العمرة، والسياحة. 
                    نساعدك في إتمام جميع الإجراءات بسهولة وسرعة.
                  </p>
                </div>
                <div className="border-t border-gray-200 pt-4 sm:pt-4 md:pt-6">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-2 sm:mb-3">تسهيل الإجراءات</h3>
                  <p className="text-sm sm:text-base md:text-lg leading-relaxed">
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

