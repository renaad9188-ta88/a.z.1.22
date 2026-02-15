'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { 
  Phone, 
  Lock, 
  Shield, 
  HelpCircle, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  Users,
  Key,
  MessageCircle,
  Calendar
} from 'lucide-react'

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 max-w-6xl mx-auto">
          {/* نموذج تسجيل الدخول */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 sm:p-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <Key className="w-8 h-8 text-blue-600" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                  تسجيل الدخول
                </h1>
                <p className="text-sm sm:text-base text-gray-600">
                  مرحباً بك في منصة خدمات السوريين
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Phone className="w-4 h-4" />
                    رقم الهاتف *
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full px-4 py-3 text-base text-gray-900 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition placeholder:text-gray-400"
                    placeholder="+966XXXXXXXXX أو 05XXXXXXXX"
                  />
                  <p className="mt-1.5 text-xs text-gray-500">
                    أدخل رقم الهاتف المسجل لديك
                  </p>
                </div>

                <div>
                  <label htmlFor="password" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Lock className="w-4 h-4" />
                    كلمة المرور *
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 text-base text-gray-900 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition placeholder:text-gray-400"
                    placeholder="أدخل كلمة المرور"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-base font-semibold hover:from-blue-700 hover:to-blue-800 transition shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      جاري تسجيل الدخول...
                    </>
                  ) : (
                    <>
                      تسجيل الدخول
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  ليس لديك حساب؟{' '}
                  <a href="/auth/register" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
                    سجل الآن
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* قسم الإرشادات والنصائح */}
          <div className="flex items-center">
            <div className="w-full space-y-6">
              {/* صورة كريكاتيرية */}
              <div className="relative h-48 sm:h-64 rounded-xl overflow-hidden shadow-lg bg-gradient-to-br from-blue-100 via-purple-50 to-pink-100">
                {/* تصميم كريكاتيري بسيط - يمكن استبداله بصورة محلية */}
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <div className="text-center w-full">
                    {/* أيقونة طائرة كريكاتيرية */}
                    <div className="inline-flex items-center justify-center w-20 h-20 sm:w-28 sm:h-28 bg-white/90 rounded-full mb-3 shadow-xl transform hover:scale-105 transition">
                      <svg className="w-12 h-12 sm:w-16 sm:h-16 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                      </svg>
                    </div>
                    {/* أيقونات خدمات */}
                    <div className="flex items-center justify-center gap-3 sm:gap-4 mb-2">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                      </div>
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-pink-500/20 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-blue-600/60 via-purple-500/40 to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4 text-white z-10">
                  <h2 className="text-xl sm:text-2xl font-bold mb-1 drop-shadow-lg">
                    منصة خدمات السوريين
                  </h2>
                  <p className="text-sm sm:text-base opacity-95 drop-shadow-md">
                    خدمات شاملة لجميع احتياجاتك
                  </p>
                </div>
              </div>

              {/* إرشادات استخدام المنصة */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-blue-600" />
                  دليل استخدام المنصة
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">بعد تسجيل الدخول</p>
                      <p className="text-xs text-gray-500">انتقل إلى لوحة التحكم لمتابعة طلباتك وحالة المعاملات</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">تقديم طلب جديد</p>
                      <p className="text-xs text-gray-500">اختر الخدمة المناسبة من الصفحة الرئيسية واملأ البيانات المطلوبة</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">متابعة حالة الطلب</p>
                      <p className="text-xs text-gray-500">تابع حالة طلبك في الوقت الفعلي من لوحة التحكم</p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* متى تتواصل مع المسؤول */}
              <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-6 border-2 border-orange-100">
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-orange-600" />
                  متى تتواصل مع المسؤول؟
                </h3>
                <ul className="space-y-2.5 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold mt-0.5">•</span>
                    <span>للاستفسار عن حالة طلبك أو استكمال المعاملة</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold mt-0.5">•</span>
                    <span>عند وجود مشكلة في رفع المستندات أو الصور</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold mt-0.5">•</span>
                    <span>للتعديل على بيانات الطلب قبل الموافقة</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold mt-0.5">•</span>
                    <span>للاستفسار عن خدمات الفيز والتأشيرات والرحلات</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold mt-0.5">•</span>
                    <span>لحجز رحلة أو تعديل حجز موجود</span>
                  </li>
                </ul>
                <div className="mt-4 pt-4 border-t border-orange-200">
                  <p className="text-xs font-semibold text-gray-600 mb-2">طرق التواصل:</p>
                  <div className="flex flex-wrap gap-2">
                    <a 
                      href="https://wa.me/962798905595" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition flex items-center gap-1"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      واتساب
                    </a>
                    <a 
                      href="tel:00962798905595" 
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition flex items-center gap-1"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      اتصال
                    </a>
                  </div>
                </div>
              </div>

              {/* خطوات متابعة الطلب */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border-2 border-purple-100">
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  خطوات متابعة طلبك
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      1
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">تقديم الطلب</p>
                      <p className="text-xs text-gray-500">املأ البيانات وارفع صورة الجواز</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      2
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">دفع الرسوم</p>
                      <p className="text-xs text-gray-500">أرسل صورة إيصال الدفع عبر المنصة</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      3
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">انتظار الموافقة</p>
                      <p className="text-xs text-gray-500">ستصلك إشعارات عند تحديث حالة الطلب</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      4
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">الحجز والمتابعة</p>
                      <p className="text-xs text-gray-500">بعد الموافقة، احجز رحلتك وتابعها على الخريطة</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* نصائح للحصول على أفضل تجربة */}
              <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-6 border-2 border-teal-100">
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-teal-600" />
                  نصائح مهمة
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                    <span>تأكد من صحة البيانات قبل تقديم الطلب</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                    <span>احتفظ بصورة واضحة من الجواز والمستندات</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                    <span>راجع لوحة التحكم بانتظام لمتابعة التحديثات</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                    <span>استخدم خاصية التتبع لمتابعة رحلتك على الخريطة</span>
                  </li>
                </ul>
              </div>

              {/* روابط مفيدة */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-5">
                <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-600" />
                  روابط سريعة
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <a 
                    href="/auth/register" 
                    className="px-3 py-2 bg-white text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition shadow-sm text-center"
                  >
                    إنشاء حساب
                  </a>
                  <a 
                    href="/" 
                    className="px-3 py-2 bg-white text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition shadow-sm text-center"
                  >
                    الصفحة الرئيسية
                  </a>
                  <a 
                    href="/services/jordan-visit" 
                    className="px-3 py-2 bg-white text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition shadow-sm text-center"
                  >
                    زيارة الأردن
                  </a>
                  <a 
                    href="/services/visa-services" 
                    className="px-3 py-2 bg-white text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition shadow-sm text-center"
                  >
                    الفيز والتأشيرات
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
