'use client'

import { Users, Phone, Bus, MapPin, Navigation, Trash2, Copy, CalendarDays } from 'lucide-react'
import toast from 'react-hot-toast'

interface Driver {
  id: string
  name: string
  phone: string
  vehicle_type: string
  seats_count: number
  is_active: boolean
  user_id?: string | null
}

interface DriverAccount {
  user_id: string
  full_name: string | null
  phone: string | null
  role: string | null
}

interface DriverLocationLite {
  lat: number
  lng: number
  updated_at: string
  request_id: string | null
}

interface DriverLiveLite {
  driver_id: string
  is_available: boolean
  updated_at: string
}

interface DriversListProps {
  drivers: Driver[]
  driverSearch: string
  onSearchChange: (value: string) => void
  driverAccounts: DriverAccount[]
  driverLastLoc: Record<string, DriverLocationLite | null>
  driverLiveMap: Record<string, DriverLiveLite | null>
  driverLocLoading: Record<string, boolean>
  getAccountForDriver: (driver: Driver) => DriverAccount | null
  getAssignedRoutesCount: (driverId: string) => number
  normalizePhoneForWhatsApp: (phone: string) => string
  normalizePhoneForTel: (phone: string) => string
  loadDriverLastLocation: (driver: Driver) => void
  loadDriverLocationHistory: (driver: Driver) => void
  onOpenHistory: (driver: Driver) => void
  toggleDriverActive: (driverId: string, nextActive: boolean) => void
  deleteDriver: (driverId: string) => void
  onAssignToTrip: (driver: Driver, tripType: 'arrival' | 'departure') => void
}

export default function DriversList({
  drivers,
  driverSearch,
  onSearchChange,
  driverAccounts,
  driverLastLoc,
  driverLiveMap,
  driverLocLoading,
  getAccountForDriver,
  getAssignedRoutesCount,
  normalizePhoneForWhatsApp,
  normalizePhoneForTel,
  loadDriverLastLocation,
  loadDriverLocationHistory,
  onOpenHistory,
  toggleDriverActive,
  deleteDriver,
  onAssignToTrip,
}: DriversListProps) {
  const filteredDrivers = drivers.filter((d) => {
    const q = driverSearch.trim()
    if (!q) return true
    const qq = q.toLowerCase()
    return (
      d.name.toLowerCase().includes(qq) ||
      (d.phone || '').toLowerCase().includes(qq) ||
      (d.vehicle_type || '').toLowerCase().includes(qq)
    )
  })

  return (
    <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg md:text-xl font-extrabold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            السائقون (الكل)
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            عرض السائقين المضافين + ربطهم بالحساب + آخر موقع مُسجل + تواصل مباشر
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            value={driverSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="بحث بالاسم أو الهاتف..."
            className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4">
        {filteredDrivers.map((d) => {
          const acc = getAccountForDriver(d)
          const routesCount = getAssignedRoutesCount(d.id)
          const lastLoc = driverLastLoc[d.id] || null
          const live = driverLiveMap[d.id] || null
          const waDigits = normalizePhoneForWhatsApp(d.phone || '')
          const waHref = waDigits ? `https://wa.me/${waDigits}` : `https://wa.me/?text=${encodeURIComponent(`تواصل مع السائق: ${d.name} — ${d.phone}`)}`
          const telDigits = normalizePhoneForTel(d.phone || '')
          const telHref = telDigits ? `tel:${telDigits}` : ''
          const mapHref =
            lastLoc ? `https://www.google.com/maps?q=${lastLoc.lat},${lastLoc.lng}` : ''

          return (
            <div key={d.id} className="border border-gray-200 rounded-xl p-3 sm:p-4 lg:p-5">
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  {/* Name and badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-base sm:text-lg text-gray-900">{d.name}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${d.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                      {d.is_active ? 'نشط' : 'غير نشط'}
                    </span>
                    {live?.is_available ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-full border bg-green-600 text-white border-green-700">
                        متاح
                      </span>
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 rounded-full border bg-gray-200 text-gray-800 border-gray-300">
                        غير متاح
                      </span>
                    )}
                    {d.user_id ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                        مربوط بحساب
                      </span>
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 rounded-full border bg-yellow-50 text-yellow-800 border-yellow-200">
                        بدون حساب
                      </span>
                    )}
                  </div>
                  
                  {/* Driver info - grid layout for better organization */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 text-xs sm:text-sm text-gray-700">
                    <div className="inline-flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="truncate">{d.phone}</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5">
                      <Bus className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span>{d.vehicle_type} • {d.seats_count} مقعد</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span>خطوط مربوطة: {routesCount}</span>
                    </div>
                  </div>
                  
                  {/* Account info */}
                  {acc && (
                    <div className="mt-2 text-[11px] sm:text-xs text-gray-600 bg-gray-50 rounded-lg p-2 border border-gray-200">
                      <span className="font-semibold">حساب:</span> {acc.full_name || 'بدون اسم'} — {acc.phone || 'بدون رقم'} — <span className="font-semibold">الدور:</span> {acc.role || 'user'}
                    </div>
                  )}
                  
                  {/* Location info */}
                  {lastLoc && (
                    <div className="mt-2 text-[11px] sm:text-xs text-gray-600">
                      <span className="font-semibold">آخر موقع:</span> {new Date(lastLoc.updated_at).toLocaleString('ar-JO')} •{' '}
                      <a href={mapHref} target="_blank" rel="noopener noreferrer" className="text-blue-700 font-bold hover:underline">
                        فتح على الخريطة
                      </a>
                    </div>
                  )}
                  {live?.updated_at && (
                    <div className="mt-1 text-[11px] sm:text-xs text-gray-500">
                      <span className="font-semibold">حالة متاح:</span> آخر تحديث {new Date(live.updated_at).toLocaleString('ar-JO')}
                    </div>
                  )}
                </div>

                {/* Actions (simplified) */}
                <div className="w-full space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full px-2.5 py-2 rounded-lg bg-green-600 text-white text-xs sm:text-sm font-extrabold hover:bg-green-700 transition inline-flex items-center justify-center gap-2"
                      title="تواصل واتساب"
                    >
                      <Phone className="w-4 h-4" />
                      واتساب
                    </a>
                    {telHref && (
                      <a
                        href={telHref}
                        className="w-full px-2.5 py-2 rounded-lg bg-amber-50 text-amber-900 text-xs sm:text-sm font-extrabold hover:bg-amber-100 transition inline-flex items-center justify-center gap-2 border border-amber-200"
                        title="اتصال مباشر"
                      >
                        <Phone className="w-4 h-4" />
                        اتصال
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => onAssignToTrip(d, 'arrival')}
                      className="w-full px-2.5 py-2 rounded-lg bg-blue-600 text-white text-xs sm:text-sm font-extrabold hover:bg-blue-700 transition inline-flex items-center justify-center gap-2"
                      title="تعيين السائق على رحلة (القادمون)"
                    >
                      <CalendarDays className="w-4 h-4" />
                      تعيين قادمين
                    </button>
                    <button
                      type="button"
                      onClick={() => onAssignToTrip(d, 'departure')}
                      className="w-full px-2.5 py-2 rounded-lg bg-purple-600 text-white text-xs sm:text-sm font-extrabold hover:bg-purple-700 transition inline-flex items-center justify-center gap-2"
                      title="تعيين السائق على رحلة (المغادرون)"
                    >
                      <CalendarDays className="w-4 h-4" />
                      تعيين مغادرين
                    </button>
                  </div>

                  <details className="border border-gray-200 rounded-xl bg-gray-50 p-2">
                    <summary className="cursor-pointer text-xs sm:text-sm font-extrabold text-gray-800 px-2 py-1">
                      إجراءات إضافية
                    </summary>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => loadDriverLastLocation(d)}
                        disabled={Boolean(driverLocLoading[d.id])}
                        className="w-full px-2.5 py-2 rounded-lg bg-white text-gray-900 text-xs sm:text-sm font-bold hover:bg-gray-50 transition disabled:opacity-50 inline-flex items-center justify-center gap-2 border border-gray-200"
                        title="آخر موقع مسجل"
                      >
                        <Navigation className="w-4 h-4 text-blue-700" />
                        {driverLocLoading[d.id] ? 'تحميل...' : 'آخر موقع'}
                      </button>
                      <button
                        type="button"
                        onClick={() => loadDriverLocationHistory(d)}
                        disabled={Boolean(driverLocLoading[d.id])}
                        className="w-full px-2.5 py-2 rounded-lg bg-white text-gray-900 text-xs sm:text-sm font-bold hover:bg-gray-50 transition disabled:opacity-50 inline-flex items-center justify-center gap-2 border border-gray-200"
                        title="سجل حركة (آخر 20 نقطة)"
                      >
                        <MapPin className="w-4 h-4 text-gray-700" />
                        سجل حركة
                      </button>
                      {d.user_id && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(d.user_id || '')
                              toast.success('تم نسخ User ID')
                            } catch {
                              toast.error('تعذر النسخ')
                            }
                          }}
                          className="w-full px-2.5 py-2 rounded-lg bg-white text-gray-900 text-xs sm:text-sm font-bold hover:bg-gray-50 transition inline-flex items-center justify-center gap-2 border border-gray-200"
                          title="نسخ معرف الحساب"
                        >
                          <Copy className="w-4 h-4 text-gray-700" />
                          المعرّف
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleDriverActive(d.id, !d.is_active)}
                        className={`w-full px-2.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition ${
                          d.is_active
                            ? 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100 border border-yellow-200'
                            : 'bg-green-50 text-green-800 hover:bg-green-100 border border-green-200'
                        }`}
                        title={d.is_active ? 'تعطيل السائق' : 'تفعيل السائق'}
                      >
                        {d.is_active ? 'تعطيل' : 'تفعيل'}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteDriver(d.id)}
                        className="w-full px-2.5 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs sm:text-sm font-bold transition inline-flex items-center justify-center gap-2"
                        title="حذف السائق"
                      >
                        <Trash2 className="w-4 h-4" />
                        حذف
                      </button>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          )
        })}

        {filteredDrivers.length === 0 && (
          <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4">
            لا يوجد سائقون بعد. اضغط &quot;إضافة سائق&quot; لإنشاء أول سائق.
          </div>
        )}
      </div>
    </div>
  )
}

