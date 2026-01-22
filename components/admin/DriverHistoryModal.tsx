'use client'

import type { Driver, DriverLocationLite } from './types'

interface DriverHistoryModalProps {
  driver: Driver
  history: DriverLocationLite[]
  onClose: () => void
}

export default function DriverHistoryModal({ driver, history, onClose }: DriverHistoryModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800">سجل حركة السائق: {driver.name}</h3>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-semibold"
            >
              إغلاق
            </button>
          </div>

          <div className="space-y-2">
            {history.length === 0 ? (
              <div className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                لا يوجد سجل حركة حالياً. تأكد أن السائق بدأ التتبع أثناء رحلة نشطة.
              </div>
            ) : (
              history.map((x, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg p-3">
                  <div className="text-sm text-gray-800">
                    <div className="font-bold">{new Date(x.updated_at).toLocaleString('ar-JO')}</div>
                    <div className="text-xs text-gray-500">طلب: #{String(x.request_id).slice(0, 8).toUpperCase()}</div>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${x.lat},${x.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs sm:text-sm font-bold hover:bg-blue-700 transition"
                  >
                    فتح
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

