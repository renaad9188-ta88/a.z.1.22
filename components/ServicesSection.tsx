'use client'

import Link from 'next/link'
import { Calendar, Building2, GraduationCap, Plane, ArrowLeft } from 'lucide-react'
import HomeTransportMap from './HomeTransportMap'
import HomeCounters from './HomeCounters'
import HomeTripStatusRow from './HomeTripStatusRow'

const services = [
  {
    id: 'jordan-visit',
    title: 'خدمات الزيارات السورية للأردن',
    description: 'زيارة الأردن لمدة شهر - تنظيم جميع الإجراءات',
    icon: Calendar,
    emoji: '🇯🇴',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
    href: '/services/jordan-visit',
  },
  {
    id: 'embassy-appointment',
    title: 'خدمات مقابلة السفارة',
    description: 'حجز مواعيد السفارة وتنظيم جميع المستندات المطلوبة',
    icon: Building2,
    emoji: '🏛️',
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50',
    iconColor: 'text-green-600',
    href: '/services/embassy-appointment',
  },
  {
    id: 'goethe-exam',
    title: 'خدمة تقديم لامتحان جوته',
    description: 'التسجيل في امتحان جوته وتنظيم جميع الإجراءات',
    icon: GraduationCap,
    emoji: '🎓',
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    iconColor: 'text-purple-600',
    href: '/services/goethe-exam',
  },
  {
    id: 'visa-services',
    title: 'خدمات الفيز والتأشيرات والرحلات',
    description: 'فيز وتأشيرات للسعودية ودول أخرى - رحلات سياحية وعمرة',
    icon: Plane,
    emoji: '🛂',
    color: 'from-red-500 to-orange-600',
    bgColor: 'bg-red-50',
    iconColor: 'text-red-600',
    href: '/services/visa-services',
  },
]

export default function ServicesSection() {
  return (
    <section className="bg-gradient-to-b from-white to-gray-50 py-6 sm:py-8 md:py-10">
      <div className="container mx-auto px-4">
        {/* Counters above the map */}
        <HomeCounters />

        {/* Map under counters */}
        <div id="map" className="mb-2 sm:mb-3 scroll-mt-20">
          <HomeTransportMap />
        </div>

        {/* Trip status row directly under the map (and above "خدماتنا") */}
        <div className="mb-6 sm:mb-8">
          <HomeTripStatusRow />
        </div>

        {/* Header - أنيق ومدمج */}
        <div className="text-center mb-5 sm:mb-6">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-2">
            خدماتنا
          </h2>
          <div className="w-20 sm:w-24 h-0.5 bg-gradient-to-r from-red-500 via-yellow-400 to-green-600 rounded-full mx-auto mb-3"></div>
          <p className="text-xs sm:text-sm text-gray-600 max-w-xl mx-auto">
            نقدم لك مجموعة شاملة من الخدمات لتسهيل جميع إجراءاتك
          </p>
        </div>

        {/* Services Grid - متلاصقة وأنيقة */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-6xl mx-auto">
          {services.map((service) => {
            const Icon = service.icon
            return (
              <Link
                key={service.id}
                href={service.href}
                className="group relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1 border border-gray-100 hover:border-gray-200"
              >
                {/* Gradient Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                
                {/* Content - مدمج وأنيق */}
                <div className="relative p-4 sm:p-5">
                  {/* Emoji + Icon - متلاصقين بشكل جميل */}
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    {/* Emoji صغير */}
                    <span className="text-2xl sm:text-3xl transform group-hover:scale-110 transition-transform duration-300">
                      {service.emoji}
                    </span>
                    {/* Icon Container - صغير ومدمج */}
                    <div className={`${service.bgColor} w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                      <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${service.iconColor}`} />
                    </div>
                  </div>

                  {/* Title - صغير وأنيق */}
                  <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-extrabold text-gray-800 mb-1.5 sm:mb-2 group-hover:text-blue-600 transition-colors leading-tight">
                    {service.title}
                  </h3>

                  {/* Description - صغير */}
                  <p className="text-sm sm:text-base md:text-lg text-gray-600 mb-3 sm:mb-4 leading-relaxed line-clamp-2">
                    {service.description}
                  </p>

                  {/* Arrow - صغير */}
                  <div className="flex items-center text-sm sm:text-base md:text-lg font-bold text-gray-700 group-hover:text-blue-600 transition-colors">
                    <span>ابدأ الآن</span>
                    <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Bottom Border - رفيع */}
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${service.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300`}></div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
