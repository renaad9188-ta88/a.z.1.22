'use client'

import { useState } from 'react'
import { Phone, Bus, MapPin, Navigation, Copy, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Driver, DriverAccount, DriverLocationLite, DriverLiveLite } from './types'

interface DriverCardProps {
  driver: Driver
  account: DriverAccount | null
  routesCount: number
  lastLocation: DriverLocationLite | null
  liveStatus: DriverLiveLite | null
  locationLoading: boolean
  onLoadLastLocation: () => void
  onLoadLocationHistory: () => void
  onToggleActive: (nextActive: boolean) => void
  onDelete: () => void
}

export default function DriverCard({
  driver,
  account,
  routesCount,
  lastLocation,
  liveStatus,
  locationLoading,
  onLoadLastLocation,
  onLoadLocationHistory,
  onToggleActive,
  onDelete,
}: DriverCardProps) {
  const normalizePhoneForWhatsApp = (raw: string) => {
    const digits = (raw || '').replace(/[^\d]/g, '')
    return digits.length >= 10 ? digits : ''
  }

  const normalizePhoneForTel = (raw: string) => (raw || '').replace(/[^\d+]/g, '')

  const waDigits = normalizePhoneForWhatsApp(driver.phone || '')
  const waHref = waDigits
    ? `https://wa.me/${waDigits}`
    : `https://wa.me/?text=${encodeURIComponent(`تواصل مع السائق: ${driver.name} — ${driver.phone}`)}`
  const telDigits = normalizePhoneForTel(driver.phone || '')
  const telHref = telDigits ? `tel:${telDigits}` : ''
  const mapHref = lastLocation ? `https://www.google.com/maps?q=${lastLocation.lat},${lastLocation.lng}` : ''

  return (
    <div className="border border-gray-200 rounded-xl p-3 sm:p-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 lg:gap-4">
        <div className="min-w-0 flex-1 lg:pr-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-gray-900">{driver.name}</span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full border ${
                driver.is_active
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-gray-50 text-gray-700 border-gray-200'
              }`}
            >
              {driver.is_active ? 'نشط' : 'غير نشط'}
            </span>
            {liveStatus?.is_available ? (
              <span className="text-[11px] px-2 py-0.5 rounded-full border bg-green-600 text-white border-green-700">
                متاح
              </span>
            ) : (
              <span className="text-[11px] px-2 py-0.5 rounded-full border bg-gray-200 text-gray-800 border-gray-300">
                غير متاح
              </span>
            )}
            {driver.user_id ? (
              <span className="text-[11px] px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                مربوط بحساب
              </span>
            ) : (
              <span className="text-[11px] px-2 py-0.5 rounded-full border bg-yellow-50 text-yellow-800 border-yellow-200">
                بدون حساب
              </span>
            )}
          </div>
          <div className="mt-1 text-xs sm:text-sm text-gray-700 flex flex-wrap gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1">
              <Phone className="w-4 h-4 text-gray-500" />
              {driver.phone}
            </span>
            <span className="inline-flex items-center gap-1">
              <Bus className="w-4 h-4 text-gray-500" />
              {driver.vehicle_type} • {driver.seats_count} مقعد
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-4 h-4 text-gray-500" />
              خطوط مربوطة: {routesCount}
            </span>
          </div>
          {account && (
            <div className="mt-1 text-[11px] sm:text-xs text-gray-600">
              حساب: {account.full_name || 'بدون اسم'} — {account.phone || 'بدون رقم'} — الدور الحالي:{' '}
              {account.role || 'user'}
            </div>
          )}
          {lastLocation && (
            <div className="mt-2 text-[11px] sm:text-xs text-gray-600">
              آخر موقع: {new Date(lastLocation.updated_at).toLocaleString('ar-JO')} •{' '}
              <a
                href={mapHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 font-bold hover:underline"
              >
                فتح على الخريطة
              </a>
            </div>
          )}
          {liveStatus?.updated_at && (
            <div className="mt-1 text-[11px] sm:text-xs text-gray-500">
              حالة متاح: آخر تحديث {new Date(liveStatus.updated_at).toLocaleString('ar-JO')}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2 w-full lg:w-auto lg:flex-shrink-0">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full px-2.5 py-2 rounded-lg bg-green-600 text-white text-xs sm:text-sm font-bold hover:bg-green-700 transition inline-flex items-center justify-center gap-2 whitespace-nowrap"
            title="تواصل واتساب"
          >
            <Phone className="w-4 h-4 flex-shrink-0" />
            واتساب
          </a>
          {telHref && (
            <a
              href={telHref}
              className="w-full px-2.5 py-2 rounded-lg bg-amber-50 text-amber-900 text-xs sm:text-sm font-bold hover:bg-amber-100 transition inline-flex items-center justify-center gap-2 border border-amber-200 whitespace-nowrap"
              title="اتصال مباشر"
            >
              <Phone className="w-4 h-4 flex-shrink-0" />
              اتصال
            </a>
          )}
          <button
            type="button"
            onClick={onLoadLastLocation}
            disabled={locationLoading}
            className="w-full px-2.5 py-2 rounded-lg bg-blue-600 text-white text-xs sm:text-sm font-bold hover:bg-blue-700 transition disabled:opacity-50 inline-flex items-center justify-center gap-2 whitespace-nowrap"
            title="آخر موقع مسجل"
          >
            <Navigation className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{locationLoading ? 'تحميل...' : 'آخر موقع'}</span>
          </button>
          <button
            type="button"
            onClick={onLoadLocationHistory}
            disabled={locationLoading}
            className="w-full px-2.5 py-2 rounded-lg bg-gray-100 text-gray-800 text-xs sm:text-sm font-bold hover:bg-gray-200 transition disabled:opacity-50 inline-flex items-center justify-center gap-2 whitespace-nowrap"
            title="سجل حركة (آخر 20 نقطة)"
          >
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">سجل حركة</span>
          </button>
          {driver.user_id && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(driver.user_id || '')
                  toast.success('تم نسخ User ID')
                } catch {
                  toast.error('تعذر النسخ')
                }
              }}
              className="w-full px-2.5 py-2 rounded-lg bg-gray-100 text-gray-800 text-xs sm:text-sm font-bold hover:bg-gray-200 transition inline-flex items-center justify-center gap-2 whitespace-nowrap"
              title="نسخ معرف الحساب (يُستخدم للربط والصلاحيات)"
            >
              <Copy className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">معرف الحساب</span>
              <span className="sm:hidden truncate">المعرّف</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onToggleActive(!driver.is_active)}
            className={`w-full px-2.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition whitespace-nowrap ${
              driver.is_active
                ? 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100 border border-yellow-200'
                : 'bg-green-50 text-green-800 hover:bg-green-100 border border-green-200'
            }`}
            title={driver.is_active ? 'تعطيل السائق (لن يظهر للحجز/التعيين)' : 'تفعيل السائق'}
          >
            {driver.is_active ? 'تعطيل' : 'تفعيل'}
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="w-full px-2.5 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs sm:text-sm font-bold transition inline-flex items-center justify-center gap-2 whitespace-nowrap"
            title="حذف السائق"
          >
            <Trash2 className="w-4 h-4 flex-shrink-0" />
            حذف
          </button>
        </div>
      </div>
    </div>
  )
}

