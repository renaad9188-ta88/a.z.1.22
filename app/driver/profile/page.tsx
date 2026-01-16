'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { ArrowLeft, User, Phone, Save } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

type DriverProfile = {
  user_id: string
  full_name: string | null
  phone: string | null
  role: string
}

export default function DriverProfile() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [profile, setProfile] = useState<DriverProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
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
      const { data: profileData, error: profileError } = await supabase
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

      if (!profileData || (profileData.role || '').toLowerCase() !== 'driver') {
        toast.error('ليس لديك صلاحية للوصول إلى صفحة إعدادات السائق')
        console.error('User is not driver:', {
          userId: user.id,
          email: user.email,
          profile: profileData
        })
        router.push('/dashboard')
        return
      }

      setProfile(profileData as DriverProfile)
      setFormData({
        full_name: profileData.full_name || '',
        phone: profileData.phone || '',
      })
    } catch (error: any) {
      console.error('Error loading driver profile:', error)
      toast.error('حدث خطأ أثناء تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!profile) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name.trim() || null,
          phone: formData.phone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', profile.user_id)

      if (error) throw error

      toast.success('تم حفظ التغييرات بنجاح')
      // إعادة تحميل البيانات
      loadProfile()
    } catch (error: any) {
      console.error('Error updating profile:', error)
      toast.error(error.message || 'حدث خطأ أثناء حفظ التغييرات')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm sm:text-base">جاري تحميل البيانات...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white overflow-x-hidden">
      {/* Header */}
      <header className="bg-white shadow-md rounded-xl w-full">
        <div className="container mx-auto px-2 sm:px-3 md:px-4 py-2 sm:py-3 max-w-full">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/driver"
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">العودة</span>
            </Link>
            <div className="flex-1">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">
                إعدادات السائق
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                تعديل معلوماتك الشخصية
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-2 sm:px-3 md:px-4 py-3 sm:py-4 md:py-6 max-w-full">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 text-green-700 rounded-full">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">معلومات السائق</h2>
                <p className="text-sm text-gray-600">قم بتحديث بياناتك الشخصية</p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                  الاسم الكامل
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="أدخل اسمك الكامل"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                />
              </div>

              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                  رقم الهاتف
                </label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="أدخل رقم هاتفك"
                    className="w-full pr-10 pl-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition font-medium text-sm sm:text-base"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      حفظ التغييرات
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Additional Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <h3 className="text-sm sm:text-base font-bold text-blue-800 mb-2">معلومات مهمة</h3>
            <ul className="text-xs sm:text-sm text-blue-700 space-y-1">
              <li>• يمكنك تعديل اسمك ورقم هاتفك في أي وقت</li>
              <li>• هذه المعلومات تظهر للركاب عند الحاجة</li>
              <li>• تأكد من صحة رقم الهاتف للتواصل مع الركاب</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
