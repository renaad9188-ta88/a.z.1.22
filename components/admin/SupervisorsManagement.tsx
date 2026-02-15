'use client'

import { useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { UserPlus, UserX, Users, Search, X, Shield, UserCheck, Phone, Power, PowerOff, BarChart3, Eye } from 'lucide-react'
import SupervisorPermissionsModal from './SupervisorPermissionsModal'
import SupervisorCustomersModal from './SupervisorCustomersModal'
import SupervisorStats from './SupervisorStats'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ProfileRow[]>([])
  const [selectedUser, setSelectedUser] = useState<ProfileRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [selectedSupervisorForPermissions, setSelectedSupervisorForPermissions] = useState<{ id: string; name: string } | null>(null)
  const [selectedSupervisorForCustomers, setSelectedSupervisorForCustomers] = useState<{ id: string; name: string } | null>(null)
  const [selectedSupervisorForStats, setSelectedSupervisorForStats] = useState<{ id: string; name: string } | null>(null)
  const [supervisorStatuses, setSupervisorStatuses] = useState<{ [key: string]: boolean }>({})

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

      // تحميل حالة التعطيل/التفعيل لكل مشرف
      if (data && data.length > 0) {
        const userIds = data.map((r: any) => r.user_id)
        const { data: statusData, error: statusError } = await supabase
          .from('supervisor_permissions')
          .select('supervisor_id, is_active')
          .in('supervisor_id', userIds)

        if (!statusError && statusData) {
          const statusMap: { [key: string]: boolean } = {}
          statusData.forEach((s: any) => {
            statusMap[s.supervisor_id] = s.is_active !== false // default true
          })
          // للمشرفين الذين ليس لديهم سجل في supervisor_permissions، افترض active = true
          userIds.forEach((id: string) => {
            if (!(id in statusMap)) {
              statusMap[id] = true
            }
          })
          setSupervisorStatuses(statusMap)
        } else {
          // إذا لم تكن هناك بيانات، افترض أن الجميع نشط
          const statusMap: { [key: string]: boolean } = {}
          userIds.forEach((id: string) => {
            statusMap[id] = true
          })
          setSupervisorStatuses(statusMap)
        }
      }
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

  // تطبيع رقم الهاتف للبحث
  const normalizePhoneForSearch = (phone: string) => {
    if (!phone) return ''
    let digits = phone.replace(/[^\d]/g, '')
    digits = digits.replace(/^0+/, '')
    if (!digits.startsWith('962') && digits.length > 0) {
      digits = '962' + digits
    }
    return digits
  }

  // البحث عن المستخدمين
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    try {
      const normalizedQuery = query.trim().toLowerCase()
      const normalizedPhone = normalizePhoneForSearch(query)

      // البحث في profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone, jordan_phone, whatsapp_phone, role')
        .or(`full_name.ilike.%${normalizedQuery}%,phone.ilike.%${normalizedQuery}%,jordan_phone.ilike.%${normalizedQuery}%,whatsapp_phone.ilike.%${normalizedQuery}%`)
        .neq('role', 'supervisor') // استثناء المشرفين الحاليين
        .order('updated_at', { ascending: false })
        .limit(20)

      if (error) throw error

      // فلترة إضافية بناءً على رقم الهاتف المطبيع
      const filtered = (data || []).filter((p: any) => {
        const matchesName = p.full_name?.toLowerCase().includes(normalizedQuery)
        const matchesPhone = 
          p.phone?.toLowerCase().includes(normalizedQuery) ||
          p.jordan_phone?.toLowerCase().includes(normalizedQuery) ||
          p.whatsapp_phone?.toLowerCase().includes(normalizedQuery) ||
          (normalizedPhone && (
            normalizePhoneForSearch(p.phone || '') === normalizedPhone ||
            normalizePhoneForSearch(p.jordan_phone || '') === normalizedPhone ||
            normalizePhoneForSearch(p.whatsapp_phone || '') === normalizedPhone
          ))
        return matchesName || matchesPhone
      })

      setSearchResults(filtered as any)
      setShowSearchResults(true)
    } catch (e: any) {
      console.error('Search users error:', e)
      toast.error('تعذر البحث عن المستخدمين')
      setSearchResults([])
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (value.trim()) {
      searchUsers(value)
    } else {
      setSearchResults([])
      setShowSearchResults(false)
      setSelectedUser(null)
    }
  }

  const handleSelectUser = (user: ProfileRow) => {
    setSelectedUser(user)
    setSearchQuery(user.full_name || user.phone || user.user_id)
    setShowSearchResults(false)
  }

  const addSupervisor = async () => {
    if (!selectedUser) {
      toast.error('اختر مستخدم من القائمة')
      return
    }

    if (selectedUser.role === 'supervisor') {
      toast.error('هذا المستخدم مشرف بالفعل')
      return
    }

    try {
      setSaving(true)
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'supervisor', updated_at: new Date().toISOString() })
        .eq('user_id', selectedUser.user_id)

      if (error) throw error
      toast.success('تم إضافة المشرف بنجاح')
      setSearchQuery('')
      setSelectedUser(null)
      setSearchResults([])
      await load()
    } catch (e: any) {
      console.error('Add supervisor error:', e)
      toast.error(e?.message || 'تعذر إضافة المشرف')
    } finally {
      setSaving(false)
    }
  }

  const toggleSupervisorActive = async (userId: string) => {
    const currentStatus = supervisorStatuses[userId] !== false
    const newStatus = !currentStatus
    
    const action = newStatus ? 'تفعيل' : 'تعطيل'
    if (!confirm(`هل تريد ${action} هذا المشرف؟`)) return

    try {
      setSaving(true)
      
      // تحديث أو إنشاء سجل في supervisor_permissions
      const { error } = await supabase
        .from('supervisor_permissions')
        .upsert({
          supervisor_id: userId,
          is_active: newStatus,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'supervisor_id',
        })

      if (error) throw error
      
      toast.success(`تم ${action} المشرف بنجاح`)
      
      // تحديث الحالة محلياً
      setSupervisorStatuses({ ...supervisorStatuses, [userId]: newStatus })
      
      await load()
    } catch (e: any) {
      console.error('Toggle supervisor active error:', e)
      toast.error(e?.message || `تعذر ${action} المشرف`)
    } finally {
      setSaving(false)
    }
  }

  const removeSupervisor = async (userId: string) => {
    if (!confirm('إزالة صلاحية المشرف عن هذا المستخدم نهائياً؟\n\nملاحظة: يمكنك استخدام "تعطيل" بدلاً من الإزالة إذا أردت الاحتفاظ بالبيانات.')) return
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
        
        {/* البحث */}
        <div className="relative mb-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="ابحث بالاسم أو رقم الهاتف..."
              className="w-full pr-10 pl-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedUser(null)
                  setSearchResults([])
                  setShowSearchResults(false)
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* نتائج البحث */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((user) => (
                <button
                  key={user.user_id}
                  type="button"
                  onClick={() => handleSelectUser(user)}
                  className="w-full text-right px-3 py-2 hover:bg-blue-50 transition text-sm border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-semibold text-gray-900">{user.full_name || 'بدون اسم'}</div>
                  <div className="text-xs text-gray-600">
                    {user.phone || user.jordan_phone || user.whatsapp_phone || 'بدون رقم'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">الدور: {user.role || 'user'}</div>
                </button>
              ))}
            </div>
          )}

          {showSearchResults && searchResults.length === 0 && searchQuery.trim() && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm text-gray-600 text-center">
              لا توجد نتائج
            </div>
          )}
        </div>

        {/* المستخدم المختار */}
        {selectedUser && (
          <div className="mb-2 p-2 bg-white rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm text-gray-900">{selectedUser.full_name || 'بدون اسم'}</div>
                <div className="text-xs text-gray-600">
                  {selectedUser.phone || selectedUser.jordan_phone || selectedUser.whatsapp_phone || 'بدون رقم'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedUser(null)
                  setSearchQuery('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* زر الإضافة */}
        <button
          type="button"
          onClick={addSupervisor}
          disabled={saving || !selectedUser}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <UserPlus className="w-4 h-4" />
          {selectedUser ? 'إضافة المشرف' : 'اختر مستخدم أولاً'}
        </button>

        <p className="text-[11px] text-gray-700 mt-2">
          ملاحظة: ابحث بالاسم أو رقم الهاتف واختر المستخدم من القائمة
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-gray-600">جاري التحميل...</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-gray-600">لا يوجد مشرفين حالياً.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((p) => (
            <div key={p.user_id} className="bg-gradient-to-r from-blue-50 to-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-gray-900 truncate mb-1">
                    {p.full_name || 'مشرف'}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Phone className="w-3 h-3" />
                    <span className="truncate">
                      {p.phone || p.jordan_phone || p.whatsapp_phone || 'بدون رقم'}
                    </span>
                  </div>
                </div>
              </div>

              {/* حالة التعطيل/التفعيل */}
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                  supervisorStatuses[p.user_id] !== false
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-red-100 text-red-700 border border-red-200'
                }`}>
                  {supervisorStatuses[p.user_id] !== false ? '✓ نشط' : '✗ معطل'}
                </span>
              </div>

              {/* أزرار الإدارة */}
              <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setSelectedSupervisorForStats({ id: p.user_id, name: p.full_name || 'مشرف' })}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 text-purple-700 border border-purple-100 hover:bg-purple-100 text-xs font-bold"
                >
                  <BarChart3 className="w-4 h-4" />
                  الإحصائيات
                </button>
                <button
                  type="button"
                  onClick={() => toggleSupervisorActive(p.user_id)}
                  disabled={saving}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border ${
                    supervisorStatuses[p.user_id] !== false
                      ? 'bg-yellow-50 text-yellow-700 border-yellow-100 hover:bg-yellow-100'
                      : 'bg-green-50 text-green-700 border-green-100 hover:bg-green-100'
                  } disabled:opacity-60`}
                >
                  {supervisorStatuses[p.user_id] !== false ? (
                    <>
                      <PowerOff className="w-4 h-4" />
                      تعطيل
                    </>
                  ) : (
                    <>
                      <Power className="w-4 h-4" />
                      تفعيل
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSupervisorForPermissions({ id: p.user_id, name: p.full_name || 'مشرف' })}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 text-xs font-bold"
                >
                  <Shield className="w-4 h-4" />
                  الصلاحيات
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSupervisorForCustomers({ id: p.user_id, name: p.full_name || 'مشرف' })}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 text-green-700 border border-green-100 hover:bg-green-100 text-xs font-bold"
                >
                  <UserCheck className="w-4 h-4" />
                  المنتسبون
                </button>
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
            </div>
          ))}
        </div>
      )}

      {/* Modal للصلاحيات */}
      {selectedSupervisorForPermissions && (
        <SupervisorPermissionsModal
          supervisorId={selectedSupervisorForPermissions.id}
          supervisorName={selectedSupervisorForPermissions.name}
          onClose={() => setSelectedSupervisorForPermissions(null)}
          onUpdate={load}
        />
      )}

      {/* Modal للمنتسبين */}
      {selectedSupervisorForCustomers && (
        <SupervisorCustomersModal
          supervisorId={selectedSupervisorForCustomers.id}
          supervisorName={selectedSupervisorForCustomers.name}
          onClose={() => setSelectedSupervisorForCustomers(null)}
          onUpdate={load}
        />
      )}

      {/* Modal للإحصائيات */}
      {selectedSupervisorForStats && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-bold text-gray-900">إحصائيات المشرف: {selectedSupervisorForStats.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSupervisorForStats(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6">
              <SupervisorStats
                supervisorId={selectedSupervisorForStats.id}
                supervisorName={selectedSupervisorForStats.name}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}




