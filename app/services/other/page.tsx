'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { MessageCircle, Send, Plane, Umbrella, Phone, CheckCircle } from 'lucide-react'

export default function OtherServicesPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    serviceName: '',
    description: '',
    contactPhone: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.serviceName || !formData.description) {
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

      // حفظ الطلب في قاعدة البيانات
      const { error } = await supabase
        .from('visit_requests')
        .insert({
          user_id: user.id,
          visitor_name: user.user_metadata?.full_name || 'مستخدم',
          city: `خدمة أخرى: ${formData.serviceName}`,
          visit_type: 'other',
          travel_date: new Date().toISOString().split('T')[0],
          days_count: 0,
          status: 'pending',
          admin_notes: `اسم الخدمة: ${formData.serviceName}\nالوصف: ${formData.description}\nرقم التواصل: ${formData.contactPhone || 'غير محدد'}`,
          nationality: 'سوري',
          passport_number: 'N/A',
          passport_expiry: new Date().toISOString().split('T')[0],
        })

      if (error) throw error

      toast.success('تم إرسال طلبك بنجاح! سنتواصل معك قريباً')
      router.push('/dashboard')
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء إرسال الطلب')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white py-4 sm:py-6 md:py-8 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2">
              خدمات أخرى
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              رحلات عمرة - فيز وتأشيرات - وباقي التفاصيل في الداخل
            </p>
          </div>

          {/* Services Overview - نبذة عن الخدمات */}
          <div className="mb-6 sm:mb-8 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 sm:p-6 border border-indigo-100">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-4 text-center">
              الخدمات المتاحة
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Plane className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">فيز وتأشيرات</h3>
                  <p className="text-sm text-gray-600">فيز وتأشيرات للسعودية ودول أخرى - خدمات خاصة</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Umbrella className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">رحلات عمرة</h3>
                  <p className="text-sm text-gray-600">رحلات عمرة منظمة ومميزة مع أفضل الخدمات</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Plane className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">حجوزات تذاكر طيران</h3>
                  <p className="text-sm text-gray-600">حجز تذاكر طيران بأفضل الأسعار</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">خدمات أخرى</h3>
                  <p className="text-sm text-gray-600">خدمات متنوعة ومخصصة حسب احتياجاتك</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-4 text-center">
              تقديم طلب للخدمة
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  اسم الخدمة المطلوبة *
                </label>
                <input
                  type="text"
                  required
                  value={formData.serviceName}
                  onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="مثال: رحلة عمرة، فيز للسعودية، حجز تذكرة طيران..."
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  وصف الخدمة بالتفصيل *
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={5}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  placeholder="اكتب تفاصيل الخدمة المطلوبة... (مثال: عدد الأشخاص، التواريخ المفضلة، أي متطلبات خاصة...)"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  رقم الهاتف للتواصل (اختياري)
                </label>
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="+962XXXXXXXXX"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 sm:py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold text-sm sm:text-base md:text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                {loading ? 'جاري الإرسال...' : 'إرسال الطلب'}
              </button>
            </form>
          </div>

          {/* Quick Contact */}
          <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-200">
            <p className="text-center text-sm sm:text-base text-gray-600 mb-4">
              أو تواصل معنا مباشرة
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href="https://wa.me/962798905595"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold text-sm sm:text-base"
              >
                <MessageCircle className="w-5 h-5" />
                <span>واتساب</span>
              </a>
              <a
                href="tel:00962798905595"
                className="flex items-center justify-center gap-2 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm sm:text-base"
              >
                <Phone className="w-5 h-5" />
                <span>اتصال</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

