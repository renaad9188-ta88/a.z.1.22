'use client'

import { useState, useRef } from 'react'
import { ArrowDown, ArrowUp, Edit, Plus, Trash2, Upload, X, Image as ImageIcon } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

export type EditorStop = { id: string; name: string; image_url?: string | null }

export default function RouteStopsEditor({
  title,
  colorClass,
  stops,
  addMode,
  onToggleAddMode,
  onMove,
  onEdit,
  onDelete,
  onImageUpload,
}: {
  title: string
  colorClass: string
  stops: EditorStop[]
  addMode: boolean
  onToggleAddMode: () => void
  onMove: (index: number, dir: -1 | 1) => void
  onEdit: (index: number) => void
  onDelete: (index: number) => void
  onImageUpload?: (stopId: string, imageUrl: string) => void
}) {
  const supabase = createSupabaseBrowserClient()
  const [uploadingImage, setUploadingImage] = useState<string | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const handleImageUpload = async (stopId: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت')
      return
    }

    try {
      setUploadingImage(stopId)
      const fileExt = file.name.split('.').pop() || 'jpg'
      const fileName = `route-stops/${stopId}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('passports')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      // محاولة استخدام public URL أولاً
      const { data: publicData } = supabase.storage.from('passports').getPublicUrl(fileName)
      let imageUrl = publicData.publicUrl

      // إذا كان الـ bucket ليس public، استخدم signed URL
      try {
        const { data: signedData, error: signedError } = await supabase.storage
          .from('passports')
          .createSignedUrl(fileName, 31536000) // سنة واحدة
        
        if (!signedError && signedData?.signedUrl) {
          imageUrl = signedData.signedUrl
        }
      } catch (e) {
        // إذا فشل signed URL، استخدم public URL
        console.warn('Failed to create signed URL, using public URL:', e)
      }

      if (onImageUpload) {
        onImageUpload(stopId, imageUrl)
      }

      toast.success('تم رفع الصورة بنجاح')
    } catch (e: any) {
      console.error('Image upload error:', e)
      toast.error(e?.message || 'تعذر رفع الصورة')
    } finally {
      setUploadingImage(null)
    }
  }

  const handleDeleteImage = async (stopId: string, imageUrl: string) => {
    if (!confirm('هل تريد حذف هذه الصورة؟')) return
    try {
      // Extract file path from URL
      const urlParts = imageUrl.split('/')
      const fileName = urlParts.slice(urlParts.indexOf('route-stops')).join('/')
      
      const { error } = await supabase.storage.from('passports').remove([fileName])
      if (error) throw error

      if (onImageUpload) {
        onImageUpload(stopId, '')
      }

      toast.success('تم حذف الصورة')
    } catch (e: any) {
      console.error('Image delete error:', e)
      toast.error(e?.message || 'تعذر حذف الصورة')
    }
  }
  return (
    <div className="border border-gray-200 rounded-2xl p-3 bg-white">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-extrabold text-gray-900">{title}</p>
        <button
          type="button"
          onClick={onToggleAddMode}
          className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 sm:gap-2 border transition touch-manipulation ${
            addMode ? 'bg-gray-900 text-white border-gray-900' : `bg-white ${colorClass} border-gray-200 hover:bg-gray-50 active:bg-gray-100`
          }`}
          title={addMode ? 'إلغاء وضع الإضافة' : 'إضافة محطة من الخريطة'}
          style={{ touchAction: 'manipulation' }}
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
          <span className="whitespace-nowrap">{addMode ? 'إلغاء الإضافة' : 'إضافة محطة'}</span>
        </button>
      </div>

      <p className="mt-1 text-[11px] sm:text-xs text-gray-600 font-semibold">
        إضافة/تعديل/حذف/ترتيب — والمحطات مرسومة على الخريطة بخط متصل.
      </p>

      <div className="mt-3 space-y-2">
        {stops.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-xs text-gray-600 font-bold">
            لا توجد محطات بعد. اضغط &quot;إضافة محطة&quot; ثم انقر على الخريطة.
          </div>
        ) : (
          stops.map((s, idx) => (
            <div key={s.id} className="flex flex-col gap-2 p-2 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-extrabold flex-shrink-0">
                  {idx + 1}
                </span>
                <span className="flex-1 text-xs sm:text-sm font-bold text-gray-900 truncate">{s.name}</span>
                <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onMove(idx, -1)}
                  disabled={idx === 0}
                  className="p-1.5 sm:p-2 rounded-lg border border-gray-200 hover:bg-white active:bg-gray-100 disabled:opacity-30 touch-manipulation"
                  title="أعلى"
                  style={{ touchAction: 'manipulation', minWidth: '36px', minHeight: '36px' }}
                >
                  <ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onMove(idx, 1)}
                  disabled={idx === stops.length - 1}
                  className="p-1.5 sm:p-2 rounded-lg border border-gray-200 hover:bg-white active:bg-gray-100 disabled:opacity-30 touch-manipulation"
                  title="أسفل"
                  style={{ touchAction: 'manipulation', minWidth: '36px', minHeight: '36px' }}
                >
                  <ArrowDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(idx)}
                  className="p-1.5 sm:p-2 rounded-lg border border-gray-200 hover:bg-white active:bg-gray-100 touch-manipulation"
                  title="تعديل الاسم"
                  style={{ touchAction: 'manipulation', minWidth: '36px', minHeight: '36px' }}
                >
                  <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-700" />
                </button>
                  <button
                    type="button"
                    onClick={() => onDelete(idx)}
                    className="p-1.5 sm:p-2 rounded-lg border border-gray-200 hover:bg-white active:bg-gray-100 touch-manipulation"
                    title="حذف"
                    style={{ touchAction: 'manipulation', minWidth: '36px', minHeight: '36px' }}
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-700" />
                  </button>
                </div>
              </div>
              
              {/* Image Upload Section */}
              {onImageUpload && (
                <div className="flex items-center gap-2 mt-1 pt-2 border-t border-gray-200">
                  <input
                    ref={(el) => { fileInputRefs.current[s.id] = el }}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload(s.id, file)
                      if (e.target) e.target.value = ''
                    }}
                    className="hidden"
                    id={`image-upload-${s.id}`}
                  />
                  {s.image_url ? (
                    <div className="flex items-center gap-2 flex-1">
                      <div className="relative">
                        <img
                          src={s.image_url}
                          alt={s.name}
                          className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg border border-gray-300"
                          onError={(e) => {
                            const imageUrl: string | null | undefined = s.image_url
                            console.error('Image load error:', imageUrl)
                            // محاولة استخدام signed URL إذا فشل public URL
                            if (!imageUrl || typeof imageUrl !== 'string') return
                            const urlParts = imageUrl.split('/')
                            const routeStopsIndex = urlParts.indexOf('route-stops')
                            if (routeStopsIndex === -1) return
                            const fileName = urlParts.slice(routeStopsIndex).join('/')
                            if (fileName && fileName !== imageUrl) {
                              supabase.storage
                                .from('passports')
                                .createSignedUrl(fileName, 3600)
                                .then(({ data, error }) => {
                                  if (!error && data?.signedUrl) {
                                    e.currentTarget.src = data.signedUrl
                                  }
                                })
                                .catch((err) => {
                                  console.error('Failed to get signed URL:', err)
                                })
                            }
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(s.id, s.image_url!)}
                        className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-700"
                        title="حذف الصورة"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor={`image-upload-${s.id}`}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 cursor-pointer text-xs sm:text-sm font-bold text-gray-700"
                    >
                      {uploadingImage === s.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                          جاري الرفع...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          إضافة صورة (اختياري)
                        </>
                      )}
                    </label>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}


