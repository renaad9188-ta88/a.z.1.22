'use client'

import { Route, MapPin, ChevronDown, ChevronUp, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'

interface Stop {
  name: string
  lat: number
  lng: number
  order_index: number
  image_url?: string | null
  id?: string
}

interface StopsListModalProps {
  stops: Stop[]
  isArrivalTrip: boolean
  isMinimized: boolean
  onToggleMinimize: () => void
  onClose: () => void
}

export default function StopsListModal({
  stops,
  isArrivalTrip,
  isMinimized,
  onToggleMinimize,
  onClose,
}: StopsListModalProps) {
  const supabase = createSupabaseBrowserClient()
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [loadingImages, setLoadingImages] = useState(true)

  // تحميل signed URLs للصور
  useEffect(() => {
    if (stops.length === 0) {
      setLoadingImages(false)
      return
    }

    const loadSignedUrls = async () => {
      try {
        setLoadingImages(true)
        const urlMap: Record<string, string> = {}
        
        await Promise.all(
          stops.map(async (stop) => {
            if (stop.image_url && stop.id) {
              try {
                // استخراج مسار الملف من URL
                const urlParts = stop.image_url.split('/')
                const fileName = urlParts.slice(urlParts.indexOf('route-stops')).join('/')
                
                if (fileName && fileName !== stop.image_url) {
                  const { data, error } = await supabase.storage
                    .from('passports')
                    .createSignedUrl(fileName, 3600) // ساعة واحدة
                  
                  if (!error && data?.signedUrl) {
                    urlMap[stop.id] = data.signedUrl
                  } else {
                    // إذا فشل signed URL، استخدم public URL
                    urlMap[stop.id] = stop.image_url
                  }
                } else {
                  urlMap[stop.id] = stop.image_url
                }
              } catch (e) {
                console.error('Error loading signed URL for stop:', stop.id, e)
                urlMap[stop.id] = stop.image_url || ''
              }
            }
          })
        )
        
        setSignedUrls(urlMap)
      } catch (e) {
        console.error('Error loading signed URLs:', e)
      } finally {
        setLoadingImages(false)
      }
    }

    loadSignedUrls()
  }, [stops, supabase])

  return (
    <>
      {/* Backdrop لإغلاق القائمة */}
      <div 
        className="pointer-events-auto absolute inset-0 z-30"
        onClick={onClose}
      />
      
      <div className={`pointer-events-none absolute top-20 md:top-16 right-3 w-[min(22rem,calc(100vw-2rem))] sm:w-[min(28rem,calc(100vw-2rem))] max-h-[70vh] z-40 transition-all duration-300 ${isMinimized ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100'}`}>
        <div className="pointer-events-auto bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/80 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200/60 bg-gradient-to-r from-blue-50/80 to-indigo-50/80">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Route className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-gray-900">
                  {isArrivalTrip ? 'نقاط النزول' : 'نقاط الصعود'}
                </h3>
                <span className="text-[10px] text-gray-600 font-semibold">
                  {stops.length} محطة
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onToggleMinimize}
                className="p-2 hover:bg-white/60 rounded-lg transition-colors"
                aria-label={isMinimized ? "استرجاع" : "تصغير"}
              >
                {isMinimized ? (
                  <ChevronUp className="w-4 h-4 text-gray-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                )}
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/60 rounded-lg transition-colors"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Stops List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[calc(70vh-4rem)] custom-scrollbar">
            {stops.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-semibold">لا توجد نقاط توقف</p>
              </div>
            ) : (
              stops.map((stop, idx) => {
                const stopNumber = (stop.order_index ?? idx) + 1
                const imageUrl = stop.id ? signedUrls[stop.id] || stop.image_url : stop.image_url
                const hasImage = Boolean(imageUrl)
                
                return (
                  <div
                    key={stop.id || idx}
                    className="group relative bg-gradient-to-br from-white to-blue-50/30 rounded-xl p-4 border-2 border-blue-100/60 hover:border-blue-300 hover:shadow-lg transition-all duration-300 overflow-hidden"
                  >
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-5">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-400" />
                    </div>
                    
                    <div className="relative flex items-start gap-4">
                      {/* Stop Number Badge */}
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl flex items-center justify-center text-sm font-extrabold shadow-lg flex-shrink-0 ring-2 ring-white">
                        {stopNumber}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Stop Name */}
                        <div className="flex items-start gap-2 mb-2">
                          <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          <h4 className="text-sm font-extrabold text-gray-900 break-words leading-tight">
                            {stop.name || `نقطة توقف ${stopNumber}`}
                          </h4>
                        </div>
                        
                        {/* Image */}
                        {hasImage && (
                          <div className="mt-3 rounded-lg overflow-hidden border-2 border-blue-200/60 shadow-md group-hover:shadow-xl transition-shadow">
                            {loadingImages ? (
                              <div className="w-full h-32 bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                              </div>
                            ) : (
                              <img
                                src={imageUrl || ''}
                                alt={stop.name || `محطة ${stopNumber}`}
                                className="w-full h-32 sm:h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  // إخفاء الصورة عند فشل التحميل
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            )}
                          </div>
                        )}
                        
                        {/* Coordinates (optional, يمكن إخفاؤه) */}
                        {stop.lat && stop.lng && (
                          <div className="text-[10px] text-gray-400 mt-2 font-mono">
                            📍 {Number(stop.lat).toFixed(5)}, {Number(stop.lng).toFixed(5)}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Decorative Corner */}
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-400/20 to-transparent rounded-bl-full" />
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #3b82f6, #6366f1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #2563eb, #4f46e5);
        }
      `}</style>
    </>
  )
}




