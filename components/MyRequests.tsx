'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { FileText, Trash2, Eye, Calendar, MapPin, Navigation } from 'lucide-react'
import { formatDate } from '@/lib/date-utils'

interface VisitRequest {
  id: string
  visitor_name: string
  visit_type: string
  status: string
  trip_status: string | null
  city: string
  created_at: string
}

export default function MyRequests({ userId }: { userId: string }) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<VisitRequest[]>([])

  const load = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('visit_requests')
        .select('id, visitor_name, visit_type, status, trip_status, city, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRequests((data || []) as any)
    } catch (e: any) {
      console.error('Error loading requests:', e)
      toast.error('حدث خطأ أثناء تحميل طلباتك')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const canDelete = (r: VisitRequest) => {
    // حذف آمن: المنتهي/المرفوض/المسودة
    const isCompleted = r.status === 'completed' || r.trip_status === 'completed'
    const isRejected = r.status === 'rejected'
    // المسودة تُعرف من عدم إرسالها (مخفية للإدمن) — عادةً تحمل [DRAFT] في admin_notes
    // لا نملك admin_notes في هذا الاستعلام، لذا نسمح بالحذف فقط للمنتهي/المرفوض حالياً
    return isCompleted || isRejected
  }

  const canTrack = (r: VisitRequest) => {
    // نعرض زر التتبع فقط عندما تكون الرحلة نشطة
    return r.status === 'approved' && (r.trip_status === 'pending_arrival' || r.trip_status === 'arrived')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف الطلب؟')) return
    try {
      const { error } = await supabase
        .from('visit_requests')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (error) throw error
      toast.success('تم حذف الطلب')
      load()
    } catch (e: any) {
      console.error('Delete error:', e)
      toast.error(e?.message || 'لا يمكن حذف الطلب حالياً')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-600 text-sm">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
        <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg sm:text-xl font-bold text-gray-800">طلباتي</h1>
            <Link
              href="/dashboard"
              className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
            >
              العودة للوحة التحكم
            </Link>
          </div>

          {requests.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-600">لا توجد طلبات</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
                <div key={r.id} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-800 text-sm sm:text-base break-words">
                          {r.visitor_name}
                        </h3>
                        <span className="text-xs text-gray-500 font-mono">#{r.id.slice(0, 8).toUpperCase()}</span>
                      </div>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-green-600" />
                          <span className="break-words">{r.city}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          <span className="break-words">{formatDate(r.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 w-28 sm:w-auto">
                      <Link
                        href={`/dashboard/request/${r.id}`}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs sm:text-sm font-semibold"
                      >
                        <Eye className="w-4 h-4" />
                        التفاصيل
                      </Link>
                      {canTrack(r) && (
                        <Link
                          href={`/dashboard/request/${r.id}/track`}
                          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs sm:text-sm font-semibold"
                        >
                          <Navigation className="w-4 h-4" />
                          تتبّع
                        </Link>
                      )}
                      <button
                        onClick={() => handleDelete(r.id)}
                        disabled={!canDelete(r)}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-xs sm:text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!canDelete(r) ? 'الحذف متاح للطلبات المنتهية/المرفوضة فقط' : 'حذف'}
                      >
                        <Trash2 className="w-4 h-4" />
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


