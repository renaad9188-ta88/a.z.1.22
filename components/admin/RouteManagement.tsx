'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { MapPin, Plus, Trash2, Edit, Bus, Users } from 'lucide-react'
import toast from 'react-hot-toast'

type Route = {
  id: string
  name: string
  description: string | null
  start_location_name: string
  start_lat: number
  start_lng: number
  end_location_name: string
  end_lat: number
  end_lng: number
  is_active: boolean
}

type Driver = {
  id: string
  name: string
  phone: string
  vehicle_type: string
  seats_count: number
  is_active: boolean
  user_id?: string | null
}

type RouteDriver = {
  id: string
  route_id: string
  driver_id: string
  driver?: Driver
}

type DriverAccount = {
  user_id: string
  full_name: string | null
  phone: string | null
  role: string | null
}

export default function RouteManagement() {
  const supabase = createSupabaseBrowserClient()
  const [routes, setRoutes] = useState<Route[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [routeDrivers, setRouteDrivers] = useState<RouteDriver[]>([])
  const [driverAccounts, setDriverAccounts] = useState<DriverAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddRoute, setShowAddRoute] = useState(false)
  const [showAddDriver, setShowAddDriver] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [routesRes, driversRes, routeDriversRes, driverAccountsRes] = await Promise.all([
        supabase.from('routes').select('*').order('created_at', { ascending: false }),
        supabase.from('drivers').select('*').order('name'),
        supabase.from('route_drivers').select('*, driver:drivers(*)').eq('is_active', true),
        supabase.from('profiles').select('user_id, full_name, phone, role').order('updated_at', { ascending: false }),
      ])

      if (routesRes.error) throw routesRes.error
      if (driversRes.error) throw driversRes.error
      if (routeDriversRes.error) throw routeDriversRes.error
      if (driverAccountsRes.error) throw driverAccountsRes.error

      setRoutes(routesRes.data || [])
      setDrivers(driversRes.data || [])
      setRouteDrivers(routeDriversRes.data || [])
      setDriverAccounts((driverAccountsRes.data || []) as any)
    } catch (error: any) {
      console.error('Error loading data:', error)
      toast.error('حدث خطأ أثناء تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  const handleAddDriver = async (formData: FormData) => {
    try {
      const userIdRaw = String(formData.get('user_id') || '').trim()
      const userId = userIdRaw ? userIdRaw : null

      const { data: inserted, error } = await supabase
        .from('drivers')
        .insert({
        name: formData.get('name') as string,
        phone: formData.get('phone') as string,
        vehicle_type: formData.get('vehicle_type') as string,
        seats_count: parseInt(formData.get('seats_count') as string),
        is_active: true,
        ...(userId ? { user_id: userId } : {}),
      })
        .select('id,user_id')
        .maybeSingle()

      if (error) throw error

      // إذا تم ربطه بحساب، تأكد أن role في profiles = driver (للوصول إلى /driver)
      if (userId) {
        const { error: profileErr } = await supabase
          .from('profiles')
          .update({ role: 'driver' } as any)
          .eq('user_id', userId)
        if (profileErr) {
          console.warn('Could not update profile role to driver:', profileErr)
        }
      }

      toast.success('تم إضافة السائق بنجاح')
      setShowAddDriver(false)
      loadData()
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء إضافة السائق')
    }
  }

  const handleAssignDriver = async (routeId: string, driverId: string) => {
    try {
      const { error } = await supabase.from('route_drivers').upsert({
        route_id: routeId,
        driver_id: driverId,
        is_active: true,
      }, { onConflict: 'route_id,driver_id' })

      if (error) throw error
      toast.success('تم ربط السائق بالخط بنجاح')
      loadData()
    } catch (error: any) {
      toast.error('حدث خطأ أثناء ربط السائق')
    }
  }

  if (loading) {
    return <div className="p-4 text-center">جاري التحميل...</div>
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">إدارة الخطوط والسائقين</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowAddDriver(true)}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm sm:text-base font-medium"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            إضافة سائق
          </button>
        </div>
      </div>

      {/* Routes List */}
      <div className="grid gap-3 sm:gap-4 lg:gap-6">
        {routes.map((route) => {
          const assignedDrivers = routeDrivers
            .filter(rd => rd.route_id === route.id)
            .map(rd => rd.driver)
            .filter(Boolean) as Driver[]

          return (
            <div key={route.id} className="bg-white rounded-lg shadow-md p-3 sm:p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 mb-1">{route.name}</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mb-2">{route.description}</p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                    <span className="flex items-center gap-1 text-gray-700">
                      <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span className="truncate">{route.start_location_name}</span>
                    </span>
                    <span className="hidden sm:block text-gray-400">→</span>
                    <span className="flex items-center gap-1 text-gray-700">
                      <MapPin className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <span className="truncate">{route.end_location_name}</span>
                    </span>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${route.is_active ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-gray-100 text-gray-800 border border-gray-200'}`}>
                  {route.is_active ? 'نشط' : 'غير نشط'}
                </span>
              </div>

              {/* Assigned Drivers */}
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-xs sm:text-sm font-semibold text-gray-800 mb-3">السائقون المربوطون:</h4>
                {assignedDrivers.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {assignedDrivers.map((driver) => (
                      <span key={driver.id} className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs sm:text-sm font-medium border border-blue-200">
                        <Bus className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="truncate">{driver.name}</span>
                        <span className="hidden sm:inline">({driver.vehicle_type})</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-gray-500 mb-3">لا يوجد سائقون مربوطون</p>
                )}

                {/* Assign Driver Dropdown */}
                <div>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAssignDriver(route.id, e.target.value)
                        e.target.value = ''
                      }
                    }}
                    className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">إضافة سائق...</option>
                    {drivers
                      .filter(d => !assignedDrivers.find(ad => ad.id === d.id))
                      .map(driver => (
                        <option key={driver.id} value={driver.id}>
                          {driver.name} - {driver.vehicle_type}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Driver Modal */}
      {showAddDriver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-sm sm:max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6">إضافة سائق جديد</h3>
              <form action={handleAddDriver} className="space-y-4 sm:space-y-6">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs sm:text-sm text-blue-800 leading-relaxed">
                  <p className="font-bold mb-1">ربط السائق بحساب (اختياري)</p>
                  <p>
                    إذا اخترت حسابًا هنا، سيتمكن السائق من تسجيل الدخول إلى لوحة السائق وبدء التتبع وتحديث المسار حسب الصلاحيات.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">حساب السائق (User ID)</label>
                  <select
                    name="user_id"
                    defaultValue=""
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
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الاسم</label>
                  <input
                    name="name"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الهاتف</label>
                  <input
                    name="phone"
                    type="tel"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">نوع المركبة</label>
                  <select
                    name="vehicle_type"
                    required
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
                    onClick={() => setShowAddDriver(false)}
                    className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium text-sm sm:text-base"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

