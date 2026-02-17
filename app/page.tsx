import Link from 'next/link'
import { Phone, MessageCircle, Plane } from 'lucide-react'
import HeroCarousel from '@/components/HeroCarousel'
import ServicesSection from '@/components/ServicesSection'
import QRCodeShare from '@/components/QRCodeShare'
import InvitePlatformButton from '@/components/InvitePlatformButton'
import WelcomeGuide from '@/components/WelcomeGuide'
import HelpFloatingButton from '@/components/HelpFloatingButton'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <WelcomeGuide />
      <HelpFloatingButton />

      {/* Hero Carousel - Starts from top */}
      <HeroCarousel />

      {/* Services Section - بعد البنر مباشرة */}
      <ServicesSection />

      {/* Contact Section - أنيق ومدمج */}
      <section className="container mx-auto px-2 sm:px-3 md:px-4 py-4 sm:py-6 md:py-8 max-w-full overflow-x-hidden">
        <div className="text-center mb-5 sm:mb-6">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-2">تواصل معنا</h2>
          <div className="w-20 sm:w-24 h-0.5 bg-blue-600 rounded-full mx-auto"></div>
        </div>
        <div className="max-w-3xl mx-auto bg-white p-4 sm:p-6 rounded-xl shadow-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
            <a href="https://wa.me/962798905595" target="_blank" className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-green-50 rounded-lg hover:bg-green-100 transition">
              <span className="text-xl sm:text-2xl">💬</span>
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-xs sm:text-sm mb-0.5">واتساب</p>
                <p className="text-gray-600 text-xs truncate">00962798905595</p>
              </div>
            </a>
            <a href="tel:00962798905595" className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition">
              <span className="text-xl sm:text-2xl">📱</span>
              <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-xs sm:text-sm mb-0.5">الهاتف</p>
                <p className="text-gray-600 text-xs truncate">00962798905595</p>
              </div>
            </a>
          </div>
          <div className="mt-4 sm:mt-6 space-y-3">
            <Link 
              href="/contact" 
              className="block w-full text-center px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs sm:text-sm font-semibold"
            >
              نموذج التواصل المباشر
            </Link>
            
            {/* QR Code Section */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-right">
                  <p className="text-sm sm:text-base font-semibold text-gray-700 mb-1">
                    شارك المنصة بسهولة
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500">
                    امسح QR Code للوصول السريع
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <InvitePlatformButton title="سوريا بلس (Syria Plus) خدمات" />
                  <QRCodeShare title="سوريا بلس (Syria Plus) خدمات" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Promotional Section - خدمات الفيز والتأشيرات */}
        <div className="max-w-4xl mx-auto mt-4 sm:mt-6 md:mt-8 px-2 sm:px-4">
          <div className="group relative bg-gradient-to-br from-red-50 to-orange-50 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border-2 border-red-200">
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-orange-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
            
            {/* Content */}
            <div className="relative p-4 sm:p-6 md:p-8">
              <div className="flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-4 sm:gap-5 md:gap-6">
                {/* Icon and Emoji */}
                <div className="flex items-center justify-center sm:justify-start gap-3 sm:gap-4 flex-shrink-0">
                  <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl transform group-hover:scale-110 transition-transform duration-300">
                    🛂
                  </span>
                  <div className="bg-red-50 w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-md">
                    <Plane className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-red-600" />
                  </div>
                </div>

                {/* Text Content */}
                <div className="flex-1 w-full text-center sm:text-right">
                  <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold text-gray-800 mb-2 sm:mb-3 leading-tight">
                    خدمات الفيز والتأشيرات
                  </h3>
                  <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-700 mb-3 sm:mb-4 md:mb-5 leading-relaxed">
                    فيز وتأشيرات للسعودية ودول أخرى - خدمات خاصة - قدوم خاص وسيارة خاصة - قدوم مطار (طيران) - حجوزات تذاكر طيران - رحلات سياحية وعمرة
                  </p>
                  
                  {/* Contact Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center sm:justify-start">
                    <a
                      href="https://wa.me/962798905595"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold text-xs sm:text-sm md:text-base shadow-md hover:shadow-lg flex-1 sm:flex-initial min-w-[120px]"
                    >
                      <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      <span>واتساب</span>
                    </a>
                    <a
                      href="tel:00962798905595"
                      className="flex items-center justify-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-xs sm:text-sm md:text-base shadow-md hover:shadow-lg flex-1 sm:flex-initial min-w-[120px]"
                    >
                      <Phone className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      <span>اتصال</span>
                    </a>
                    <Link
                      href="/services/visa-services"
                      className="flex items-center justify-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold text-xs sm:text-sm md:text-base shadow-md hover:shadow-lg flex-1 sm:flex-initial min-w-[120px]"
                    >
                      <span>تقديم طلب</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Border */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 sm:h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-600"></div>
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

      {/* How It Works Section */}
      <section className="bg-white py-6 sm:py-8 md:py-10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-2">
              كيف نبدأ؟
            </h2>
            <div className="w-20 sm:w-24 h-0.5 bg-gradient-to-r from-blue-500 to-green-500 rounded-full mx-auto mb-2"></div>
            <p className="text-gray-600 text-xs sm:text-sm">خطوات بسيطة لتنظيم قدومك</p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 md:gap-6">
              {/* Step 1 */}
              <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-all">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                  <span className="text-lg sm:text-xl">1️⃣</span>
                </div>
                <div className="text-right sm:text-center flex-1 sm:flex-initial">
                  <h3 className="font-bold text-sm sm:text-base mb-1 text-gray-800">اختر الخدمة</h3>
                  <p className="text-xs sm:text-sm text-gray-600">زيارة، عمرة، فيز، أو خدمات أخرى</p>
                </div>
              </div>
              
              {/* Arrow */}
              <div className="hidden sm:block text-gray-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              
              {/* Step 2 */}
              <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto bg-gradient-to-br from-green-50 to-green-100 rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-all">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                  <span className="text-lg sm:text-xl">2️⃣</span>
                </div>
                <div className="text-right sm:text-center flex-1 sm:flex-initial">
                  <h3 className="font-bold text-sm sm:text-base mb-1 text-gray-800">املأ البيانات</h3>
                  <p className="text-xs sm:text-sm text-gray-600">معلومات بسيطة وصورة الجواز</p>
                </div>
              </div>
              
              {/* Arrow */}
              <div className="hidden sm:block text-gray-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              
              {/* Step 3 */}
              <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-all">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                  <span className="text-lg sm:text-xl">3️⃣</span>
                </div>
                <div className="text-right sm:text-center flex-1 sm:flex-initial">
                  <h3 className="font-bold text-sm sm:text-base mb-1 text-gray-800">تابع رحلتك</h3>
                  <p className="text-xs sm:text-sm text-gray-600">تتبع مباشر على الخريطة</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6 sm:py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="mb-3 sm:mb-4 text-sm sm:text-base">© 2026 سوريا بلس (Syria Plus) خدمات - جميع الحقوق محفوظة</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-6 text-sm sm:text-base">
            <Link href="/terms" className="hover:text-blue-400 transition">الشروط والأحكام</Link>
            <Link href="/privacy" className="hover:text-blue-400 transition">الخصوصية</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

