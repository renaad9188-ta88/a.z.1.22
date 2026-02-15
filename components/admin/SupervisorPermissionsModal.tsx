'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { X, Save, Shield, Phone, MessageCircle, Briefcase, CheckCircle2 } from 'lucide-react'

interface SupervisorPermissionsModalProps {
  supervisorId: string
  supervisorName: string
  onClose: () => void
  onUpdate: () => void
}

interface Permissions {
  can_manage_routes: boolean
  can_create_trips: boolean
  can_assign_requests: boolean
  can_verify_payments: boolean
  can_view_all_requests: boolean
  is_active: boolean
  contact_phone: string
  whatsapp_phone: string
}

export default function SupervisorPermissionsModal({
  supervisorId,
  supervisorName,
  onClose,
  onUpdate,
}: SupervisorPermissionsModalProps) {
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [permissions, setPermissions] = useState<Permissions>({
    can_manage_routes: false,
    can_create_trips: false,
    can_assign_requests: false,
    can_verify_payments: true,
    can_view_all_requests: false,
    is_active: true,
    contact_phone: '',
    whatsapp_phone: '',
  })
  const [servicePermissions, setServicePermissions] = useState<Set<string>>(new Set())
  const [loadingServices, setLoadingServices] = useState(true)

  useEffect(() => {
    loadPermissions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supervisorId])

  const loadPermissions = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('supervisor_permissions')
        .select('*')
        .eq('supervisor_id', supervisorId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error

      if (data) {
        setPermissions({
          can_manage_routes: data.can_manage_routes || false,
          can_create_trips: data.can_create_trips || false,
          can_assign_requests: data.can_assign_requests || false,
          can_verify_payments: data.can_verify_payments !== false,
          can_view_all_requests: data.can_view_all_requests || false,
          is_active: data.is_active !== false,
          contact_phone: data.contact_phone || '',
          whatsapp_phone: data.whatsapp_phone || '',
        })
      }
    } catch (e: any) {
      console.error('Load permissions error:', e)
      toast.error('تعذر تحميل الصلاحيات')
    } finally {
      setLoading(false)
    }
  }

  const loadServicePermissions = async () => {
    try {
      setLoadingServices(true)
      const { data, error } = await supabase
        .from('supervisor_service_permissions')
        .select('service_type')
        .eq('supervisor_id', supervisorId)

      if (error && error.code !== 'PGRST116') throw error

      if (data) {
        setServicePermissions(new Set(data.map((s: any) => s.service_type)))
      }
    } catch (e: any) {
      console.error('Load service permissions error:', e)
    } finally {
      setLoadingServices(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const { error } = await supabase
        .from('supervisor_permissions')
        .upsert({
          supervisor_id: supervisorId,
          ...permissions,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'supervisor_id',
        })

      if (error) throw error
      toast.success('تم حفظ الصلاحيات بنجاح')
      onUpdate()
      onClose()
    } catch (e: any) {
      console.error('Save permissions error:', e)
      toast.error(e?.message || 'تعذر حفظ الصلاحيات')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">صلاحيات المشرف: {supervisorName}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-600">جاري التحميل...</div>
          ) : (
            <>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permissions.can_manage_routes}
                    onChange={(e) => setPermissions({ ...permissions, can_manage_routes: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">إدارة الخطوط</div>
                    <div className="text-xs text-gray-600">القدرة على إنشاء وتعديل وحذف الخطوط</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permissions.can_create_trips}
                    onChange={(e) => setPermissions({ ...permissions, can_create_trips: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">إنشاء الرحلات</div>
                    <div className="text-xs text-gray-600">القدرة على إنشاء رحلات جديدة وربطها بالخطوط</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permissions.can_assign_requests}
                    onChange={(e) => setPermissions({ ...permissions, can_assign_requests: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">تعيين الطلبات</div>
                    <div className="text-xs text-gray-600">القدرة على تعيين الطلبات للمشرفين الآخرين</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permissions.can_verify_payments}
                    onChange={(e) => setPermissions({ ...permissions, can_verify_payments: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">تأكيد الدفعات</div>
                    <div className="text-xs text-gray-600">القدرة على تأكيد استلام الدفعات وفتح الحجز</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permissions.can_view_all_requests}
                    onChange={(e) => setPermissions({ ...permissions, can_view_all_requests: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">عرض جميع الطلبات</div>
                    <div className="text-xs text-gray-600">القدرة على رؤية جميع الطلبات وليس فقط المعينة له أو منتسبيه</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-yellow-200 hover:bg-yellow-50 cursor-pointer bg-yellow-50/50">
                  <input
                    type="checkbox"
                    checked={permissions.is_active}
                    onChange={(e) => setPermissions({ ...permissions, is_active: e.target.checked })}
                    className="w-4 h-4 text-yellow-600 rounded focus:ring-yellow-500"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">المشرف نشط</div>
                    <div className="text-xs text-gray-600">تعطيل هذا الخيار يمنع المشرف من تسجيل الدخول والوصول إلى لوحة المشرف (البيانات محفوظة)</div>
                  </div>
                </label>
              </div>

              {/* صلاحيات الخدمات */}
              <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-200">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-purple-600" />
                  صلاحيات الخدمات
                </h4>
                <p className="text-xs text-gray-600 mb-3">
                  اختر الخدمات التي سيرى المشرف طلباتها. الطلبات الجديدة لهذه الخدمات سيتم تعيينها تلقائياً لهذا المشرف.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { value: 'visit', label: 'زيارة الأردن', icon: '🇯🇴' },
                    { value: 'umrah', label: 'عمرة', icon: '🕋' },
                    { value: 'tourism', label: 'سياحة', icon: '✈️' },
                    { value: 'goethe', label: 'جوته', icon: '🎓' },
                    { value: 'embassy', label: 'مقابلة السفارة', icon: '🏛️' },
                    { value: 'visa', label: 'فيز وتأشيرات', icon: '🛂' },
                  ].map((service) => (
                    <label
                      key={service.value}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition ${
                        servicePermissions.has(service.value)
                          ? 'bg-purple-100 border-purple-400'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={servicePermissions.has(service.value)}
                        onChange={() => {
                          setServicePermissions(prev => {
                            const newSet = new Set(prev)
                            if (newSet.has(service.value)) {
                              newSet.delete(service.value)
                            } else {
                              newSet.add(service.value)
                            }
                            return newSet
                          })
                        }}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <span className="text-lg">{service.icon}</span>
                      <span className="text-xs font-semibold text-gray-900">{service.label}</span>
                    </label>
                  ))}
                </div>
                {servicePermissions.size === 0 && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    لم يتم اختيار أي خدمة. سيتم تعيين الطلبات يدوياً من الإدمن.
                  </p>
                )}
              </div>

              {/* معلومات التواصل */}
              <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-600" />
                  معلومات التواصل (للمنتسبين)
                </h4>
                <p className="text-xs text-gray-600 mb-3">
                  هذه الأرقام ستظهر للمنتسبين المخصصين لك بدلاً من رقم الإدمن
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      رقم الهاتف للاتصال
                    </label>
                    <input
                      type="tel"
                      value={permissions.contact_phone}
                      onChange={(e) => setPermissions({ ...permissions, contact_phone: e.target.value })}
                      placeholder="مثال: 0771234567 أو +962771234567"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      رقم الواتساب
                    </label>
                    <input
                      type="tel"
                      value={permissions.whatsapp_phone}
                      onChange={(e) => setPermissions({ ...permissions, whatsapp_phone: e.target.value })}
                      placeholder="مثال: 0771234567 أو +962771234567"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  حفظ
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

