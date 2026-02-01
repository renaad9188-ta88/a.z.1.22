'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function LoginForm() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!phone) {
      toast.error('يرجى إدخال رقم الهاتف')
      return
    }

    if (!password) {
      toast.error('يرجى إدخال كلمة المرور')
      return
    }

    setLoading(true)

    try {
      // تسجيل دخول برقم الهاتف فقط - للمستخدمين العاديين
      let cleanPhone = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '')
      cleanPhone = cleanPhone.replace(/^\+?0+/, '')
      if (cleanPhone.startsWith('00')) {
        cleanPhone = cleanPhone.substring(2)
      }
      const email = `phone_${cleanPhone}@syrian-services.local`
      const userPassword = password

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: userPassword,
      })

      if (error) throw error

      toast.success('تم تسجيل الدخول بنجاح')
      
      // التحقق من role وإعادة التوجيه
      const { data: profile, error: roleError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', data.user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (roleError) {
        console.error('Error loading role:', roleError)
      }

      const role = (profile?.role || '').toLowerCase()
      // إذا كان إدمن أو مشرف، لا نسمح له بالدخول من هنا
      if (role === 'admin' || role === 'supervisor') {
        toast.error('يرجى استخدام صفحة تسجيل دخول الإدارة')
        await supabase.auth.signOut()
        router.push('/auth/admin-login')
        return
      }
      
      if (role === 'driver') {
        router.push('/driver')
      } else {
        router.push('/') // توجيه إلى الصفحة الرئيسية
      }
      router.refresh()
    } catch (error: any) {
      if (error.message?.includes('Invalid login credentials')) {
        toast.error('رقم الهاتف غير مسجل. يرجى التسجيل أولاً')
      } else {
        toast.error(error.message || 'حدث خطأ أثناء تسجيل الدخول')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-3 sm:p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-5 sm:p-6 md:p-8">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">تسجيل الدخول</h1>
          <p className="text-sm sm:text-base text-gray-600">مرحباً بك في منصة خدمات السوريين</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 sm:space-y-6">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              رقم الهاتف *
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
              placeholder="+966XXXXXXXXX أو 05XXXXXXXX"
            />
            <p className="mt-1 text-xs text-gray-500">
              أدخل رقم الهاتف المسجل لديك
            </p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              كلمة المرور *
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
              placeholder="أدخل كلمة المرور"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg text-sm sm:text-base font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>

        <div className="mt-5 sm:mt-6 text-center">
          <p className="text-sm sm:text-base text-gray-600">
            ليس لديك حساب؟{' '}
            <a href="/auth/register" className="text-blue-600 hover:text-blue-700 font-semibold">
              سجل الآن
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
