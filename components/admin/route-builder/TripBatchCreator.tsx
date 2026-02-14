'use client'

import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'

function toYmd(d: Date) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default function TripBatchCreator({
  routeId,
  tripType,
  start,
  end,
  colorClass,
  onCreated,
}: {
  routeId: string
  tripType: 'arrival' | 'departure'
  start: { name: string; lat: number; lng: number }
  end: { name: string; lat: number; lng: number }
  colorClass: string
  onCreated?: () => void
}) {
  const supabase = createSupabaseBrowserClient()
  const [saving, setSaving] = useState(false)
  const [startDate, setStartDate] = useState(toYmd(new Date()))
  const [days, setDays] = useState(7)
  const [meetingTime, setMeetingTime] = useState('')
  const [departureTime, setDepartureTime] = useState('07:00')

  const dates = useMemo(() => {
    if (!startDate) return []
    const d0 = new Date(startDate + 'T00:00:00')
    if (isNaN(d0.getTime())) return []
    const n = Math.max(1, Math.min(30, Number(days) || 1))
    const out: string[] = []
    const cur = new Date(d0)
    for (let i = 0; i < n; i++) {
      out.push(toYmd(cur))
      cur.setDate(cur.getDate() + 1)
    }
    return out
  }, [days, startDate])

  const quick = (n: number) => setDays(n)

  const create = async () => {
    if (!startDate) return toast.error('حدد تاريخ البداية')
    if (!departureTime) return toast.error('حدد وقت الانطلاق')
    if (dates.length === 0) return toast.error('لا يوجد تواريخ لإنشائها')
    try {
      setSaving(true)
      const tripTypeDb = tripType === 'departure' ? 'departure' : 'arrival'

      for (const d of dates) {
        const { error } = await supabase.from('route_trips').insert({
          route_id: routeId,
          trip_type: tripTypeDb,
          trip_date: d,
          meeting_time: meetingTime || null,
          departure_time: departureTime,
          start_location_name: start.name,
          start_lat: start.lat,
          start_lng: start.lng,
          end_location_name: end.name,
          end_lat: end.lat,
          end_lng: end.lng,
          is_active: true,
        })
        if (error) throw error
      }

      toast.success(`تم إنشاء ${dates.length} رحلة`)
      onCreated?.()
    } catch (e: any) {
      console.error('batch create error:', e)
      toast.error(e?.message || 'تعذر إنشاء الرحلات')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border border-gray-200 rounded-2xl p-3 bg-white">
      <p className="text-sm font-extrabold text-gray-900">إنشاء رحلات متعددة (بنقرة واحدة)</p>
      <p className="mt-1 text-[11px] sm:text-xs text-gray-600 font-semibold">
        استخدم نفس المسار ومحطات {tripType === 'arrival' ? 'النزول' : 'الصعود'} المعتمدة أعلاه.
      </p>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div lang="en" dir="ltr">
          <label className="block text-xs font-bold text-gray-700 mb-1">تاريخ البداية</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            lang="en"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">عدد الأيام</label>
          <input
            type="number"
            min={1}
            max={30}
            value={days}
            onChange={(e) => setDays(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {[2, 3, 7, 14].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => quick(n)}
                className={`px-2 py-1 rounded-lg border border-gray-200 text-[11px] font-extrabold hover:bg-gray-50 ${colorClass}`}
              >
                {n === 7 ? 'أسبوع' : `${n} أيام`}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">تجمع</label>
            <input
              type="time"
              value={meetingTime}
              onChange={(e) => setMeetingTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">انطلاق *</label>
            <input
              type="time"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-xs text-gray-700 font-bold">
          سيتم إنشاء: <span className="font-extrabold">{dates.length}</span> رحلة
        </p>
        <button
          type="button"
          onClick={create}
          disabled={saving}
          className={`px-4 py-2 rounded-xl text-sm font-extrabold text-white inline-flex items-center gap-2 transition ${
            tripType === 'arrival' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'
          } disabled:opacity-50`}
        >
          <Plus className="w-4 h-4" />
          {saving ? 'جارٍ الإنشاء...' : 'إنشاء الرحلات'}
        </button>
      </div>
    </div>
  )
}


