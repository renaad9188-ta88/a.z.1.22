'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, Users, Phone, MessageCircle, Copy, Search, CheckSquare, Square } from 'lucide-react'
import toast from 'react-hot-toast'

interface Passenger {
  id: string
  visitor_name: string
  full_name?: string | null
  phone?: string | null
  whatsapp_phone?: string | null
  jordan_phone?: string | null
  companions_count?: number | null
}

interface PassengersModalProps {
  tripId: string
  passengers: Passenger[]
  onClose: () => void
  normalizePhoneForWhatsApp: (phone: string) => string
}

export default function PassengersModal({
  tripId,
  passengers,
  onClose,
  normalizePhoneForWhatsApp,
}: PassengersModalProps) {
  const storageKey = `trip_passengers_checked:${tripId}`
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      const arr = raw ? (JSON.parse(raw) as string[]) : []
      setCheckedIds(new Set((arr || []).filter(Boolean)))
    } catch {
      setCheckedIds(new Set())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId])

  const persist = (next: Set<string>) => {
    setCheckedIds(next)
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(next)))
    } catch {
      // ignore
    }
  }

  const filteredPassengers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return passengers
    return passengers.filter((p) => {
      const hay = [
        p.visitor_name || '',
        p.full_name || '',
        p.phone || '',
        p.whatsapp_phone || '',
        p.jordan_phone || '',
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [passengers, query])

  const checkedCount = checkedIds.size

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-center justify-between z-10">
          <div className="min-w-0">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            قائمة الحاجزين ({passengers.length})
            </h3>
            <p className="mt-1 text-[11px] sm:text-xs text-gray-600 font-semibold">
              تم التأشير: <span className="font-extrabold tabular-nums">{checkedCount}</span> / {passengers.length}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        <div className="p-4 sm:p-6 space-y-3">
          {/* Tools */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between bg-gray-50 border border-gray-200 rounded-xl p-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="بحث بالاسم أو الرقم..."
                className="w-full sm:w-64 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => persist(new Set(passengers.map((p) => p.id)))}
                className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 hover:bg-gray-50 text-xs sm:text-sm font-extrabold"
              >
                تحديد الكل
              </button>
              <button
                type="button"
                onClick={() => persist(new Set())}
                className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 hover:bg-gray-50 text-xs sm:text-sm font-extrabold"
              >
                إلغاء التحديد
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const lines = filteredPassengers.map((p, i) => {
                      const totalPeople = 1 + (p.companions_count || 0)
                      const checked = checkedIds.has(p.id) ? '✅' : '⬜'
                      const phone = p.whatsapp_phone || p.phone || p.jordan_phone || ''
                      return `${checked} ${i + 1}. ${p.visitor_name} (${totalPeople})${phone ? ` — ${phone}` : ''}`
                    })
                    await navigator.clipboard.writeText(lines.join('\n'))
                    toast.success('تم نسخ الكشف')
                  } catch {
                    toast.error('تعذر النسخ')
                  }
                }}
                className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs sm:text-sm font-extrabold inline-flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                نسخ
              </button>
            </div>
          </div>

          {filteredPassengers.map((passenger, idx) => {
            const totalPeople = 1 + (passenger.companions_count || 0)
            const checked = checkedIds.has(passenger.id)
            const waSource = passenger.whatsapp_phone || passenger.phone || passenger.jordan_phone || ''
            const telSource = passenger.jordan_phone || passenger.phone || ''
            const waDigits = normalizePhoneForWhatsApp(waSource)
            const whatsappUrl = waDigits
              ? `https://wa.me/${waDigits}?text=${encodeURIComponent(`مرحباً ${passenger.visitor_name}، بخصوص رحلة/حجز المنصة...`)}`
              : `https://wa.me/?text=${encodeURIComponent(`تواصل مع ${passenger.visitor_name}`)}`
            
            return (
              <div key={passenger.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => {
                          const next = new Set(checkedIds)
                          if (next.has(passenger.id)) next.delete(passenger.id)
                          else next.add(passenger.id)
                          persist(next)
                        }}
                        className="p-1 rounded-lg hover:bg-gray-100 transition"
                        title={checked ? 'إزالة التأشير' : 'تأشير'}
                      >
                        {checked ? (
                          <CheckSquare className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {idx + 1}
                      </span>
                      <h4 className="font-bold text-gray-900 text-sm sm:text-base">
                        {passenger.visitor_name}
                      </h4>
                      {passenger.full_name && passenger.full_name !== passenger.visitor_name && (
                        <span className="text-xs text-gray-500">({passenger.full_name})</span>
                      )}
                    </div>
                    
                    <div className="space-y-1.5 text-xs sm:text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Users className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                        <span>عدد الأشخاص: <span className="font-semibold">{totalPeople}</span></span>
                      </div>
                      {(passenger.whatsapp_phone || passenger.phone || passenger.jordan_phone) && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                          <span className="truncate">
                            {passenger.whatsapp_phone || passenger.phone || passenger.jordan_phone}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {(waSource || telSource) && (
                    <div className="flex gap-2 flex-shrink-0">
                      {waSource && (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-xs font-semibold flex items-center gap-1.5"
                          title="واتساب"
                        >
                          <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                          واتساب
                        </a>
                      )}
                      {telSource && (
                        <a
                          href={`tel:${telSource.replace(/[^\d+]/g, '')}`}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs font-semibold flex items-center gap-1.5"
                          title="اتصال"
                        >
                          <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
                          اتصال
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          
          {filteredPassengers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              لا يوجد نتائج
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

