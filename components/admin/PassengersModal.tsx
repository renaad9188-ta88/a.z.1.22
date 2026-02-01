'use client'

import { X, Users, Phone } from 'lucide-react'

interface Passenger {
  id: string
  visitor_name: string
  full_name?: string | null
  phone?: string | null
  companions_count?: number | null
}

interface PassengersModalProps {
  passengers: Passenger[]
  onClose: () => void
  normalizePhoneForWhatsApp: (phone: string) => string
}

export default function PassengersModal({
  passengers,
  onClose,
  normalizePhoneForWhatsApp,
}: PassengersModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-center justify-between z-10">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            قائمة الحاجزين ({passengers.length})
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        <div className="p-4 sm:p-6 space-y-3">
          {passengers.map((passenger, idx) => {
            const totalPeople = 1 + (passenger.companions_count || 0)
            const whatsappPhone = normalizePhoneForWhatsApp(passenger.phone || '')
            const whatsappUrl = whatsappPhone 
              ? `https://wa.me/${whatsappPhone}` 
              : `https://wa.me/?text=${encodeURIComponent(`تواصل مع ${passenger.visitor_name}`)}`
            
            return (
              <div key={passenger.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
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
                      {passenger.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                          <span>{passenger.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {passenger.phone && (
                    <div className="flex gap-2 flex-shrink-0">
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
                        واتساب
                      </a>
                      <a
                        href={`tel:${passenger.phone.replace(/\D/g, '')}`}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
                        اتصال
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          
          {passengers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              لا يوجد حاجزين في هذه الرحلة
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

