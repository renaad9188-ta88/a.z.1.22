'use client'

import { useState, useEffect } from 'react'
import type { DriverAccount } from './types'

interface DriverFormModalProps {
  driverAccounts: DriverAccount[]
  onClose: () => void
  onSubmit: (formData: FormData) => Promise<void>
}

export default function DriverFormModal({ driverAccounts, onClose, onSubmit }: DriverFormModalProps) {
  const [driverForm, setDriverForm] = useState({
    user_id: '',
    name: '',
    phone: '',
    vehicle_type: 'حافلة',
    seats_count: '',
  })
  const [driverAutofill, setDriverAutofill] = useState<{ name: boolean; phone: boolean }>({
    name: false,
    phone: false,
  })

  useEffect(() => {
    setDriverForm({
      user_id: '',
      name: '',
      phone: '',
      vehicle_type: 'حافلة',
      seats_count: '',
    })
    setDriverAutofill({ name: false, phone: false })
  }, [])

  const handleUserChange = (userId: string) => {
    if (!userId) {
      setDriverForm((p) => ({ ...p, user_id: '', name: '', phone: '' }))
      setDriverAutofill({ name: false, phone: false })
      return
    }

    const acc = driverAccounts.find((a) => a.user_id === userId)
    const nextName = (acc?.full_name || '').trim()
    const nextPhone = (acc?.phone || '').trim()
    setDriverForm((p) => ({
      ...p,
      user_id: userId,
      name: nextName || p.name,
      phone: nextPhone || p.phone,
    }))
    setDriverAutofill({ name: Boolean(nextName), phone: Boolean(nextPhone) })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-sm sm:max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6">إضافة سائق جديد</h3>
          <form
            action={async (formData) => {
              await onSubmit(formData)
              onClose()
            }}
            className="space-y-4 sm:space-y-6"
          >
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs sm:text-sm text-blue-800 leading-relaxed">
              <p className="font-bold mb-1">ربط السائق بحساب (اختياري)</p>
              <p>
                إذا اخترت حسابًا هنا، سيتمكن السائق من تسجيل الدخول إلى لوحة السائق وبدء التتبع وتحديث المسار حسب
                الصلاحيات.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">حساب السائق (User ID)</label>
              <select
                name="user_id"
                value={driverForm.user_id}
                onChange={(e) => handleUserChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
              >
                <option value="">بدون ربط (سائق بدون تسجيل دخول)</option>
                {driverAccounts.map((acc) => (
                  <option key={acc.user_id} value={acc.user_id}>
                    {(acc.full_name || 'بدون اسم')} — {(acc.phone || 'بدون رقم')} — {(acc.role || 'user')}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] sm:text-xs text-gray-500">
                ملاحظة: الحساب يجب أن يكون موجودًا بالفعل (مستخدم مسجل). سيتم تعيين دوره إلى driver تلقائياً.
              </p>
              {driverForm.user_id && (driverAutofill.name || driverAutofill.phone) && (
                <p className="mt-1 text-[11px] sm:text-xs text-green-700">
                  تم تعبئة بيانات السائق تلقائياً من الحساب المختار.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الاسم</label>
              <input
                name="name"
                required
                value={driverForm.name}
                onChange={(e) => setDriverForm((p) => ({ ...p, name: e.target.value }))}
                readOnly={Boolean(driverForm.user_id) && driverAutofill.name}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
              />
              {Boolean(driverForm.user_id) && driverAutofill.name && (
                <p className="mt-1 text-[11px] sm:text-xs text-gray-500">
                  تم جلب الاسم من الحساب (يمكن تغييره من بيانات الحساب إن لزم).
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الهاتف</label>
              <input
                name="phone"
                type="tel"
                required
                value={driverForm.phone}
                onChange={(e) => setDriverForm((p) => ({ ...p, phone: e.target.value }))}
                readOnly={Boolean(driverForm.user_id) && driverAutofill.phone}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
              />
              {Boolean(driverForm.user_id) && driverAutofill.phone && (
                <p className="mt-1 text-[11px] sm:text-xs text-gray-500">تم جلب الهاتف من الحساب.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">نوع المركبة</label>
              <select
                name="vehicle_type"
                required
                value={driverForm.vehicle_type}
                onChange={(e) => setDriverForm((p) => ({ ...p, vehicle_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
              >
                <option value="حافلة">حافلة</option>
                <option value="فان">فان</option>
                <option value="سيارة">سيارة</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">عدد المقاعد</label>
              <input
                name="seats_count"
                type="number"
                required
                min="1"
                value={driverForm.seats_count}
                onChange={(e) => setDriverForm((p) => ({ ...p, seats_count: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm sm:text-base"
              >
                إضافة
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium text-sm sm:text-base"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

