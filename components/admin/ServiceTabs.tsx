'use client'

import { Plane, GraduationCap, Building2, Ticket, Calendar, MapPin, FileText } from 'lucide-react'

export type ServiceType = 'all' | 'visit' | 'goethe' | 'embassy' | 'visa' | 'umrah' | 'tourism' | 'other'

interface ServiceTab {
  id: ServiceType
  label: string
  icon: any
  bgColor: string
  textColor: string
  borderColor: string
  hoverBgColor: string
  iconBg: string
}

interface ServiceTabsProps {
  selectedService: ServiceType
  onServiceChange: (service: ServiceType) => void
  serviceCounts?: Partial<Record<ServiceType, number>>
}

export default function ServiceTabs({ selectedService, onServiceChange, serviceCounts = {} }: ServiceTabsProps) {
  const services: ServiceTab[] = [
    {
      id: 'all',
      label: 'الكل',
      icon: FileText,
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-700',
      borderColor: 'border-gray-300',
      hoverBgColor: 'hover:bg-gray-100',
      iconBg: 'bg-gray-100',
    },
    {
      id: 'visit',
      label: 'الزيارات',
      icon: Plane,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-300',
      hoverBgColor: 'hover:bg-blue-100',
      iconBg: 'bg-blue-100',
    },
    {
      id: 'goethe',
      label: 'جوته',
      icon: GraduationCap,
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-700',
      borderColor: 'border-indigo-300',
      hoverBgColor: 'hover:bg-indigo-100',
      iconBg: 'bg-indigo-100',
    },
    {
      id: 'embassy',
      label: 'السفارة',
      icon: Building2,
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
      borderColor: 'border-amber-300',
      hoverBgColor: 'hover:bg-amber-100',
      iconBg: 'bg-amber-100',
    },
    {
      id: 'visa',
      label: 'الفيز',
      icon: Ticket,
      bgColor: 'bg-cyan-50',
      textColor: 'text-cyan-700',
      borderColor: 'border-cyan-300',
      hoverBgColor: 'hover:bg-cyan-100',
      iconBg: 'bg-cyan-100',
    },
    {
      id: 'umrah',
      label: 'العمرة',
      icon: Calendar,
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      borderColor: 'border-green-300',
      hoverBgColor: 'hover:bg-green-100',
      iconBg: 'bg-green-100',
    },
    {
      id: 'tourism',
      label: 'السياحة',
      icon: MapPin,
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700',
      borderColor: 'border-purple-300',
      hoverBgColor: 'hover:bg-purple-100',
      iconBg: 'bg-purple-100',
    },
    {
      id: 'other',
      label: 'أخرى',
      icon: FileText,
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-700',
      borderColor: 'border-gray-300',
      hoverBgColor: 'hover:bg-gray-100',
      iconBg: 'bg-gray-100',
    },
  ]

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-3 sm:p-4 mb-4 sm:mb-6">
      <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 mb-3 sm:mb-4 px-2">
        الخدمات
      </h2>
      <div className="flex flex-wrap gap-2 sm:gap-3">
        {services.map((service) => {
          const Icon = service.icon
          const isSelected = selectedService === service.id
          const count = serviceCounts[service.id] || 0

          return (
            <button
              key={service.id}
              type="button"
              onClick={() => onServiceChange(service.id)}
              className={`
                ${service.bgColor}
                ${service.hoverBgColor}
                ${isSelected ? `${service.borderColor} border-2 ring-2 ring-opacity-50` : 'border-2 border-transparent'}
                rounded-lg sm:rounded-xl
                px-3 sm:px-4 py-2 sm:py-2.5
                shadow-md hover:shadow-lg
                transition-all duration-300
                transform hover:scale-105 active:scale-95
                cursor-pointer
                flex items-center gap-2 sm:gap-2.5
                min-w-[100px] sm:min-w-[120px]
                ${isSelected ? 'ring-opacity-30' : ''}
              `}
            >
              <div className={`${service.iconBg} p-1.5 sm:p-2 rounded-lg flex-shrink-0`}>
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${service.textColor}`} />
              </div>
              <div className="flex-1 text-right min-w-0">
                <p className={`text-xs sm:text-sm font-bold ${service.textColor} truncate`}>
                  {service.label}
                </p>
                {count > 0 && (
                  <p className={`text-[10px] sm:text-xs font-extrabold ${service.textColor} opacity-75`}>
                    {count}
                  </p>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

