'use client'

import { FileText, Clock, CheckCircle, XCircle, Calendar, Layers } from 'lucide-react'
import { AdminStats as StatsType } from './types'

interface AdminStatsProps {
  stats: StatsType
  onStatClick?: (filterType: string) => void
  selectedFilter?: string
}

export default function AdminStats({ stats, onStatClick, selectedFilter }: AdminStatsProps) {
  const statCards = [
    {
      label: 'إجمالي الطلبات',
      value: stats.total,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      hoverBgColor: 'hover:bg-blue-100',
      filterType: 'all',
    },
    {
      label: 'طلبات جديدة (24 ساعة)',
      value: stats.newRequests,
      icon: Calendar,
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
      iconBg: 'bg-sky-100',
      hoverBgColor: 'hover:bg-sky-100',
      filterType: 'new',
    },
    {
      label: 'مستلمة',
      value: stats.received,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      hoverBgColor: 'hover:bg-amber-100',
      filterType: 'received',
    },
    {
      label: 'قيد الإجراء',
      value: stats.inProgress,
      icon: Layers,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      iconBg: 'bg-indigo-100',
      hoverBgColor: 'hover:bg-indigo-100',
      filterType: 'in_progress',
    },
    {
      label: 'موافق عليها',
      value: stats.approved,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
      hoverBgColor: 'hover:bg-green-100',
      filterType: 'approved',
    },
    {
      label: 'مرفوضة',
      value: stats.rejected,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      iconBg: 'bg-red-100',
      hoverBgColor: 'hover:bg-red-100',
      filterType: 'rejected',
    },
    {
      label: 'الحجوزات',
      value: stats.bookings,
      icon: Calendar,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      iconBg: 'bg-teal-100',
      hoverBgColor: 'hover:bg-teal-100',
      filterType: 'bookings',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon
        const isSelected = selectedFilter === stat.filterType
        return (
          <button
            key={index}
            type="button"
            onClick={() => onStatClick?.(stat.filterType)}
            className={`
              ${stat.bgColor} 
              ${stat.hoverBgColor}
              rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 
              shadow-md hover:shadow-lg 
              transition-all duration-300 
              transform hover:scale-105 active:scale-95
              cursor-pointer 
              text-right w-full
              border-2 ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent'}
            `}
          >
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <div className={`${stat.iconBg} p-1.5 sm:p-2 md:p-2.5 rounded-lg`}>
                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 ${stat.color}`} />
              </div>
            </div>
            <p className="text-gray-600 text-[10px] sm:text-xs md:text-sm mb-0.5 sm:mb-1 font-medium truncate">{stat.label}</p>
            <p className={`text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold ${stat.color}`}>
              {stat.value}
            </p>
          </button>
        )
      })}
    </div>
  )
}


