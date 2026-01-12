'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Calendar, Upload, Save, Edit, Trash2, X, MapPin } from 'lucide-react'

const DEPARTURE_CITIES = [
  'الشام', 'درعا', 'حلب', 'حمص', 'حماة', 'اللاذقية', 'طرطوس', 
  'دير الزور', 'الحسكة', 'الرقة', 'إدلب', 'السويداء', 'القنيطرة', 'أخرى'
]

export default function JordanVisitForm() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [passportImage, setPassportImage] = useState<File | null>(null)
  const [passportImagePreview, setPassportImagePreview] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    departureCity: '',
    otherCity: '',
    visitDate: '',
    duration: '30', // شهر واحد
    purpose: '',
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
    if (!formData.fullName || !formData.phone || !formData.departureCity || !passportImage) {
      toast.error('يرجى إدخال جميع البيانات المطلوبة')
      return
    }
    if (formData.departureCity === 'أخرى' && !formData.otherCity) {
      toast.error('يرجى إدخال اسم المدينة')
      return
    }
    setShowSummary(true)
  }

  const handleSave = async () => {
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

      const finalDepartureCity = formData.departureCity === 'أخرى' 
        ? formData.otherCity 
        : formData.departureCity

      const { error } = await supabase
        .from('visit_requests')
        .insert({
          user_id: user.id,
          visitor_name: formData.fullName,
          city: finalDepartureCity,
          passport_image_url: passportImageUrl,
          status: 'pending',
          visit_type: 'visit',
          travel_date: formData.visitDate || new Date().toISOString().split('T')[0],
          days_count: parseInt(formData.duration),
          nationality: 'سوري',
          passport_number: 'N/A',
          passport_expiry: new Date().toISOString().split('T')[0],
          admin_notes: `خدمة: زيارة الأردن لمدة شهر\nالغرض: ${formData.purpose}\nملاحظات: ${formData.notes}\nالهاتف: ${formData.phone}`,
        })

      if (error) throw error
      toast.success('تم حفظ الطلب بنجاح!')
      router.push('/dashboard')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء حفظ الطلب')
    } finally {
      setLoading(false)
    }
  }

  if (showSummary) {
    const finalDepartureCity = formData.departureCity === 'أخرى' 
      ? formData.otherCity 
      : formData.departureCity

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-4 sm:py-6 md:py-8 px-3 sm:px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">ملخص الطلب</h1>
              <button onClick={() => setShowSummary(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
              <div className="border-b border-gray-200 pb-3 sm:pb-4">
                <label className="text-xs sm:text-sm font-medium text-gray-500 mb-1 block">الاسم الكامل</label>
                <p className="text-base sm:text-lg md:text-xl font-semibold text-gray-800">{formData.fullName}</p>
              </div>
              <div className="border-b border-gray-200 pb-3 sm:pb-4">
                <label className="text-xs sm:text-sm font-medium text-gray-500 mb-1 block">رقم الهاتف</label>
                <p className="text-base sm:text-lg md:text-xl font-semibold text-gray-800">{formData.phone}</p>
              </div>
              <div className="border-b border-gray-200 pb-3 sm:pb-4">
                <label className="text-xs sm:text-sm font-medium text-gray-500 mb-1 block">مكان الانطلاق</label>
                <p className="text-base sm:text-lg md:text-xl font-semibold text-gray-800">{finalDepartureCity}</p>
              </div>
              <div className="border-b border-gray-200 pb-3 sm:pb-4">
                <label className="text-xs sm:text-sm font-medium text-gray-500 mb-1 block">مدة الزيارة</label>
                <p className="text-base sm:text-lg md:text-xl font-semibold text-gray-800">{formData.duration} يوم</p>
              </div>
              {passportImagePreview && (
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-500 mb-2 block">صورة الجواز</label>
                  <img src={passportImagePreview} alt="صورة الجواز" className="w-full max-w-full h-auto rounded-lg border border-gray-300" style={{ maxHeight: '250px' }} />
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button onClick={handleSave} disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 text-sm sm:text-base font-semibold">
                <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                {loading ? 'جاري الحفظ...' : 'حفظ الطلب'}
              </button>
              <button onClick={() => setShowSummary(false)} className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm sm:text-base font-semibold">
                <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                تعديل
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-4 sm:py-6 md:py-8 px-3 sm:px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2">خدمات الزيارات السورية للأردن</h1>
            <p className="text-sm sm:text-base text-gray-600">زيارة الأردن لمدة شهر - تنظيم جميع الإجراءات</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">الاسم الكامل *</label>
              <input type="text" required value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="أدخل اسمك الكامل" />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">رقم الهاتف *</label>
              <input type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="+966XXXXXXXXX" />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">مكان الانطلاق *</label>
              <select required value={formData.departureCity} onChange={(e) => setFormData({ ...formData, departureCity: e.target.value, otherCity: '' })} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="">اختر مكان الانطلاق</option>
                {DEPARTURE_CITIES.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            {formData.departureCity === 'أخرى' && (
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">اسم المدينة *</label>
                <input type="text" required value={formData.otherCity} onChange={(e) => setFormData({ ...formData, otherCity: e.target.value })} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="أدخل اسم المدينة" />
              </div>
            )}

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">تاريخ الزيارة المفضل</label>
              <input type="date" value={formData.visitDate} onChange={(e) => setFormData({ ...formData, visitDate: e.target.value })} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">الغرض من الزيارة</label>
              <textarea value={formData.purpose} onChange={(e) => setFormData({ ...formData, purpose: e.target.value })} rows={3} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none" placeholder="اذكر الغرض من الزيارة..." />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">صورة الجواز *</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-blue-400 transition">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="passport-upload" required />
                <label htmlFor="passport-upload" className="cursor-pointer flex flex-col items-center">
                  <Upload className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-gray-400 mb-2" />
                  <span className="text-xs sm:text-sm md:text-base text-gray-600 mb-1 sm:mb-2 break-words px-2">{passportImage ? passportImage.name : 'اضغط لرفع صورة الجواز'}</span>
                  <span className="text-xs text-gray-500">الحجم الأقصى: 5 ميجابايت</span>
                </label>
              </div>
              {passportImagePreview && (
                <div className="mt-3 sm:mt-4">
                  <img src={passportImagePreview} alt="معاينة" className="w-full max-w-full h-auto rounded-lg border border-gray-300" style={{ maxHeight: '180px' }} />
                </div>
              )}
            </div>

            <button type="submit" className="w-full py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm sm:text-base md:text-lg">عرض الملخص</button>
          </form>
        </div>
      </div>
    </div>
  )
}

