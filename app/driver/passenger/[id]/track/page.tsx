'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { ArrowLeft, MapPin, Navigation, Users } from 'lucide-react'
import Link from 'next/link'
import RequestTracking from '@/components/tracking/RequestTracking'
import TripTrackingAdminPanel from '@/components/admin/TripTrackingAdminPanel'
import toast from 'react-hot-toast'

export default function DriverTrackPassenger() {
  const params = useParams()
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [hasAccess, setHasAccess] = useState(false)
  const [loading, setLoading] = useState(true)

  const checkAccess = useCallback(async (requestId: string) => {
    try {
      setLoading(true)

      // التحقق من تسجيل الدخول والصلاحيات
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // الحصول على سجل السائق المربوط بهذا الحساب
      const { data: driverRow, error: driverErr } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (driverErr) throw driverErr
      if (!driverRow?.id) {
        toast.error('حسابك كسائق غير مربوط بسجل سائق. يرجى التواصل مع الإدارة.')
        router.push('/driver')
        return
      }

      const { data: rdRows, error: rdErr } = await supabase
        .from('route_drivers')
        .select('route_id')
        .eq('driver_id', driverRow.id)
        .eq('is_active', true)

      if (rdErr) throw rdErr
      const routeIds = (rdRows || []).map((r: any) => r.route_id).filter(Boolean)
      if (routeIds.length === 0) {
        toast.error('لا توجد خطوط مربوطة بك. يرجى التواصل مع الإدارة.')
        router.push('/driver')
        return
      }

      // التحقق من أن الطلب يخص خطوط هذا السائق
      const { data: requestData, error } = await supabase
        .from('visit_requests')
        .select('id')
        .eq('id', requestId)
        .eq('status', 'approved')
        .in('trip_status', ['pending_arrival', 'arrived'])
        .in('route_id', routeIds)
        .maybeSingle()

      if (error || !requestData) {
        toast.error('لا يمكنك تتبع هذه الرحلة')
        router.push('/driver')
        return
      }

      setHasAccess(true)
    } catch (error: any) {
      console.error('Error checking access:', error)
      toast.error('حدث خطأ في التحقق من الصلاحيات')
      router.push('/driver')
    } finally {
      setLoading(false)
    }
  }, [router, supabase])

  useEffect(() => {
    if (params.id) {
      checkAccess(params.id as string)
    }
  }, [params.id, checkAccess])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm sm:text-base">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-red-600 text-sm sm:text-base">لا يمكنك الوصول إلى هذه الصفحة</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white overflow-x-hidden">
      {/* Header */}
      <header className="bg-white shadow-md rounded-xl w-full">
        <div className="container mx-auto px-2 sm:px-3 md:px-4 py-2 sm:py-3 max-w-full">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href={`/driver/passenger/${params.id}`}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">العودة</span>
            </Link>
            <div className="flex-1">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">
                تتبع الرحلة
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                مراقبة موقع الرحلة والركاب على الخريطة
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-2 sm:px-3 md:px-4 py-3 sm:py-4 md:py-6 max-w-full">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-4">
          {/* Map */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">خريطة التتبع</h2>
              </div>
              <RequestTracking requestId={params.id as string} userId="driver" />
            </div>
          </div>

          {/* Control Panel */}
          <div>
            <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Navigation className="w-5 h-5 text-green-600" />
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">لوحة التحكم</h2>
              </div>
              <TripTrackingAdminPanel requestId={params.id as string} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

