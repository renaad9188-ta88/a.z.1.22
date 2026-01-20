'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Calendar, Clock, MapPin, Navigation } from 'lucide-react'
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

export default function DriverTripsList({ driverRowId }: { driverRowId: string }) {
  const supabase = createSupabaseBrowserClient()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [hint, setHint] = useState<string>('')

  useEffect(() => {
    loadTrips()
  }, [driverRowId])

  const loadTrips = async () => {
    try {
      setLoading(true)
      setHint('')
      
      // 1) Get trip IDs assigned to this driver
      const { data: assignments, error: assignErr } = await supabase
        .from('route_trip_drivers')
        .select('trip_id')
        .eq('driver_id', driverRowId)
        .eq('is_active', true)
      
      if (assignErr) {
        console.error('route_trip_drivers select error:', assignErr)
        setHint(
          'تعذر قراءة تعيينات الرحلات. غالباً تحتاج لتطبيق RLS للسائق على route_trip_drivers. شغّل سكربت supabase/FIX_DRIVER_RLS_FOR_TRIP_ASSIGNMENTS.sql في Supabase SQL Editor.'
        )
        throw assignErr
      }
      
      const tripIds = (assignments || []).map((a: any) => a.trip_id).filter(Boolean)
      if (tripIds.length === 0) {
        setTrips([])
        return
      }
      
      // 2) Load trips
      const { data: tripsData, error: tripsErr } = await supabase
        .from('route_trips')
        .select('id,trip_date,meeting_time,departure_time,start_location_name,end_location_name,route_id')
        .in('id', tripIds)
        .eq('is_active', true)
        .order('trip_date', { ascending: true })
        .order('departure_time', { ascending: true })
      
      if (tripsErr) {
        console.error('route_trips select error:', tripsErr)
        throw tripsErr
      }
      setTrips((tripsData || []) as Trip[])
    } catch (e: any) {
      console.error('Load driver trips error:', e)
      toast.error(e?.message || 'تعذر تحميل الرحلات')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00')
      return d.toLocaleDateString('ar-JO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    } catch {
      return dateStr
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6">
        <p className="text-sm text-gray-600">جاري تحميل الرحلات...</p>
      </div>
    )
  }

  if (trips.length === 0) {
    return (
      <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-extrabold text-gray-900 mb-2">رحلاتي المعيّنة</h3>
        <p className="text-sm text-gray-600">لا توجد رحلات معيّنة لك حالياً. اطلب من الإدارة تعيين رحلة لك.</p>
        {hint && (
          <div className="mt-3 text-xs sm:text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3">
            {hint}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-extrabold text-gray-900 mb-4 flex items-center gap-2">
        <Navigation className="w-5 h-5 text-blue-600" />
        رحلاتي المعيّنة ({trips.length})
      </h3>
      
      <div className="space-y-3">
        {trips.map((trip) => (
          <Link
            key={trip.id}
            href={`/driver/trip/${trip.id}`}
            className="block border border-gray-200 rounded-lg p-3 sm:p-4 hover:border-blue-500 hover:bg-blue-50 transition"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span className="font-bold text-gray-900 truncate">
                    {trip.start_location_name} → {trip.end_location_name}
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>{formatDate(trip.trip_date)}</span>
                  </div>
                  {trip.meeting_time && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>تجمع: {trip.meeting_time}</span>
                    </div>
                  )}
                  {trip.departure_time && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>انطلاق: {trip.departure_time}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <span className="text-xs sm:text-sm text-blue-600 font-semibold whitespace-nowrap">
                عرض التفاصيل →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

