'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { Users, FileText, CheckCircle, Clock, XCircle, MessageCircle, Phone, TrendingUp } from 'lucide-react'

interface SupervisorStatsProps {
  supervisorId: string
  supervisorName: string
  onCustomersClick?: () => void
  onAllRequestsClick?: () => void
  onPendingRequestsClick?: () => void
  onApprovedRequestsClick?: () => void
  onRejectedRequestsClick?: () => void
  onCompletedRequestsClick?: () => void
  onAssignedRequestsClick?: () => void
  onContactInfoClick?: () => void
}

interface SupervisorStatistics {
  totalCustomers: number
  totalRequests: number
  pendingRequests: number
  approvedRequests: number
  rejectedRequests: number
  completedRequests: number
  assignedRequests: number
  hasContactInfo: boolean
  contactPhone: string | null
  whatsappPhone: string | null
}

export default function SupervisorStats({ 
  supervisorId, 
  supervisorName, 
  onCustomersClick,
  onAllRequestsClick,
  onPendingRequestsClick,
  onApprovedRequestsClick,
  onRejectedRequestsClick,
  onCompletedRequestsClick,
  onAssignedRequestsClick,
  onContactInfoClick,
}: SupervisorStatsProps) {
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<SupervisorStatistics | null>(null)

  useEffect(() => {
    loadStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supervisorId])

  const loadStats = async () => {
    try {
      setLoading(true)

      // 1. عدد المنتسبين
      const { count: customersCount } = await supabase
        .from('supervisor_customers')
        .select('*', { count: 'exact', head: true })
        .eq('supervisor_id', supervisorId)

      // 2. الطلبات المعينة للمشرف
      const { data: assignedRequests, count: assignedCount } = await supabase
        .from('visit_requests')
        .select('id, status, trip_status', { count: 'exact' })
        .eq('assigned_to', supervisorId)
        .is('deleted_at', null)

      // 3. طلبات المنتسبين
      const { data: customerData } = await supabase
        .from('supervisor_customers')
        .select('customer_id')
        .eq('supervisor_id', supervisorId)

      const customerIds = (customerData || []).map((c: any) => c.customer_id)
      
      let customerRequests: any[] = []
      if (customerIds.length > 0) {
        const { data } = await supabase
          .from('visit_requests')
          .select('id, status, trip_status')
          .in('user_id', customerIds)
          .is('deleted_at', null)
        
        customerRequests = data || []
      }

      // دمج الطلبات المعينة وطلبات المنتسبين (بدون تكرار)
      const allRequestIds = new Set([
        ...(assignedRequests || []).map((r: any) => r.id),
        ...customerRequests.map((r: any) => r.id),
      ])
      
      const allRequests = [
        ...(assignedRequests || []),
        ...customerRequests.filter((r: any) => !allRequestIds.has(r.id) || !assignedRequests?.some((ar: any) => ar.id === r.id)),
      ]

      // حساب الإحصائيات
      const pending = allRequests.filter((r: any) => r.status === 'pending' || r.status === 'under_review').length
      const approved = allRequests.filter((r: any) => r.status === 'approved').length
      const rejected = allRequests.filter((r: any) => r.status === 'rejected').length
      const completed = allRequests.filter((r: any) => 
        r.status === 'completed' || r.trip_status === 'completed'
      ).length

      // 4. معلومات التواصل
      const { data: permissions } = await supabase
        .from('supervisor_permissions')
        .select('contact_phone, whatsapp_phone')
        .eq('supervisor_id', supervisorId)
        .maybeSingle()

      setStats({
        totalCustomers: customersCount || 0,
        totalRequests: allRequests.length,
        pendingRequests: pending,
        approvedRequests: approved,
        rejectedRequests: rejected,
        completedRequests: completed,
        assignedRequests: assignedCount || 0,
        hasContactInfo: Boolean(permissions?.contact_phone || permissions?.whatsapp_phone),
        contactPhone: permissions?.contact_phone || null,
        whatsappPhone: permissions?.whatsapp_phone || null,
      })
    } catch (e: any) {
      console.error('Load supervisor stats error:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 text-center text-gray-500">
        لا توجد إحصائيات متاحة
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl border-2 border-blue-200 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          إحصائيات: {supervisorName}
        </h4>
        <button
          onClick={loadStats}
          className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
        >
          تحديث
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
        <div 
          className={`bg-white rounded-lg p-3 border border-gray-200 ${onCustomersClick ? 'cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition' : ''}`}
          onClick={onCustomersClick}
          title={onCustomersClick ? 'انقر لعرض المنتسبين' : undefined}
        >
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-gray-600">المنتسبون</span>
          </div>
          <div className="text-xl font-bold text-gray-900">{stats.totalCustomers}</div>
        </div>

        <div 
          className={`bg-white rounded-lg p-3 border border-gray-200 ${onAllRequestsClick ? 'cursor-pointer hover:bg-purple-50 hover:border-purple-300 transition' : ''}`}
          onClick={onAllRequestsClick}
          title={onAllRequestsClick ? 'انقر لعرض جميع الطلبات' : undefined}
        >
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-gray-600">الطلبات</span>
          </div>
          <div className="text-xl font-bold text-gray-900">{stats.totalRequests}</div>
        </div>

        <div 
          className={`bg-white rounded-lg p-3 border border-gray-200 ${onPendingRequestsClick ? 'cursor-pointer hover:bg-yellow-50 hover:border-yellow-300 transition' : ''}`}
          onClick={onPendingRequestsClick}
          title={onPendingRequestsClick ? 'انقر لعرض الطلبات قيد المراجعة' : undefined}
        >
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-yellow-600" />
            <span className="text-xs text-gray-600">قيد المراجعة</span>
          </div>
          <div className="text-xl font-bold text-yellow-700">{stats.pendingRequests}</div>
        </div>

        <div 
          className={`bg-white rounded-lg p-3 border border-gray-200 ${onApprovedRequestsClick ? 'cursor-pointer hover:bg-green-50 hover:border-green-300 transition' : ''}`}
          onClick={onApprovedRequestsClick}
          title={onApprovedRequestsClick ? 'انقر لعرض الطلبات المقبولة' : undefined}
        >
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-xs text-gray-600">مقبولة</span>
          </div>
          <div className="text-xl font-bold text-green-700">{stats.approvedRequests}</div>
        </div>

        <div 
          className={`bg-white rounded-lg p-3 border border-gray-200 ${onRejectedRequestsClick ? 'cursor-pointer hover:bg-red-50 hover:border-red-300 transition' : ''}`}
          onClick={onRejectedRequestsClick}
          title={onRejectedRequestsClick ? 'انقر لعرض الطلبات المرفوضة' : undefined}
        >
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-red-600" />
            <span className="text-xs text-gray-600">مرفوضة</span>
          </div>
          <div className="text-xl font-bold text-red-700">{stats.rejectedRequests}</div>
        </div>

        <div 
          className={`bg-white rounded-lg p-3 border border-gray-200 ${onCompletedRequestsClick ? 'cursor-pointer hover:bg-teal-50 hover:border-teal-300 transition' : ''}`}
          onClick={onCompletedRequestsClick}
          title={onCompletedRequestsClick ? 'انقر لعرض الطلبات المنتهية' : undefined}
        >
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-teal-600" />
            <span className="text-xs text-gray-600">منتهية</span>
          </div>
          <div className="text-xl font-bold text-teal-700">{stats.completedRequests}</div>
        </div>

        <div 
          className={`bg-white rounded-lg p-3 border border-gray-200 ${onAssignedRequestsClick ? 'cursor-pointer hover:bg-indigo-50 hover:border-indigo-300 transition' : ''}`}
          onClick={onAssignedRequestsClick}
          title={onAssignedRequestsClick ? 'انقر لعرض الطلبات المعينة مباشرة' : undefined}
        >
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span className="text-xs text-gray-600">معينة مباشرة</span>
          </div>
          <div className="text-xl font-bold text-indigo-700">{stats.assignedRequests}</div>
        </div>

        <div 
          className={`bg-white rounded-lg p-3 border border-gray-200 ${onContactInfoClick ? 'cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition' : ''}`}
          onClick={onContactInfoClick}
          title={onContactInfoClick ? 'انقر لتعديل معلومات التواصل' : undefined}
        >
          <div className="flex items-center gap-2 mb-1">
            {stats.hasContactInfo ? (
              <MessageCircle className="w-4 h-4 text-green-600" />
            ) : (
              <Phone className="w-4 h-4 text-gray-400" />
            )}
            <span className="text-xs text-gray-600">معلومات التواصل</span>
          </div>
          <div className={`text-sm font-bold ${stats.hasContactInfo ? 'text-green-700' : 'text-gray-400'}`}>
            {stats.hasContactInfo ? '✓ متوفرة' : '✗ غير متوفرة'}
          </div>
        </div>
      </div>

      {stats.hasContactInfo && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs font-semibold text-gray-700 mb-2">أرقام التواصل:</div>
          <div className="flex flex-wrap gap-2">
            {stats.whatsappPhone && (
              <div className="flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                <MessageCircle className="w-3 h-3" />
                واتساب: {stats.whatsappPhone}
              </div>
            )}
            {stats.contactPhone && (
              <div className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                <Phone className="w-3 h-3" />
                هاتف: {stats.contactPhone}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

