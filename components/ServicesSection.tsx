'use client'

import Link from 'next/link'
import { Calendar, Building2, GraduationCap, Plus, ArrowLeft } from 'lucide-react'

const services = [
  {
    id: 'jordan-visit',
    title: 'خدمات الزيارات السورية للأردن',
    description: 'زيارة الأردن لمدة شهر - تنظيم جميع الإجراءات',
    icon: Calendar,
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
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    iconColor: 'text-purple-600',
    href: '/services/goethe-exam',
  },
  {
    id: 'other',
    title: 'خدمات أخرى',
    description: 'اطلب خدمة مخصصة أو تواصل معنا مباشرة',
    icon: Plus,
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50',
    iconColor: 'text-orange-600',
    href: '/services/other',
  },
]

export default function ServicesSection() {
  return (
    <section className="bg-gradient-to-b from-white to-gray-50 py-8 sm:py-12 md:py-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 mb-3 sm:mb-4">
            خدماتنا
          </h2>
          <div className="w-24 sm:w-32 h-1 bg-gradient-to-r from-red-500 via-yellow-400 to-green-600 rounded-full mx-auto mb-4"></div>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
            نقدم لك مجموعة شاملة من الخدمات لتسهيل جميع إجراءاتك
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8 max-w-7xl mx-auto">
          {services.map((service) => {
            const Icon = service.icon
            return (
              <Link
                key={service.id}
                href={service.href}
                className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-2"
              >
                {/* Gradient Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                
                {/* Content */}
                <div className="relative p-6 sm:p-8">
                  {/* Icon */}
                  <div className={`${service.bgColor} w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-8 h-8 sm:w-10 sm:h-10 ${service.iconColor}`} />
                  </div>

                  {/* Title */}
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-2 sm:mb-3 group-hover:text-blue-600 transition-colors">
                    {service.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 leading-relaxed">
                    {service.description}
                  </p>

                  {/* Arrow */}
                  <div className="flex items-center text-sm sm:text-base font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">
                    <span>ابدأ الآن</span>
                    <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Bottom Border */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${service.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300`}></div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

