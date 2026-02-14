'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Plane, Upload, MessageCircle, Phone } from 'lucide-react'

export default function VisaServicesPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(false)
  const [showContactInfo, setShowContactInfo] = useState(false)
  const [passportImage, setPassportImage] = useState<File | null>(null)
  const [passportImagePreview, setPassportImagePreview] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    serviceType: '',
    country: '',
    notes: '',
  })

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت')
        return
      }
      setPassportImage(file)
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
    if (!formData.fullName || !formData.phone || !formData.serviceType || !passportImage) {
      toast.error('يرجى إدخال جميع البيانات المطلوبة')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const passportImageUrl = await uploadPassportImage(passportImage!, user.id)
      if (!passportImageUrl) {
        throw new Error('فشل رفع صورة الجواز')
      }

      const serviceTypeLabel = formData.serviceType === 'visa' 
        ? 'فيز وتأشيرات' 
        : formData.serviceType === 'tourism' 
        ? 'رحلات سياحية' 
        : 'رحلات العمرة'

      const countryInfo = formData.serviceType === 'visa' && formData.country
        ? `\nالدولة المطلوبة: ${formData.country}`
        : ''

      const { error } = await supabase
        .from('visit_requests')
        .insert({
          user_id: user.id,
          visitor_name: formData.fullName,
          city: `${serviceTypeLabel}${formData.country ? ` - ${formData.country}` : ''}`,
          passport_image_url: passportImageUrl,
          status: 'pending',
          visit_type: 'visa',
          travel_date: new Date().toISOString().split('T')[0],
          days_count: 1,
          nationality: 'سوري',
          passport_number: 'N/A',
          passport_expiry: new Date().toISOString().split('T')[0],
          admin_notes: `خدمة: ${serviceTypeLabel}${countryInfo}\nالهاتف: ${formData.phone}${formData.notes ? `\nملاحظات: ${formData.notes}` : ''}`,
        })

      if (error) throw error
      toast.success('تم حفظ الطلب بنجاح!')
      setShowContactInfo(true)
      
      // الانتقال للصفحة بعد 5 ثوانٍ
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 5000)
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء حفظ الطلب')
    } finally {
      setLoading(false)
    }
  }

  if (showContactInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white py-4 sm:py-6 md:py-8 px-3 sm:px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Plane className="w-8 h-8 sm:w-10 sm:h-10 text-red-600" />
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-2">تم حفظ الطلب بنجاح!</h1>
              <p className="text-sm sm:text-base text-gray-600 mb-6">سيتم التواصل معك قريباً لإكمال الإجراءات</p>
            </div>
            
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 sm:p-6 mb-6">
              <p className="text-sm sm:text-base font-bold text-red-900 mb-4 text-center">للتواصل بعد تقديم الطلب:</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="https://wa.me/962791234567"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold text-sm sm:text-base"
                >
                  <MessageCircle className="w-5 h-5" />
                  واتساب
                </a>
                <a
                  href="tel:+962791234567"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm sm:text-base"
                >
                  <Phone className="w-5 h-5" />
                  اتصال
                </a>
              </div>
              <p className="text-xs sm:text-sm text-red-700 mt-4 text-center">سيتم تحويلك تلقائياً إلى لوحة التحكم خلال 5 ثوانٍ</p>
            </div>
            
            <button
              onClick={() => {
                router.push('/dashboard')
                router.refresh()
              }}
              className="w-full px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-semibold text-sm sm:text-base"
            >
              الانتقال إلى لوحة التحكم الآن
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white py-4 sm:py-6 md:py-8 px-3 sm:px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Plane className="w-8 h-8 sm:w-10 sm:h-10 text-red-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2">خدمات الفيز والتأشيرات والرحلات</h1>
            <p className="text-sm sm:text-base text-gray-600">فيز وتأشيرات للسعودية ودول أخرى - رحلات سياحية وعمرة</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">الاسم *</label>
              <input 
                type="text" 
                required 
                value={formData.fullName} 
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} 
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500" 
                placeholder="أدخل اسمك" 
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">رقم الهاتف *</label>
              <input 
                type="tel" 
                required 
                value={formData.phone} 
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500" 
                placeholder="+966XXXXXXXXX" 
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">نوع الخدمة *</label>
              <select 
                required 
                value={formData.serviceType} 
                onChange={(e) => setFormData({ ...formData, serviceType: e.target.value, country: '' })} 
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              >
                <option value="">اختر نوع الخدمة</option>
                <option value="visa">فيز وتأشيرات (السعودية أو دول أخرى)</option>
                <option value="tourism">رحلات سياحية</option>
                <option value="umrah">رحلات العمرة</option>
              </select>
            </div>

            {formData.serviceType === 'visa' && (
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">الدولة المطلوبة</label>
                <input 
                  type="text" 
                  value={formData.country} 
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })} 
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500" 
                  placeholder="مثال: السعودية، الإمارات، تركيا..." 
                />
              </div>
            )}

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">ملاحظات إضافية (اختياري)</label>
              <textarea 
                value={formData.notes} 
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
                rows={3} 
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 resize-none" 
                placeholder="أي معلومات إضافية تريد إضافتها..." 
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">صورة الجواز *</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-red-400 transition">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  className="hidden" 
                  id="passport-upload" 
                  required 
                />
                <label htmlFor="passport-upload" className="cursor-pointer flex flex-col items-center">
                  <Upload className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-gray-400 mb-2" />
                  <span className="text-xs sm:text-sm md:text-base text-gray-600 mb-1 sm:mb-2 break-words px-2">
                    {passportImage ? passportImage.name : 'اضغط لرفع صورة الجواز'}
                  </span>
                  <span className="text-xs text-gray-500">الحجم الأقصى: 5 ميجابايت</span>
                </label>
              </div>
              {passportImagePreview && (
                <div className="mt-3 sm:mt-4">
                  <img 
                    src={passportImagePreview} 
                    alt="معاينة" 
                    className="w-full max-w-full h-auto rounded-lg border border-gray-300" 
                    style={{ maxHeight: '180px' }} 
                  />
                </div>
              )}
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-2.5 sm:py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold text-sm sm:text-base md:text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'جاري الحفظ...' : 'إرسال الطلب'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}


