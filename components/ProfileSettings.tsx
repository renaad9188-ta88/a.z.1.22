'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Save, User, Phone, MessageCircle } from 'lucide-react'

export default function ProfileSettings({
  userId,
  backHref = '/dashboard',
  backLabel = 'العودة للوحة التحكم',
}: {
  userId: string
  backHref?: string
  backLabel?: string
}) {
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    jordan_phone: '',
    whatsapp_phone: '',
    phone_readonly: '',
  })

  const load = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone, jordan_phone, whatsapp_phone')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error

      setForm({
        full_name: data?.full_name || '',
        jordan_phone: data?.jordan_phone || data?.phone || '',
        whatsapp_phone: data?.whatsapp_phone || '',
        phone_readonly: data?.phone || '',
      })
    } catch (e: any) {
      console.error('Error loading profile:', e)
      toast.error('حدث خطأ أثناء تحميل بيانات الحساب')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const save = async () => {
    try {
      setSaving(true)
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name.trim() || null,
          jordan_phone: form.jordan_phone.trim() || null,
          whatsapp_phone: form.whatsapp_phone.trim() || null,
        })
        .eq('user_id', userId)

      if (error) throw error
      toast.success('تم حفظ المعلومات')
      await load()
    } catch (e: any) {
      console.error('Save profile error:', e)
      toast.error(e?.message || 'تعذّر حفظ المعلومات')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-600 text-sm">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
        <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6 max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg sm:text-xl font-bold text-gray-800">تعديل المعلومات</h1>
            <Link href={backHref} className="text-sm text-blue-600 hover:text-blue-700 font-semibold">
              {backLabel}
            </Link>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم</label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  value={form.full_name}
                  onChange={(e) => setForm(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full pr-10 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="الاسم (مقطعين)"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">رقم الهاتف (المسجل)</label>
              <input
                value={form.phone_readonly}
                readOnly
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
              />
              <p className="mt-1 text-xs text-gray-500">هذا رقم التسجيل ولا يتم تغييره من هنا.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">هاتف أردني</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={form.jordan_phone}
                    onChange={(e) => setForm(prev => ({ ...prev, jordan_phone: e.target.value }))}
                    className="w-full pr-10 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="07XXXXXXXX"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">هاتف/واتساب سوري (اختياري)</label>
                <div className="relative">
                  <MessageCircle className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={form.whatsapp_phone}
                    onChange={(e) => setForm(prev => ({ ...prev, whatsapp_phone: e.target.value }))}
                    className="w-full pr-10 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="09XXXXXXXX أو +963XXXXXXXX"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={save}
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition font-semibold disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


