'use client'

import { Route, MapPin, ChevronDown, ChevronUp, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
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
  
  // Drag state for mobile
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [currentY, setCurrentY] = useState(0)
  const [isBottomSheet, setIsBottomSheet] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsBottomSheet(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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

  // Touch handlers for drag
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isBottomSheet) return
    setIsDragging(true)
    setDragStartY(e.touches[0].clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !isBottomSheet) return
    const currentTouchY = e.touches[0].clientY
    const deltaY = currentTouchY - dragStartY
    
    // Only allow dragging down
    if (deltaY > 0) {
      setCurrentY(deltaY)
    }
  }

  const handleTouchEnd = () => {
    if (!isDragging || !isBottomSheet) return
    
    // If dragged more than 100px, close the modal
    if (currentY > 100) {
      onClose()
    }
    
    // Reset drag state
    setIsDragging(false)
    setCurrentY(0)
    setDragStartY(0)
  }

  // Mouse handlers for desktop drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isBottomSheet) return
    setIsDragging(true)
    setDragStartY(e.clientY)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !isBottomSheet) return
    const deltaY = e.clientY - dragStartY
    
    if (deltaY > 0) {
      setCurrentY(deltaY)
    }
  }

  const handleMouseUp = () => {
    if (!isDragging || !isBottomSheet) return
    
    if (currentY > 100) {
      onClose()
    }
    
    setIsDragging(false)
    setCurrentY(0)
    setDragStartY(0)
  }

  // Reset drag on window mouse up
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging || !isBottomSheet) return
      const deltaY = e.clientY - dragStartY
      
      if (deltaY > 0) {
        setCurrentY(deltaY)
      }
    }

    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false)
        if (currentY > 100) {
          onClose()
        }
        setCurrentY(0)
        setDragStartY(0)
      }
    }

    if (isDragging) {
      window.addEventListener('mouseup', handleGlobalMouseUp)
      window.addEventListener('mousemove', handleGlobalMouseMove)
    }

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp)
      window.removeEventListener('mousemove', handleGlobalMouseMove)
    }
  }, [isDragging, currentY, dragStartY, isBottomSheet, onClose])

  const transformY = isBottomSheet ? (isMinimized ? 'calc(100vh - 4rem)' : currentY) : 0
  const opacity = isMinimized && !isBottomSheet ? 0 : 1

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`pointer-events-auto fixed inset-0 z-30 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ${
          isMinimized ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div 
        ref={modalRef}
        className={`pointer-events-none fixed z-40 transition-all duration-300 ease-out ${
          isBottomSheet 
            ? `left-0 right-0 bottom-0 ${isMinimized ? 'translate-y-full' : ''}`
            : 'top-4 md:top-6 right-3 sm:right-4 md:right-6'
        }`}
        style={{
          transform: isBottomSheet 
            ? `translateY(${transformY}px)` 
            : `translateY(${isMinimized ? '-20px' : '0'}) scale(${isMinimized ? 0.95 : 1})`,
          opacity,
          maxHeight: isBottomSheet ? '85vh' : 'calc(100vh - 2rem)',
          width: isBottomSheet 
            ? '100%' 
            : 'calc(100vw - 1.5rem)',
          maxWidth: isBottomSheet 
            ? '100%' 
            : 'min(28rem, calc(100vw - 1.5rem))',
        }}
      >
        <div 
          className={`pointer-events-auto bg-white/95 backdrop-blur-xl rounded-t-3xl ${
            isBottomSheet ? 'rounded-b-none shadow-2xl' : 'rounded-2xl shadow-2xl'
          } border border-gray-200/80 flex flex-col overflow-hidden h-full`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={isBottomSheet ? handleMouseDown : undefined}
        >
          {/* Drag Handle for Mobile */}
          {isBottomSheet && (
            <div 
              ref={headerRef}
              className="flex items-center justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none"
            >
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200/60 bg-gradient-to-r from-blue-50/80 to-indigo-50/80">
            <div className="flex items-center gap-2 sm:gap-2.5 flex-1 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg flex-shrink-0">
                <Route className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xs sm:text-sm font-extrabold text-gray-900 truncate">
                  {isArrivalTrip ? 'نقاط النزول' : 'نقاط الصعود'}
                </h3>
                <span className="text-[10px] sm:text-[11px] text-gray-600 font-semibold">
                  {stops.length} محطة
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {!isBottomSheet && (
                <button
                  onClick={onToggleMinimize}
                  className="p-1.5 sm:p-2 hover:bg-white/60 rounded-lg transition-colors"
                  aria-label={isMinimized ? "استرجاع" : "تصغير"}
                >
                  {isMinimized ? (
                    <ChevronUp className="w-4 h-4 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  )}
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 hover:bg-white/60 rounded-lg transition-colors"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Stops List */}
          <div 
            className={`flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3 ${
              isBottomSheet ? 'max-h-[calc(85vh-5rem)]' : 'max-h-[calc(100vh-8rem)]'
            } custom-scrollbar`}
          >
            {stops.length === 0 ? (
              <div className="text-center py-8 sm:py-12 text-gray-500 text-sm">
                <MapPin className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-semibold text-xs sm:text-sm">لا توجد نقاط توقف</p>
              </div>
            ) : (
              stops.map((stop, idx) => {
                const stopNumber = (stop.order_index ?? idx) + 1
                const imageUrl = stop.id ? signedUrls[stop.id] || stop.image_url : stop.image_url
                const hasImage = Boolean(imageUrl)
                
                return (
                  <div
                    key={stop.id || idx}
                    className="group relative bg-gradient-to-br from-white to-blue-50/30 rounded-lg sm:rounded-xl p-3 sm:p-4 border-2 border-blue-100/60 hover:border-blue-300 hover:shadow-lg transition-all duration-300 overflow-hidden"
                  >
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-5">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-400" />
                    </div>
                    
                    <div className="relative flex items-start gap-3 sm:gap-4">
                      {/* Stop Number Badge */}
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-lg sm:rounded-xl flex items-center justify-center text-xs sm:text-sm font-extrabold shadow-lg flex-shrink-0 ring-2 ring-white">
                        {stopNumber}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Stop Name */}
                        <div className="flex items-start gap-2 mb-2">
                          <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          <h4 className="text-xs sm:text-sm font-extrabold text-gray-900 break-words leading-tight">
                            {stop.name || `نقطة توقف ${stopNumber}`}
                          </h4>
                        </div>
                        
                        {/* Image */}
                        {hasImage && (
                          <div className="mt-2 sm:mt-3 rounded-lg overflow-hidden border-2 border-blue-200/60 shadow-md group-hover:shadow-xl transition-shadow">
                            {loadingImages ? (
                              <div className="w-full h-24 sm:h-32 md:h-40 bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                                <div className="w-6 h-6 sm:w-8 sm:h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                              </div>
                            ) : (
                              <img
                                src={imageUrl || ''}
                                alt={stop.name || `محطة ${stopNumber}`}
                                className="w-full h-24 sm:h-32 md:h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            )}
                          </div>
                        )}
                        
                        {/* Coordinates (optional) */}
                        {stop.lat && stop.lng && (
                          <div className="text-[9px] sm:text-[10px] text-gray-400 mt-1.5 sm:mt-2 font-mono">
                            📍 {Number(stop.lat).toFixed(5)}, {Number(stop.lng).toFixed(5)}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Decorative Corner */}
                    <div className="absolute top-0 right-0 w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-400/20 to-transparent rounded-bl-full" />
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




