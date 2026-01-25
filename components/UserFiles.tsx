'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { Download, Image as ImageIcon, Loader2, Trash2, Upload, ShieldAlert } from 'lucide-react'

type StorageItem = {
  name: string
  id?: string
  updated_at?: string
  created_at?: string
  last_accessed_at?: string
  metadata?: any
}

const BUCKET = 'user_passports'
const FOLDER = 'passports'

function sanitizeFileName(name: string) {
  // أبسط sanitize: إزالة المسافات والأحرف الغريبة
  return name
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9.\-_]/g, '')
}

async function downloadViaBlob(url: string, filename: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('تعذر تنزيل الملف')
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export default function UserFiles({ userId }: { userId: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const inputRef = useRef<HTMLInputElement | null>(null)

  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [items, setItems] = useState<StorageItem[]>([])
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})

  const prefix = `${userId}/${FOLDER}`

  const load = async () => {
    try {
      setLoading(true)
      setSignedUrls({})

      const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'updated_at', order: 'desc' },
      })
      if (error) throw error

      const clean = (data || []).filter((x) => x?.name && !x.name.endsWith('/'))
      setItems(clean)

      // Signed URLs للمعاينة (ساعة)
      const urlMap: Record<string, string> = {}
      await Promise.all(
        clean.map(async (it) => {
          const fullPath = `${prefix}/${it.name}`
          const { data: signed, error: signErr } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(fullPath, 60 * 60)
          if (!signErr && signed?.signedUrl) {
            urlMap[it.name] = signed.signedUrl
          }
        })
      )
      setSignedUrls(urlMap)
    } catch (e: any) {
      console.error('UserFiles load error:', e)
      toast.error(e?.message || 'تعذر تحميل الملفات')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const onPickFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const list = Array.from(files)
    const imagesOnly = list.filter((f) => f.type.startsWith('image/'))
    if (imagesOnly.length !== list.length) {
      toast.error('مسموح فقط برفع الصور')
      return
    }

    // حد تقريبي 8MB لكل صورة
    const tooLarge = imagesOnly.find((f) => f.size > 8 * 1024 * 1024)
    if (tooLarge) {
      toast.error('حجم الصورة كبير (الحد 8MB)')
      return
    }

    try {
      setUploading(true)
      for (const file of imagesOnly) {
        const safeName = sanitizeFileName(file.name || 'passport.jpg')
        const filename = `${Date.now()}-${safeName}`
        const path = `${prefix}/${filename}`
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
          upsert: false,
          contentType: file.type,
          cacheControl: '3600',
        })
        if (error) throw error
      }
      toast.success('تم رفع الصور بنجاح')
      await load()
      if (inputRef.current) inputRef.current.value = ''
    } catch (e: any) {
      console.error('Upload error:', e)
      toast.error(e?.message || 'تعذر رفع الملفات')
    } finally {
      setUploading(false)
    }
  }

  const onDelete = async (name: string) => {
    if (!confirm('هل تريد حذف هذه الصورة؟')) return
    try {
      const fullPath = `${prefix}/${name}`
      const { error } = await supabase.storage.from(BUCKET).remove([fullPath])
      if (error) throw error
      toast.success('تم حذف الصورة')
      await load()
    } catch (e: any) {
      console.error('Delete error:', e)
      toast.error(e?.message || 'تعذر حذف الصورة')
    }
  }

  const onDownload = async (name: string) => {
    try {
      const fullPath = `${prefix}/${name}`
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(fullPath, 60)
      if (error) throw error
      if (!data?.signedUrl) throw new Error('تعذر إنشاء رابط تنزيل')
      await downloadViaBlob(data.signedUrl, name)
      toast.success('تم بدء التنزيل')
    } catch (e: any) {
      console.error('Download error:', e)
      toast.error(e?.message || 'تعذر تنزيل الصورة')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-2 sm:px-3 md:px-4 py-3 sm:py-4 md:py-6 max-w-full overflow-x-hidden">
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">ملفاتي</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                حفظ صور الجوازات للاستعمال اللاحق — يمكنك رفعها هنا ثم تنزيلها على الهاتف عند الحاجة.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => onPickFiles(e.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  uploading
                    ? 'bg-gray-200 text-gray-700 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                رفع صور الجوازات
              </button>
            </div>
          </div>

          <div className="mt-4 sm:mt-5 bg-blue-50 border border-blue-100 rounded-lg p-3 sm:p-4 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-blue-700 mt-0.5" />
            <div className="text-xs sm:text-sm text-blue-900">
              <p className="font-bold mb-1">خصوصية وأمان</p>
              <p className="leading-relaxed">
                هذه الملفات خاصة بحسابك فقط. إذا ظهرت رسالة خطأ “Bucket not found”، يلزم إنشاء bucket
                <span className="font-mono mx-1">user_passports</span>
                وتفعيل السياسات (RLS) في Supabase.
              </p>
            </div>
          </div>

          <div className="mt-5">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
                  <p className="text-gray-600 text-sm">جاري التحميل...</p>
                </div>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-10">
                <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-600">لا توجد صور محفوظة بعد</p>
                <p className="text-xs text-gray-500 mt-1">ابدأ برفع صور الجوازات من الزر أعلاه</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {items.map((it) => {
                  const url = signedUrls[it.name]
                  return (
                    <div key={it.name} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                      <div className="aspect-[4/3] bg-gray-50 relative">
                        {url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={url} alt={it.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <ImageIcon className="w-10 h-10" />
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="text-[11px] text-gray-700 font-semibold truncate" title={it.name}>
                          {it.name}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => onDownload(it.name)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                            تنزيل
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(it.name)}
                            className="inline-flex items-center justify-center px-2 py-1.5 text-xs font-bold rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition border border-red-100"
                            title="حذف"
                            aria-label="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


