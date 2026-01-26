'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    phone: '',
    firstName: '',
    lastName: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createSupabaseBrowserClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.phone || !formData.firstName || !formData.lastName || !formData.password) {
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
      const inviteToken = searchParams?.get('invite') || null

      // استخدام رقم الهاتف كـ email (Supabase يتطلب email)
      // تنسيق صحيح: phone_XXXXXXXXXX@maidaa.local
      const phoneEmail = `phone_${cleanPhone}@maidaa.local`
      const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim()

      // Register user
      // ملاحظة: قد تحتاج إلى تعطيل email confirmation في Supabase Dashboard
      // Settings > Authentication > Email Auth > Enable email confirmations (إيقاف)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: phoneEmail,
        password: formData.password,
        options: {
          data: {
            phone: cleanPhone,
            full_name: fullName,
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
            full_name: fullName,
            phone: cleanPhone,
          })

        if (profileError) {
          // إذا فشل إنشاء profile، لا نوقف العملية
          console.error('Profile creation error:', profileError)
        }

        // If signup came from an invite link, claim it (RPC is SECURITY DEFINER)
        if (inviteToken) {
          try {
            await supabase.rpc('claim_invite', { p_invite_token: inviteToken })
          } catch (e) {
            console.warn('claim_invite failed (non-blocking):', e)
          }
        }

        toast.success('تم التسجيل بنجاح!')
        router.push('/') // توجيه إلى الصفحة الرئيسية
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
        toast('هذا الرقم مسجّل مسبقاً. سنحاول تسجيل الدخول...', { duration: 2500 })
        try {
          const inviteToken = searchParams?.get('invite') || null
          let cleanPhoneForLogin = formData.phone.replace(/\s+/g, '').replace(/[^\d+]/g, '')
          cleanPhoneForLogin = cleanPhoneForLogin.replace(/^\+?0+/, '')
          if (cleanPhoneForLogin.startsWith('00')) {
            cleanPhoneForLogin = cleanPhoneForLogin.substring(2)
          }
          const phoneEmail = `phone_${cleanPhoneForLogin}@maidaa.local`
          const { error: loginError } = await supabase.auth.signInWithPassword({
            email: phoneEmail,
            password: formData.password,
          })
          if (!loginError) {
            // بعد تسجيل الدخول: وجّه حسب الدور
            const { data: { user } } = await supabase.auth.getUser()
            if (inviteToken) {
              try {
                await supabase.rpc('claim_invite', { p_invite_token: inviteToken })
              } catch (e) {
                console.warn('claim_invite failed after login (non-blocking):', e)
              }
            }
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('user_id', user?.id || '')
              .order('updated_at', { ascending: false })
              .limit(1)
              .maybeSingle()

            const role = (profile?.role || '').toLowerCase()
            toast.success('تم تسجيل الدخول بنجاح')
            if (role === 'admin') router.push('/admin')
            else if (role === 'driver') router.push('/driver')
            else router.push('/') // توجيه إلى الصفحة الرئيسية
            router.refresh()
            return
          }
          // إذا الحساب موجود لكن كلمة المرور خاطئة
          if (loginError.message?.includes('Invalid login credentials') || loginError.status === 400) {
            toast.error('الحساب موجود لكن كلمة المرور غير صحيحة. انتقل لتسجيل الدخول أو غيّر كلمة المرور.')
            router.push('/auth/login')
            return
          }
          toast.error(loginError.message || 'تعذر تسجيل الدخول. جرّب تسجيل الدخول من صفحة تسجيل الدخول.')
          router.push('/auth/login')
          return
        } catch (loginErr: any) {
          toast.error(loginErr.message || 'حدث خطأ أثناء تسجيل الدخول')
          router.push('/auth/login')
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
          <p className="text-sm sm:text-base text-gray-600">انضم إلى منصة خدمات السوريين</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4 sm:space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الاسم (مقطعين) *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="الاسم الأول"
              />
              <input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="اسم العائلة"
              />
            </div>
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

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              كلمة المرور *
            </label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="أدخل كلمة مرور قوية"
            />
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

