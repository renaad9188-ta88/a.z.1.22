'use client'

import { ChevronLeft } from 'lucide-react'

interface DriverInfo {
  name: string
  phone: string
  company_phone?: string | null
}

interface DriverInfoModalProps {
  driverInfo: DriverInfo | null
  loading: boolean
  onClose: () => void
}

export default function DriverInfoModal({
  driverInfo,
  loading,
  onClose,
}: DriverInfoModalProps) {
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // يمكن إضافة toast هنا لاحقاً
    } catch (e) {
      console.error('Failed to copy:', e)
    }
  }

  return (
    <>
      {/* Backdrop شفاف لإغلاق القائمة عند النقر خارجها */}
      <div 
        className="pointer-events-auto absolute inset-0 z-30"
        onClick={onClose}
      />
      <div className="pointer-events-none absolute bottom-3 right-3 w-[min(18rem,calc(100vw-2rem))] z-40 transition-all duration-300 opacity-100">
        <div className="pointer-events-auto bg-white/90 backdrop-blur-lg rounded-xl shadow-xl border border-gray-200/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900">معلومات السائق</h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100/50 rounded-lg transition-colors"
              aria-label="إغلاق"
            >
              <ChevronLeft className="w-4 h-4 text-gray-500 rotate-90" />
            </button>
          </div>
          
          {loading ? (
            <div className="text-center py-4 text-gray-500 text-xs">
              جاري تحميل معلومات السائق...
            </div>
          ) : driverInfo ? (
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">اسم السائق</div>
                <div className="text-sm font-semibold text-gray-900">{driverInfo.name}</div>
              </div>
              
              <div>
                <div className="text-xs text-gray-500 mb-1">رقم السائق</div>
                <div className="flex items-center gap-2">
                  <a 
                    href={`tel:${driverInfo.phone}`}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >
                    {driverInfo.phone}
                  </a>
                  <button
                    onClick={() => copyToClipboard(driverInfo.phone)}
                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 bg-gray-100 rounded transition-colors"
                    title="نسخ"
                  >
                    نسخ
                  </button>
                </div>
              </div>

              {driverInfo.company_phone && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">رقم الشركة</div>
                  <div className="flex items-center gap-2">
                    <a 
                      href={`tel:${driverInfo.company_phone}`}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                    >
                      {driverInfo.company_phone}
                    </a>
                    <button
                      onClick={() => copyToClipboard(driverInfo.company_phone!)}
                      className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 bg-gray-100 rounded transition-colors"
                      title="نسخ"
                    >
                      نسخ
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 text-xs">
              لا توجد معلومات متاحة
            </div>
          )}
        </div>
      </div>
    </>
  )
}




