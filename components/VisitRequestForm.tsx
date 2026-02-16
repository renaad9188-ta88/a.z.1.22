'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Upload } from 'lucide-react'
import { notifyAdminNewRequest, createNotification } from '@/lib/notifications'
import HelpContactButtons from '@/components/HelpContactButtons'

const DEPARTURE_CITIES = [
  'الشام',
  'درعا',
  'حلب',
  'حمص',
  'حماة',
  'اللاذقية',
  'طرطوس',
  'دير الزور',
  'الحسكة',
  'الرقة',
  'إدلب',
  'السويداء',
  'القنيطرة',
  'أخرى'
]

export default function VisitRequestForm() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(false)
  const [passportImage, setPassportImage] = useState<File | null>(null)
  const [passportImagePreview, setPassportImagePreview] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    fullName: '',
    departureCity: '',
    otherCity: '', // إذا اختار "أخرى"
  })

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت')
        return
      }
      setPassportImage(file)
      // إنشاء preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPassportImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadPassportImage = async (file: File, userId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/${Date.now()}.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from('passports')
        .upload(fileName, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('passports')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      console.error('Error uploading image:', error)
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.fullName || !formData.departureCity || !passportImage) {
      toast.error('يرجى إدخال جميع البيانات المطلوبة')
      return
    }

    // إذا اختار "أخرى" ولم يدخل اسم المدينة
    if (formData.departureCity === 'أخرى' && !formData.otherCity) {
      toast.error('يرجى إدخال اسم المدينة')
      return
    }

    // حفظ مباشر بدون ملخص
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // رفع صورة الجواز
      const passportImageUrl = await uploadPassportImage(passportImage!, user.id)
      if (!passportImageUrl) {
        throw new Error('فشل رفع صورة الجواز')
      }

      // تحديد مكان الانطلاق النهائي
      const finalDepartureCity = formData.departureCity === 'أخرى' 
        ? formData.otherCity 
        : formData.departureCity

      // إنشاء طلب الزيارة
      // ملاحظة: نستخدم city كـ departure_city مؤقتاً حتى يتم تحديث قاعدة البيانات
      const { data, error } = await supabase
        .from('visit_requests')
        .insert({
          user_id: user.id,
          visitor_name: formData.fullName,
          city: finalDepartureCity, // استخدام city كـ departure_city
          passport_image_url: passportImageUrl,
          status: 'pending',
          // الحقول المطلوبة الأخرى - نضع قيم افتراضية
          nationality: 'سوري', // قيمة افتراضية
          passport_number: 'N/A', // قيمة افتراضية
          passport_expiry: new Date().toISOString().split('T')[0], // تاريخ افتراضي
          visit_type: 'visit', // قيمة افتراضية
          travel_date: new Date().toISOString().split('T')[0], // تاريخ افتراضي
          days_count: 1, // قيمة افتراضية
        })
        .select()
        .single()

      if (error) throw error

      // الحصول على معلومات المستخدم لإرسالها في الإشعار
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('user_id', user.id)
        .single()

      const userName = profile?.full_name || user.email?.split('@')[0] || 'مستخدم'
      const userPhone = profile?.phone || ''

      // إرسال إشعار للمستخدم (تم إرسال الطلب بنجاح)
      console.log('🔔 [NEW REQUEST] Preparing to notify user about request submission:', {
        requestId: data.id,
        userId: user.id,
        visitorName: formData.fullName
      })
      
      createNotification({
        userId: user.id,
        title: 'تم إرسال الطلب بنجاح',
        message: `تم إرسال طلب الزيارة لـ ${formData.fullName} بنجاح. سيتم مراجعته من قبل الإدارة قريباً.`,
        type: 'success',
        relatedType: 'request',
        relatedId: data.id,
      }).then(() => {
        console.log('✅ [NEW REQUEST] User notification sent successfully')
      }).catch(error => {
        console.error('❌ [NEW REQUEST] Error sending user notification:', error)
      })

      // إرسال إشعار للإدمن (بشكل غير متزامن حتى لا يؤثر على سرعة الاستجابة)
      console.log('🔔 [NEW REQUEST] Preparing to notify admins about new request:', {
        requestId: data.id,
        visitorName: formData.fullName,
        userName: userName,
        city: finalDepartureCity
      })
      
      notifyAdminNewRequest(
        data.id,
        formData.fullName,
        userName,
        finalDepartureCity
      ).then(() => {
        console.log('✅ [NEW REQUEST] Admin notification sent successfully')
      }).catch(error => {
        console.error('❌ [NEW REQUEST] Error sending admin notification:', error)
        // لا نوقف العملية إذا فشل الإشعار
      })

      toast.success('تم حفظ الطلب بنجاح!')
      router.push('/dashboard')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء حفظ الطلب')
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-4 sm:py-6 md:py-8 px-3 sm:px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-6 sm:mb-8 text-gray-800">طلب زيارة جديد</h1>

          <HelpContactButtons
            className="mb-4 sm:mb-6"
            visitType="visit"
            message="مرحباً، أحتاج مساعدة في تقديم طلب زيارة (رفع الجواز)."
          />

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* الاسم الكامل */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                الاسم الكامل *
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="أدخل اسمك الكامل"
              />
            </div>

            {/* مكان الانطلاق */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                مكان الانطلاق *
              </label>
              <select
                required
                value={formData.departureCity}
                onChange={(e) => setFormData({ ...formData, departureCity: e.target.value, otherCity: '' })}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">اختر مكان الانطلاق</option>
                {DEPARTURE_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {/* إذا اختار "أخرى" */}
            {formData.departureCity === 'أخرى' && (
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  اسم المدينة *
                </label>
                <input
                  type="text"
                  required
                  value={formData.otherCity}
                  onChange={(e) => setFormData({ ...formData, otherCity: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="أدخل اسم المدينة"
                />
              </div>
            )}

            {/* رفع صورة الجواز */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                صورة الجواز *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-blue-400 transition">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="passport-upload"
                  required
                />
                <label
                  htmlFor="passport-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-gray-400 mb-2" />
                  <span className="text-xs sm:text-sm md:text-base text-gray-600 mb-1 sm:mb-2 break-words px-2">
                    {passportImage ? passportImage.name : 'اضغط لرفع صورة الجواز'}
                  </span>
                  <span className="text-xs text-gray-500">الحجم الأقصى: 5 ميجابايت</span>
                </label>
              </div>
              
              {/* معاينة الصورة */}
              {passportImagePreview && (
                <div className="mt-3 sm:mt-4">
                  <img
                    src={passportImagePreview}
                    alt="معاينة صورة الجواز"
                    className="w-full max-w-full h-auto rounded-lg border border-gray-300"
                    style={{ maxHeight: '180px' }}
                  />
                </div>
              )}
            </div>

            {/* زر الإرسال */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm sm:text-base md:text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'جاري الحفظ...' : 'إرسال الطلب'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
