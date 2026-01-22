'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function AdminLoginForm() {
  const [loginType, setLoginType] = useState<'admin' | 'supervisor'>('admin')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (loginType === 'admin') {
      if (!email) {
        toast.error('يرجى إدخال الإيميل')
        return
      }
    } else {
      if (!phone) {
        toast.error('يرجى إدخال رقم الهاتف')
        return
      }
    }

    if (!password) {
      toast.error('يرجى إدخال كلمة المرور')
      return
    }

    setLoading(true)

    try {
      let loginEmail: string

      if (loginType === 'admin') {
        // تسجيل دخول الإدمن بالإيميل
        loginEmail = email.trim()
      } else {
        // تسجيل دخول المشرف برقم الهاتف
        let cleanPhone = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '')
        cleanPhone = cleanPhone.replace(/^\+?0+/, '')
        if (cleanPhone.startsWith('00')) {
          cleanPhone = cleanPhone.substring(2)
        }
        loginEmail = `phone_${cleanPhone}@maidaa.local`
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      })

      if (error) throw error

      // التحقق من أن المستخدم إدمن أو مشرف
      const { data: profile, error: roleError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', data.user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (roleError) {
        console.error('Error loading role:', roleError)
        throw new Error('خطأ في التحقق من الصلاحيات')
      }

      const role = (profile?.role || '').toLowerCase()
      
      // التحقق من تطابق نوع الدخول مع الدور
      if (loginType === 'admin' && role !== 'admin') {
        toast.error('هذا الحساب ليس حساب إدمن')
        await supabase.auth.signOut()
        return
      }
      
      if (loginType === 'supervisor' && role !== 'supervisor') {
        toast.error('هذا الحساب ليس حساب مشرف')
        await supabase.auth.signOut()
        return
      }

      if (role !== 'admin' && role !== 'supervisor') {
        toast.error('ليس لديك صلاحية للوصول إلى لوحة الإدارة')
        await supabase.auth.signOut()
        return
      }

      toast.success('تم تسجيل الدخول بنجاح')
      router.push('/admin')
      router.refresh()
    } catch (error: any) {
      if (error.message?.includes('Invalid login credentials')) {
        if (loginType === 'admin') {
          toast.error('الإيميل أو كلمة المرور غير صحيحة')
        } else {
          toast.error('رقم الهاتف أو كلمة المرور غير صحيحة')
        }
      } else {
        toast.error(error.message || 'حدث خطأ أثناء تسجيل الدخول')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-3 sm:p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-5 sm:p-6 md:p-8">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">تسجيل دخول الإدارة</h1>
          <p className="text-sm sm:text-base text-gray-600">للمسؤولين والمشرفين فقط</p>
        </div>

        {/* Toggle between Admin and Supervisor */}
        <div className="mb-4 sm:mb-6">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => {
                setLoginType('admin')
                setEmail('')
                setPhone('')
                setPassword('')
              }}
              className={`flex-1 py-2 px-4 rounded-md text-sm sm:text-base font-semibold transition ${
                loginType === 'admin'
                  ? 'bg-gray-800 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              إدمن
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginType('supervisor')
                setEmail('')
                setPhone('')
                setPassword('')
              }}
              className={`flex-1 py-2 px-4 rounded-md text-sm sm:text-base font-semibold transition ${
                loginType === 'supervisor'
                  ? 'bg-gray-800 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              مشرف
            </button>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 sm:space-y-6">
          {loginType === 'admin' ? (
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                الإيميل *
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="admin@example.com"
              />
            </div>
          ) : (
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
              <p className="mt-1 text-xs text-gray-500">
                أدخل رقم الهاتف المسجل لديك
              </p>
            </div>
          )}

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
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="أدخل كلمة المرور"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 sm:py-3 bg-gray-800 text-white rounded-lg text-sm sm:text-base font-semibold hover:bg-gray-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>

        <div className="mt-5 sm:mt-6 text-center">
          <p className="text-sm sm:text-base text-gray-600">
            مستخدم عادي؟{' '}
            <a href="/auth/login" className="text-blue-600 hover:text-blue-700 font-semibold">
              تسجيل دخول عادي
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}


