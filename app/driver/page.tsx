'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Bus, Settings } from 'lucide-react'
import toast from 'react-hot-toast'
import DriverAvailabilityMap from '@/components/driver/DriverAvailabilityMap'
import DriverAssignedTripsPanel from '@/components/driver/DriverAssignedTripsPanel'
import NotificationsDropdown from '@/components/NotificationsDropdown'

type DriverProfile = {
  user_id: string
  full_name: string | null
  phone: string | null
  role: string
}

export default function DriverDashboard() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null)
  const [driverRowId, setDriverRowId] = useState<string | null>(null)
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  // تم تبسيط لوحة السائق: خريطة + زر (متاح) فقط حسب طلب الإدارة

  useEffect(() => {
    loadDriverProfile()
  }, [])

  const loadDriverProfile = async () => {
    try {
      setLoading(true)

      // التحقق من تسجيل الدخول أولاً
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        toast.error('يجب تسجيل الدخول أولاً')
        router.push('/auth/login')
        return
      }

      // التحقق من أن المستخدم سائق
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone, role')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (profileError) {
        console.error('Error checking driver role:', profileError)
        toast.error('خطأ في التحقق من الصلاحيات')
        return
      }

      if (!profile || (profile.role || '').toLowerCase() !== 'driver') {
        toast.error('ليس لديك صلاحية للوصول إلى لوحة السائق')
        console.error('User is not driver:', {
          userId: user.id,
          email: user.email,
          profile: profile
        })
        router.push('/dashboard')
        return
      }

      setDriverProfile(profile as DriverProfile)
      
      // Get driver row ID from drivers table
      const { data: driverRow, error: driverRowError } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (driverRowError) {
        console.error('Error loading driver row:', driverRowError)
      } else if (driverRow) {
        setDriverRowId(driverRow.id)
      }
    } catch (error: any) {
      console.error('Error loading driver profile:', error)
      toast.error('حدث خطأ أثناء تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/')
      toast.success('تم تسجيل الخروج بنجاح')
    } catch (error: any) {
      toast.error('حدث خطأ أثناء تسجيل الخروج')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm sm:text-base">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white overflow-x-hidden">
      {/* Header */}
      <header className="bg-white shadow-md rounded-xl w-full">
        <div className="container mx-auto px-2 sm:px-3 md:px-4 py-2 sm:py-3 max-w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4 min-w-0 flex-1">
              <Link href="/" className="flex items-center gap-1 sm:gap-1.5 md:gap-2 group min-w-0">
                <div className="relative w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 flex items-center justify-center flex-shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-600 via-green-500 to-green-700 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105"></div>
                  <div className="absolute inset-[2px] bg-gradient-to-br from-white to-gray-50 rounded-lg"></div>
                  <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-b from-blue-600 to-blue-700 rounded-b-xl"></div>
                  <div className="relative z-10 flex items-center justify-center">
                    <Bus className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-green-600 drop-shadow-lg" />
                  </div>
                  <div className="absolute -inset-0.5 border-2 border-yellow-400/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <div className="flex flex-col min-w-0">
                  <h1 className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl font-bold bg-gradient-to-r from-green-600 via-gray-800 to-blue-600 bg-clip-text text-transparent leading-tight group-hover:from-green-500 group-hover:to-blue-500 transition-all truncate">
                    منصة خدمات السوريين
                  </h1>
                  <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 truncate">لوحة تحكم السائق</p>
                  <div className="h-0.5 bg-gradient-to-r from-green-500 via-yellow-400 to-blue-600 rounded-full mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </Link>
            </div>
            <div className="flex flex-row items-center gap-1.5 sm:gap-2 md:gap-3 w-full sm:w-auto justify-end sm:justify-start">
              <Link
                href="/driver/profile"
                className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-xs sm:text-sm md:text-base text-gray-700 hover:text-blue-600 transition whitespace-nowrap"
              >
                <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 inline mr-1" />
                <span className="hidden sm:inline">إعدادات</span>
              </Link>
              {driverProfile && (
                <NotificationsDropdown userId={driverProfile.user_id} />
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-xs sm:text-sm md:text-base text-red-600 hover:bg-red-50 rounded-lg transition whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline">تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-2 sm:px-3 md:px-4 py-3 sm:py-4 md:py-6 max-w-full">
        <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 mb-2">
            مرحباً {driverProfile?.full_name || 'سائق'}
          </h2>
          <p className="text-xs sm:text-sm text-gray-600">
            اضغط "متاح" ليظهر موقعك للإدارة ويتم تتبعك أثناء الرحلة فقط.
          </p>
        </div>

        {driverRowId && (
          <DriverAssignedTripsPanel
            driverRowId={driverRowId}
            selectedTripId={selectedTripId}
            onSelectTrip={setSelectedTripId}
          />
        )}
        <div className="mt-4 sm:mt-6">
          <DriverAvailabilityMap selectedTripId={selectedTripId} />
        </div>
      </div>
    </div>
  )
}


