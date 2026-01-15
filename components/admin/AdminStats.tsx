'use client'

import { FileText, Clock, CheckCircle, XCircle, Eye } from 'lucide-react'
import { AdminStats as StatsType } from './types'

interface AdminStatsProps {
  stats: StatsType
}

export default function AdminStats({ stats }: AdminStatsProps) {
  const statCards = [
    {
      label: 'إجمالي الطلبات',
      value: stats.total,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
    },
    {
      label: 'قيد المراجعة',
      value: stats.pending,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      iconBg: 'bg-yellow-100',
    },
    {
      label: 'بانتظار الموافقة',
      value: stats.underReview,
      icon: Eye,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      iconBg: 'bg-purple-100',
    },
    {
      label: 'مقبولة',
      value: stats.approved,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
    },
    {
      label: 'مرفوضة',
      value: stats.rejected,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      iconBg: 'bg-red-100',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon
        return (
          <div
            key={index}
            className={`${stat.bgColor} rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105`}
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
          </div>
        )
      })}
    </div>
  )
}


