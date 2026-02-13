'use client'

import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { X, Upload } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { createNotification } from '@/lib/notifications'

type Props = {
  userId: string
  initialFullName?: string | null
  initialCity?: string | null
  onClose: () => void
  onCreated: (requestId: string) => void
}

export default function CreateVisitRequestForUserModal({
  userId,
  initialFullName,
  initialCity,
  onClose,
  onCreated,
}: Props) {
  const supabase = createSupabaseBrowserClient()
  const [saving, setSaving] = useState(false)

  const [fullName, setFullName] = useState(initialFullName || '')
  const [city, setCity] = useState(initialCity || '')
  const [passportImage, setPassportImage] = useState<File | null>(null)

  const canSave = useMemo(() => Boolean(fullName.trim() && city.trim() && passportImage), [fullName, city, passportImage])

  const uploadPassport = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت')
    }
    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `${userId}/${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage.from('passports').upload(fileName, file)
    if (upErr) throw upErr

    const { data } = supabase.storage.from('passports').getPublicUrl(fileName)
    return data.publicUrl
  }

  const handleCreate = async () => {
    if (!canSave || !passportImage) return
    setSaving(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const adminId = auth?.user?.id || null

      const passportUrl = await uploadPassport(passportImage)
      const today = new Date().toISOString().split('T')[0]
      const stamp = new Date().toISOString()

      const adminNote = `\n\n=== إنشاء من الإدارة ===\nتم إنشاء هذا الطلب من قبل الإدارة لمساعدة المستخدم.\nمعرّف الإدمن: ${adminId || '—'}\nتاريخ الإنشاء: ${stamp}`

      const { data, error } = await supabase
        .from('visit_requests')
        .insert({
          user_id: userId,
          visitor_name: fullName.trim(),
          city: city.trim(),
          passport_image_url: passportUrl,
          status: 'pending',
          // قيم افتراضية لتوافق مخطط الجدول الحالي
          nationality: 'سوري',
          passport_number: 'N/A',
          passport_expiry: today,
          visit_type: 'visit',
          travel_date: today,
          days_count: 1,
          companions_count: 0,
          deposit_paid: false,
          admin_notes: adminNote,
          created_at: stamp,
          updated_at: stamp,
        } as any)
        .select('id')
        .single()

      if (error) throw error

      // إشعار للمستخدم بأن الإدارة أنشأت الطلب له (غير معيق للعملية)
      try {
        await createNotification(
          {
            userId,
            title: 'تم إنشاء طلب زيارة لك',
            message: `تم إنشاء طلب زيارة باسم: ${fullName.trim()}.\nسيتم متابعة الطلب من الإدارة.`,
            type: 'info',
            relatedType: 'request',
            relatedId: data.id,
          },
          supabase
        )
      } catch (e) {
        console.error('notify user create request error:', e)
      }

      toast.success('تم إنشاء الطلب للمستخدم')
      onCreated(data.id)
    } catch (e: any) {
      console.error('CreateVisitRequestForUserModal error:', e)
      toast.error(e?.message || 'تعذر إنشاء الطلب')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-base font-extrabold text-gray-900">إنشاء طلب زيارة للمستخدم</p>
            <p className="text-xs text-gray-600 mt-1">ارفع صورة الجواز وأدخل الاسم + مكان الانطلاق</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">الاسم الكامل</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
              placeholder="اسم المستخدم"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">مكان الانطلاق</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
              placeholder="مثلاً: الشام"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">صورة الجواز</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPassportImage(e.target.files?.[0] || null)}
              className="w-full text-sm"
            />
            <p className="text-[11px] text-gray-600 mt-1">يفضل صورة واضحة (أقل من 5MB).</p>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-800 font-bold text-sm hover:bg-gray-50"
          >
            إلغاء
          </button>
          <button
            onClick={handleCreate}
            disabled={!canSave || saving}
            className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {saving ? 'جاري الإنشاء...' : 'إنشاء الطلب'}
          </button>
        </div>
      </div>
    </div>
  )
}


