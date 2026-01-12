'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function LoginForm() {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!phone) {
      toast.error('يرجى إدخال رقم الهاتف')
      return
    }

    setLoading(true)

    try {
      // تنظيف رقم الهاتف
      let cleanPhone = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '')
      // إزالة الأصفار في البداية و + إذا كان موجوداً
      cleanPhone = cleanPhone.replace(/^\+?0+/, '')
      // إذا بدأ بـ 00، أزلهم
      if (cleanPhone.startsWith('00')) {
        cleanPhone = cleanPhone.substring(2)
      }
      const phoneEmail = `phone_${cleanPhone}@maidaa.local`
      const defaultPassword = '123456'

      const { data, error } = await supabase.auth.signInWithPassword({
        email: phoneEmail,
        password: defaultPassword,
      })

      if (error) throw error

      toast.success('تم تسجيل الدخول بنجاح')
      router.push('/dashboard')
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
          <p className="text-sm sm:text-base text-gray-600">مرحباً بك في منصة ميداء</p>
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
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+966XXXXXXXXX أو 05XXXXXXXX"
            />
            <p className="mt-1 text-xs text-gray-500">أدخل رقم الهاتف المسجل لديك</p>
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

