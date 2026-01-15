'use client'

import { Search, Filter, X } from 'lucide-react'
import { useState } from 'react'

interface RequestFiltersProps {
  searchQuery: string
  statusFilter: string
  typeFilter: string
  onSearchChange: (query: string) => void
  onStatusFilterChange: (status: string) => void
  onTypeFilterChange: (type: string) => void
  onClearFilters: () => void
}

export default function RequestFilters({
  searchQuery,
  statusFilter,
  typeFilter,
  onSearchChange,
  onStatusFilterChange,
  onTypeFilterChange,
  onClearFilters,
}: RequestFiltersProps) {
  const hasActiveFilters = searchQuery || statusFilter !== 'all' || typeFilter !== 'all'

  return (
    <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4">
        {/* البحث */}
        <div className="flex-1 relative min-w-0">
          <Search className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ابحث بالاسم أو رقم الطلب..."
            className="w-full pr-8 sm:pr-10 pl-3 sm:pl-4 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* تصفية الحالة */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-0"
        >
          <option value="all">جميع الحالات</option>
          <option value="pending">قيد المراجعة</option>
          <option value="under_review">بانتظار الموافقة</option>
          <option value="approved">مقبولة</option>
          <option value="rejected">مرفوضة</option>
        </select>

        {/* تصفية النوع */}
        <select
          value={typeFilter}
          onChange={(e) => onTypeFilterChange(e.target.value)}
          className="px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-0"
        >
          <option value="all">جميع الأنواع</option>
          <option value="visit">زيارة</option>
          <option value="umrah">عمرة</option>
          <option value="tourism">سياحة</option>
        </select>

        {/* مسح التصفية */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm md:text-base text-red-600 hover:bg-red-50 rounded-lg transition whitespace-nowrap"
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">مسح</span>
          </button>
        )}
      </div>
    </div>
  )
}


