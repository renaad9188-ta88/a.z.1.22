'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Calendar, Clock, Navigation, MapPin, Bus, ArrowRight } from 'lucide-react'
import { formatDate } from '@/lib/date-utils'
import Link from 'next/link'

type Trip = {
  id: string
  trip_date: string
  meeting_time: string | null
  departure_time: string | null
  start_location_name: string
  end_location_name: string
  route_id: string
}

export default function TripsPage() {
  const supabase = createSupabaseBrowserClient()
  const router = useRouter()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming'>('upcoming')

  useEffect(() => {
    loadTrips()
  }, [filter])

  const loadTrips = async () => {
    try {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]
      
      let query = supabase
        .from('route_trips')
        .select('id,trip_date,meeting_time,departure_time,start_location_name,end_location_name,route_id')
        .eq('is_active', true)
        .order('trip_date', { ascending: true })
        .order('departure_time', { ascending: true })

      if (filter === 'today') {
        query = query.eq('trip_date', today)
      } else if (filter === 'upcoming') {
        query = query.gte('trip_date', today)
      }

      const { data, error } = await query.limit(100)
      
      if (error) throw error
      setTrips(data || [])
    } catch (e: any) {
      console.error('Error loading trips:', e)
      toast.error('تعذر تحميل الرحلات')
      setTrips([])
    } finally {
      setLoading(false)
    }
  }

  const handleBookTrip = async (tripId: string) => {
    try {
      // التحقق من تسجيل الدخول
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('يجب تسجيل الدخول أولاً')
        router.push('/auth/login')
        return
      }

      // البحث عن طلب معتمد للمستخدم
      const { data: requests, error: reqError } = await supabase
        .from('visit_requests')
        .select('id,visitor_name,status,payment_verified')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .eq('payment_verified', true)
        .is('trip_id', null)
        .order('created_at', { ascending: false })
        .limit(1)

      if (reqError) throw reqError

      if (!requests || requests.length === 0) {
        toast.error('لا يوجد طلب معتمد متاح للحجز. يرجى تقديم طلب أولاً.')
        router.push('/request-visit')
        return
      }

      const request = requests[0]

      // حجز الرحلة
      const { error: updateError } = await supabase
        .from('visit_requests')
        .update({ trip_id: tripId, updated_at: new Date().toISOString() })
        .eq('id', request.id)

      if (updateError) throw updateError

      toast.success('تم حجز الرحلة بنجاح')
      router.push(`/dashboard/request/${request.id}/follow`)

      // إشعار للمستخدم
      try {
        const { createNotification } = await import('@/lib/notifications')
        await createNotification({
          userId: user.id,
          title: 'تم حجز الرحلة',
          message: `تم حجز رحلة لطلب ${request.visitor_name} بنجاح. يمكنك متابعة تفاصيل الرحلة من لوحة التحكم.`,
          type: 'success',
          relatedType: 'trip',
          relatedId: request.id,
        })
      } catch (notifyError) {
        console.error('Error sending notification:', notifyError)
      }

      // إشعار للإدمن
      try {
        const { notifyAllAdmins } = await import('@/lib/notifications')
        await notifyAllAdmins({
          title: 'حجز رحلة جديد',
          message: `تم حجز رحلة للمستخدم ${request.visitor_name}`,
          type: 'info',
          relatedType: 'trip',
          relatedId: request.id,
        })
      } catch (notifyError) {
        console.error('Error sending admin notification:', notifyError)
      }
    } catch (e: any) {
      console.error('Error booking trip:', e)
      toast.error(e.message || 'حدث خطأ أثناء حجز الرحلة')
    }
  }

  return (
    <div className="page">
      <div className="page-container">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 sm:gap-2 text-blue-600 hover:text-blue-700 mb-4 sm:mb-6 text-sm sm:text-base"
        >
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>العودة للوحة التحكم</span>
        </Link>

        <div className="card">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold text-gray-900">الرحلات المتاحة</h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">اختر رحلة من القائمة المتاحة</p>
              </div>
              
              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilter('upcoming')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    filter === 'upcoming'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  القادمة
                </button>
                <button
                  onClick={() => setFilter('today')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    filter === 'today'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  اليوم
                </button>
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    filter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  الكل
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">جاري تحميل الرحلات...</p>
              </div>
            ) : trips.length === 0 ? (
              <div className="text-center py-8">
                <Bus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-800 mb-2">
                  {filter === 'today' ? 'لا توجد رحلات اليوم' :
                   filter === 'upcoming' ? 'لا توجد رحلات قادمة' :
                   'لا توجد رحلات'}
                </h3>
                <p className="text-sm text-gray-600">
                  {filter === 'today' ? 'لا توجد رحلات مجدولة اليوم' :
                   filter === 'upcoming' ? 'لا توجد رحلات مجدولة قادمة' :
                   'لا توجد رحلات متاحة حالياً'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {trips.map((trip) => (
                  <div key={trip.id} className="bg-white border-2 border-gray-200 rounded-lg p-4 sm:p-6 hover:border-blue-300 transition">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Bus className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-base sm:text-lg font-bold text-gray-900">
                              {trip.start_location_name} → {trip.end_location_name}
                            </h3>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <div>
                              <p className="text-gray-600">التاريخ</p>
                              <p className="font-medium text-gray-800">{formatDate(trip.trip_date)}</p>
                            </div>
                          </div>
                          {trip.meeting_time && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                              <div>
                                <p className="text-gray-600">وقت التجمع</p>
                                <p className="font-medium text-gray-800">{trip.meeting_time}</p>
                              </div>
                            </div>
                          )}
                          {trip.departure_time && (
                            <div className="flex items-center gap-2">
                              <Navigation className="w-4 h-4 text-blue-600 flex-shrink-0" />
                              <div>
                                <p className="text-gray-600">وقت الانطلاق</p>
                                <p className="font-medium text-gray-800">{trip.departure_time}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleBookTrip(trip.id)}
                        className="w-full lg:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold inline-flex items-center justify-center gap-2"
                      >
                        <Bus className="w-4 h-4" />
                        حجز هذه الرحلة
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}



