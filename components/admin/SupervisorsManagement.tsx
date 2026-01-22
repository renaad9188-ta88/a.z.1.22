'use client'

import { useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { UserPlus, UserX, Users, Search, Shield, CheckCircle2, Eye, Edit, Info } from 'lucide-react'

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
  const [selectedUserId, setSelectedUserId] = useState('')
  const [saving, setSaving] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<ProfileRow[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showPermissions, setShowPermissions] = useState(false)

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
    loadAvailableUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadAvailableUsers = async () => {
    try {
      setLoadingUsers(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone, jordan_phone, whatsapp_phone, role')
        .neq('role', 'supervisor')
        .order('full_name', { ascending: true, nullsFirst: false })
        .limit(500)

      if (error) throw error
      setAvailableUsers((data || []) as any)
    } catch (e: any) {
      console.error('Load available users error:', e)
      toast.error(e?.message || 'تعذر تحميل قائمة المنتسبين')
      setAvailableUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return availableUsers
    return availableUsers.filter(
      (u) =>
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q) ||
        (u.jordan_phone || '').toLowerCase().includes(q) ||
        (u.whatsapp_phone || '').toLowerCase().includes(q) ||
        (u.user_id || '').toLowerCase().includes(q)
    )
  }, [availableUsers, searchQuery])

  const addSupervisor = async () => {
    if (!selectedUserId) {
      toast.error('اختر مستخدماً من القائمة')
      return
    }
    try {
      setSaving(true)
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'supervisor', updated_at: new Date().toISOString() })
        .eq('user_id', selectedUserId)

      if (error) throw error
      toast.success('تم إضافة المشرف بنجاح')
      setSelectedUserId('')
      setSearchQuery('')
      await load()
      await loadAvailableUsers()
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
      await loadAvailableUsers()
    } catch (e: any) {
      console.error('Remove supervisor error:', e)
      toast.error(e?.message || 'تعذر إزالة المشرف')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-extrabold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              إدارة المشرفين
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              إضافة مشرفين وإدارة صلاحياتهم في المنصة
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowPermissions(!showPermissions)}
              className="px-3 py-2 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 text-xs sm:text-sm font-bold inline-flex items-center gap-2"
            >
              <Info className="w-4 h-4" />
              <span className="hidden sm:inline">صلاحيات المشرف</span>
              <span className="sm:hidden">الصلاحيات</span>
            </button>
            <button
              type="button"
              onClick={load}
              className="px-3 py-2 rounded-lg bg-gray-100 text-gray-900 hover:bg-gray-200 text-xs sm:text-sm font-bold"
              disabled={loading || saving}
            >
              تحديث
            </button>
          </div>
        </div>

        {/* Permissions Info */}
        {showPermissions && (
          <div className="mb-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-blue-600" />
              <h4 className="text-sm sm:text-base font-extrabold text-gray-900">صلاحيات المشرف</h4>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Eye className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs sm:text-sm font-bold text-gray-900 mb-1">عرض الطلبات</div>
                  <div className="text-[11px] sm:text-xs text-gray-700">
                    يمكن للمشرف رؤية الطلبات المعيّنة له فقط (assigned_to)
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Edit className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs sm:text-sm font-bold text-gray-900 mb-1">تعديل الطلبات</div>
                  <div className="text-[11px] sm:text-xs text-gray-700">
                    يمكن للمشرف تحديث الطلبات المعيّنة له فقط
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs sm:text-sm font-bold text-gray-900 mb-1">تأكيد الدفعة</div>
                  <div className="text-[11px] sm:text-xs text-gray-700">
                    يمكن للمشرف تأكيد استلام الدفعة (payment_verified) لفتح الحجز
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs sm:text-sm font-bold text-gray-900 mb-1">إدارة الملفات الشخصية</div>
                  <div className="text-[11px] sm:text-xs text-gray-700">
                    يمكن للمشرف إدارة ملفات المنتسبين (profiles)
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-200">
                <div className="text-[11px] sm:text-xs text-gray-600 font-bold">
                  ⚠️ ملاحظة: المشرف لا يمكنه رؤية جميع الطلبات، فقط الطلبات المعيّنة له من قبل الإدارة
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Supervisor */}
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 sm:p-4 mb-4">
          <div className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-600" />
            إضافة مشرف جديد
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                اختر منتسباً من القائمة
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم أو الهاتف..."
                  className="w-full pl-3 pr-9 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>
            <div>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">-- اختر منتسباً --</option>
                {loadingUsers ? (
                  <option disabled>جاري التحميل...</option>
                ) : filteredUsers.length === 0 ? (
                  <option disabled>لا يوجد منتسبين متاحين</option>
                ) : (
                  filteredUsers.map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.full_name || 'بدون اسم'} — {u.phone || u.jordan_phone || u.whatsapp_phone || u.user_id.slice(0, 8)} —{' '}
                      {u.role || 'user'}
                    </option>
                  ))
                )}
              </select>
              {selectedUserId && (
                <p className="mt-1 text-[11px] text-gray-600">
                  تم الاختيار: {filteredUsers.find((u) => u.user_id === selectedUserId)?.full_name || 'غير معروف'}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={addSupervisor}
              disabled={saving || !selectedUserId}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <UserPlus className="w-4 h-4" />
              {saving ? 'جاري الإضافة...' : 'إضافة مشرف'}
            </button>
          </div>
          <p className="text-[11px] text-gray-700 mt-3">
            ملاحظة: المستخدم يجب أن يكون موجوداً في جدول المنتسبين (profiles) مسبقاً.
          </p>
        </div>

        {/* Supervisors List */}
        <div>
          <h4 className="text-sm sm:text-base font-extrabold text-gray-900 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            قائمة المشرفين ({rows.length})
          </h4>
          {loading ? (
            <div className="text-sm text-gray-600 text-center py-4">جاري التحميل...</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              لا يوجد مشرفين حالياً. استخدم النموذج أعلاه لإضافة مشرف جديد.
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((p) => (
                <div
                  key={p.user_id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-extrabold text-gray-900 truncate">{p.full_name || 'مشرف'}</div>
                      <span className="text-[11px] px-2 py-0.5 rounded-full border bg-blue-50 text-blue-800 border-blue-200 font-bold">
                        مشرف
                      </span>
                    </div>
                    <div className="mt-1 text-xs sm:text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                      <span>📱 {p.phone || p.jordan_phone || p.whatsapp_phone || 'لا يوجد رقم'}</span>
                      <span className="text-[10px] text-gray-500 font-mono">ID: {p.user_id.slice(0, 8)}...</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSupervisor(p.user_id)}
                    disabled={saving}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 border border-red-100 hover:bg-red-100 text-xs sm:text-sm font-bold disabled:opacity-60 transition"
                  >
                    <UserX className="w-4 h-4" />
                    إزالة المشرف
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}




