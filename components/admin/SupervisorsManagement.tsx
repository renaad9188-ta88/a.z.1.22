'use client'

import { useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { UserPlus, UserX, Users } from 'lucide-react'

type ProfileRow = {
  user_id: string
  full_name: string | null
  phone: string | null
  jordan_phone?: string | null
  whatsapp_phone?: string | null
  role: string | null
}

export default function SupervisorsManagement() {
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<ProfileRow[]>([])
  const [userIdInput, setUserIdInput] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone, jordan_phone, whatsapp_phone, role')
        .eq('role', 'supervisor')
        .order('updated_at', { ascending: false })

      if (error) throw error
      setRows((data || []) as any)
    } catch (e: any) {
      console.error('Load supervisors error:', e)
      toast.error(e?.message || 'تعذر تحميل قائمة المشرفين')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const normalizedUserId = useMemo(() => userIdInput.trim(), [userIdInput])

  const addSupervisor = async () => {
    if (!normalizedUserId) {
      toast.error('أدخل user_id للمستخدم')
      return
    }
    try {
      setSaving(true)
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'supervisor', updated_at: new Date().toISOString() })
        .eq('user_id', normalizedUserId)

      if (error) throw error
      toast.success('تم إضافة المشرف بنجاح')
      setUserIdInput('')
      await load()
    } catch (e: any) {
      console.error('Add supervisor error:', e)
      toast.error(e?.message || 'تعذر إضافة المشرف')
    } finally {
      setSaving(false)
    }
  }

  const removeSupervisor = async (userId: string) => {
    if (!confirm('إزالة صلاحية المشرف عن هذا المستخدم؟')) return
    try {
      setSaving(true)
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'user', updated_at: new Date().toISOString() })
        .eq('user_id', userId)

      if (error) throw error
      toast.success('تمت إزالة المشرف')
      await load()
    } catch (e: any) {
      console.error('Remove supervisor error:', e)
      toast.error(e?.message || 'تعذر إزالة المشرف')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-base sm:text-lg font-extrabold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          إدارة المشرفين
        </h3>
        <button
          type="button"
          onClick={load}
          className="text-xs font-semibold text-blue-700 hover:text-blue-800"
          disabled={loading || saving}
        >
          تحديث
        </button>
      </div>

      <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 sm:p-4 mb-4">
        <div className="text-sm font-bold text-gray-800 mb-2">إضافة مشرف</div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={userIdInput}
            onChange={(e) => setUserIdInput(e.target.value)}
            placeholder="User ID (UUID) للمستخدم"
            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            type="button"
            onClick={addSupervisor}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-bold disabled:opacity-60"
          >
            <UserPlus className="w-4 h-4" />
            إضافة
          </button>
        </div>
        <p className="text-[11px] text-gray-700 mt-2">
          ملاحظة: المستخدم لازم يكون عنده سجل في جدول `profiles` مسبقاً.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-gray-600">جاري التحميل...</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-gray-600">لا يوجد مشرفين حالياً.</div>
      ) : (
        <div className="space-y-2">
          {rows.map((p) => (
            <div key={p.user_id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200">
              <div className="min-w-0">
                <div className="font-bold text-gray-900 truncate">
                  {p.full_name || 'مشرف'}
                </div>
                <div className="text-xs text-gray-600 truncate">
                  {p.phone || p.jordan_phone || p.whatsapp_phone || p.user_id}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeSupervisor(p.user_id)}
                disabled={saving}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 border border-red-100 hover:bg-red-100 text-xs font-bold disabled:opacity-60"
              >
                <UserX className="w-4 h-4" />
                إزالة
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}




