'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Upload, Save, DollarSign, Phone, MessageCircle, CheckCircle, X } from 'lucide-react'
import Link from 'next/link'

interface Person {
  name: string
  passportImages: string[]
}

export default function JordanVisitPayment({ requestId, userId }: { requestId: string; userId: string }) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(false)
  const [request, setRequest] = useState<any>(null)
  const [persons, setPersons] = useState<Person[]>([])
  const [paymentImages, setPaymentImages] = useState<File[]>([])
  const [paymentPreviews, setPaymentPreviews] = useState<string[]>([])

  useEffect(() => {
    loadRequest()
  }, [requestId])

  const loadRequest = async () => {
    try {
      const { data, error } = await supabase
        .from('visit_requests')
        .select('*')
        .eq('id', requestId)
        .eq('user_id', userId)
        .single()

      if (error) throw error
      setRequest(data)
      
      // تحميل بيانات الأشخاص
      if (data.companions_data && Array.isArray(data.companions_data)) {
        setPersons(data.companions_data)
      } else {
        // إذا لم تكن هناك بيانات أشخاص، نستخدم البيانات الأساسية
        setPersons([{
          name: data.visitor_name,
          passportImages: data.passport_image_url ? [data.passport_image_url] : []
        }])
      }
    } catch (error: any) {
      toast.error('حدث خطأ أثناء تحميل البيانات')
      router.push('/dashboard')
    }
  }

  const handlePaymentImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`صورة ${file.name} أكبر من 5 ميجابايت`)
        return false
      }
      return true
    })

    const newImages = [...paymentImages, ...validFiles]
    setPaymentImages(newImages)

    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPaymentPreviews(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removePaymentImage = (index: number) => {
    setPaymentImages(paymentImages.filter((_, i) => i !== index))
    setPaymentPreviews(paymentPreviews.filter((_, i) => i !== index))
  }

  const uploadPaymentImages = async (files: File[]): Promise<string[]> => {
    const uploadedUrls: string[] = []
    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${userId}/payments/${Date.now()}_${Math.random()}.${fileExt}`
        const { data, error } = await supabase.storage
          .from('passports')
          .upload(fileName, file)
        if (error) throw error
        const { data: { publicUrl } } = supabase.storage
          .from('passports')
          .getPublicUrl(fileName)
        uploadedUrls.push(publicUrl)
      } catch (error) {
        console.error('Error uploading payment image:', error)
      }
    }
    return uploadedUrls
  }

  const handleSubmitPayment = async () => {
    if (paymentImages.length === 0) {
      toast.error('يرجى رفع صور الدفعات')
      return
    }

    setLoading(true)

    try {
      const paymentImageUrls = await uploadPaymentImages(paymentImages)
      const totalAmount = persons.length * 10 // 10 دنانير لكل شخص

      const { error } = await supabase
        .from('visit_requests')
        .update({
          deposit_paid: true,
          deposit_amount: totalAmount,
          total_amount: totalAmount,
          admin_notes: `${request.admin_notes || ''}\n\nصور الدفعات: ${paymentImageUrls.join(', ')}`,
        })
        .eq('id', requestId)

      if (error) throw error

      toast.success('تم رفع صور الدفعات بنجاح!')
      router.push('/dashboard')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء رفع صور الدفعات')
    } finally {
      setLoading(false)
    }
  }

  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  const totalAmount = persons.length * 10 // 10 دنانير لكل شخص

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-4 sm:py-6 md:py-8 px-3 sm:px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2">الدفع والرسوم</h1>
            <p className="text-sm sm:text-base text-gray-600">يرجى رفع صور الدفعات للمتابعة</p>
          </div>

          {/* قائمة الأشخاص */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">الأشخاص المسجلين</h2>
            <div className="space-y-3 sm:space-y-4">
              {persons.map((person, index) => (
                <div key={index} className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-sm sm:text-base">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm sm:text-base text-gray-800">{person.name}</p>
                        <p className="text-xs sm:text-sm text-gray-600">10 دنانير</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-lg sm:text-xl font-bold text-green-600">10 د.أ</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* إجمالي المبلغ */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 sm:p-6 rounded-lg mb-6 sm:mb-8 border-2 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm sm:text-base text-gray-600 mb-1">عدد الأشخاص</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-800">{persons.length} شخص</p>
              </div>
              <div className="text-left">
                <p className="text-sm sm:text-base text-gray-600 mb-1">المبلغ الإجمالي</p>
                <p className="text-3xl sm:text-4xl font-bold text-green-600">{totalAmount} د.أ</p>
              </div>
            </div>
          </div>

          {/* رفع صور الدفعات */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">رفع صور الدفعات *</h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-green-400 transition">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePaymentImageUpload}
                className="hidden"
                id="payment-upload"
              />
              <label
                htmlFor="payment-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 mb-2" />
                <span className="text-xs sm:text-sm text-gray-600 mb-1">
                  {paymentImages.length > 0 
                    ? `${paymentImages.length} صورة` 
                    : 'اضغط لرفع صور الدفعات'}
                </span>
                <span className="text-xs text-gray-500">الحجم الأقصى: 5 ميجابايت لكل صورة</span>
              </label>
            </div>

            {/* معاينة صور الدفعات */}
            {paymentPreviews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 mt-4">
                {paymentPreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`دفعة ${index + 1}`}
                      className="w-full h-24 sm:h-32 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => removePaymentImage(index)}
                      className="absolute top-1 left-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* معلومات التواصل */}
          <div className="bg-blue-50 p-4 sm:p-5 rounded-lg mb-6 sm:mb-8">
            <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">معلومات التواصل</h2>
            <div className="space-y-2 sm:space-y-3">
              <a 
                href="tel:+966541700017" 
                className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white rounded-lg hover:bg-blue-100 transition"
              >
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                <span className="text-xs sm:text-sm font-semibold text-gray-800">+966541700017</span>
              </a>
              <a 
                href="https://wa.me/966541700017" 
                target="_blank"
                className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white rounded-lg hover:bg-green-100 transition"
              >
                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                <span className="text-xs sm:text-sm font-semibold text-gray-800">واتساب: +966541700017</span>
              </a>
            </div>
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleSubmitPayment}
              disabled={loading || paymentImages.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base font-semibold"
            >
              <Save className="w-4 h-4 sm:w-5 sm:h-5" />
              {loading ? 'جاري الحفظ...' : 'حفظ صور الدفعات'}
            </button>
            <Link
              href="/dashboard"
              className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm sm:text-base font-semibold"
            >
              العودة للوحة التحكم
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}



