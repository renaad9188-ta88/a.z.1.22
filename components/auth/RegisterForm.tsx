'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
  })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.phone || !formData.fullName) {
      toast.error('يرجى إدخال جميع البيانات المطلوبة')
      return
    }

    // تنظيف رقم الهاتف (إزالة المسافات والرموز)
    let cleanPhone = formData.phone.replace(/\s+/g, '').replace(/[^\d+]/g, '')
    
    // إزالة الأصفار في البداية و + إذا كان موجوداً
    cleanPhone = cleanPhone.replace(/^\+?0+/, '')
    
    // إذا بدأ بـ 00، أزلهم
    if (cleanPhone.startsWith('00')) {
      cleanPhone = cleanPhone.substring(2)
    }
    
    if (cleanPhone.length < 9) {
      toast.error('يرجى إدخال رقم هاتف صحيح')
      return
    }

    setLoading(true)

    try {
      // استخدام رقم الهاتف كـ email (Supabase يتطلب email)
      // تنسيق صحيح: phone_XXXXXXXXXX@maidaa.local
      const defaultPassword = '123456'
      const phoneEmail = `phone_${cleanPhone}@maidaa.local`

      // Register user
      // ملاحظة: قد تحتاج إلى تعطيل email confirmation في Supabase Dashboard
      // Settings > Authentication > Email Auth > Enable email confirmations (إيقاف)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: phoneEmail,
        password: defaultPassword,
        options: {
          data: {
            phone: cleanPhone,
            full_name: formData.fullName,
          },
        }
      })

      if (authError) {
        console.error('Supabase signup error:', authError)
        console.error('Phone email used:', phoneEmail)
        
        // إذا كان الخطأ بسبب email موجود، جرب تسجيل الدخول
        if (authError.message?.includes('already registered') || 
            authError.message?.includes('already been registered') ||
            authError.message?.includes('User already registered')) {
          // سيتم التعامل معه في catch
          throw new Error('USER_EXISTS')
        }
        
        // إذا كان Email signups معطل
        if (authError.message?.includes('Email signups are disabled') || 
            authError.message?.includes('signups are disabled')) {
          throw new Error('EMAIL_SIGNUPS_DISABLED')
        }
        
        // إذا كان خطأ 400، قد يكون بسبب email confirmation
        if (authError.status === 400 || authError.message?.includes('400')) {
          throw new Error('BAD_REQUEST: قد تحتاج إلى تفعيل Email signups وتعطيل email confirmation في Supabase Dashboard')
        }
        
        throw authError
      }

      if (authData.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: authData.user.id,
            full_name: formData.fullName,
            phone: cleanPhone,
          })

        if (profileError) {
          // إذا فشل إنشاء profile، لا نوقف العملية
          console.error('Profile creation error:', profileError)
        }

        toast.success('تم التسجيل بنجاح!')
        router.push('/dashboard')
        router.refresh()
      }
    } catch (error: any) {
      // إذا كان Email signups معطل
      if (error.message === 'EMAIL_SIGNUPS_DISABLED' || 
          error.message?.includes('Email signups are disabled') ||
          error.message?.includes('signups are disabled')) {
        toast.error(
          'Email signups معطل في Supabase. يرجى تفعيله من: Settings > Authentication > Sign In / Providers > Email > Enable email signup',
          { duration: 8000 }
        )
        return
      }
      
      // إذا كان المستخدم موجود بالفعل، جرب تسجيل الدخول
      if (error.message === 'USER_EXISTS' || 
          error.message?.includes('already registered') || 
          error.message?.includes('already been registered') ||
          error.message?.includes('User already registered')) {
        toast.info('الحساب موجود بالفعل، جاري تسجيل الدخول...')
        try {
          let cleanPhoneForLogin = formData.phone.replace(/\s+/g, '').replace(/[^\d+]/g, '')
          cleanPhoneForLogin = cleanPhoneForLogin.replace(/^\+?0+/, '')
          if (cleanPhoneForLogin.startsWith('00')) {
            cleanPhoneForLogin = cleanPhoneForLogin.substring(2)
          }
          const phoneEmail = `phone_${cleanPhoneForLogin}@maidaa.local`
          const { error: loginError } = await supabase.auth.signInWithPassword({
            email: phoneEmail,
            password: defaultPassword,
          })
          if (!loginError) {
            toast.success('تم تسجيل الدخول بنجاح')
            router.push('/dashboard')
            router.refresh()
            return
          }
        } catch (loginErr: any) {
          toast.error(loginErr.message || 'حدث خطأ أثناء تسجيل الدخول')
          return
        }
      }
      
      // عرض رسالة خطأ واضحة
      const errorMessage = error.message || 'حدث خطأ أثناء التسجيل'
      console.error('Registration error:', error)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-3 sm:p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-5 sm:p-6 md:p-8">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">إنشاء حساب جديد</h1>
          <p className="text-sm sm:text-base text-gray-600">انضم إلى منصة ميداء</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4 sm:space-y-6">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
              الاسم الكامل *
            </label>
            <input
              id="fullName"
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="أدخل اسمك الكامل"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              رقم الهاتف *
            </label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+966XXXXXXXXX أو 05XXXXXXXX"
            />
            <p className="mt-1 text-xs text-gray-500">سيتم استخدام رقم الهاتف لتسجيل الدخول</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg text-sm sm:text-base font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'جاري التسجيل...' : 'إنشاء الحساب'}
          </button>
        </form>

        <div className="mt-5 sm:mt-6 text-center">
          <p className="text-sm sm:text-base text-gray-600">
            لديك حساب بالفعل؟{' '}
            <a href="/auth/login" className="text-blue-600 hover:text-blue-700 font-semibold">
              تسجيل الدخول
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

