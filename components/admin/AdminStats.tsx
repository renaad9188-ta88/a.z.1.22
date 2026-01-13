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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon
        return (
          <div
            key={index}
            className={`${stat.bgColor} rounded-xl p-3 sm:p-4 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`${stat.iconBg} p-2 sm:p-2.5 rounded-lg`}>
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 ${stat.color}`} />
              </div>
            </div>
            <p className="text-gray-600 text-xs sm:text-sm mb-1 font-medium">{stat.label}</p>
            <p className={`text-xl sm:text-2xl md:text-3xl font-bold ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        )
      })}
    </div>
  )
}


