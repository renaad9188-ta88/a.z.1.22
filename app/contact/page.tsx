'use client'

import { useState } from 'react'
import { MessageCircle, Send, Phone, AlertCircle, Lightbulb, Building2, Zap, Mail, Plane, Briefcase, Users, ArrowLeft, Plus, UserPlus, Target, TrendingUp, Shield, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { notifyAllAdmins } from '@/lib/notifications'

type ContactType = 
  | 'complaint'
  | 'new-service'
  | 'suggestion'
  | 'supervisor-join'
  | 'office-coordination'
  | 'development'
  | 'facilities'
  | 'private-contact'
  | 'private-trip'
  | 'private-service'
  | 'supervisor-cooperation'

interface ContactTypeInfo {
  id: ContactType
  title: string
  description: string
  icon: any
  color: string
  bgColor: string
  phone?: string
  whatsapp?: string
}

const contactTypes: ContactTypeInfo[] = [
  {
    id: 'complaint',
    title: 'شكاوي واستفسارات',
    description: 'لديك شكوى أو استفسار؟ تواصل معنا مباشرة',
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    phone: '00962798905595',
    whatsapp: '962798905595',
  },
  {
    id: 'new-service',
    title: 'خدمات جديدة',
    description: 'اقترح خدمة جديدة تريد إضافتها للمنصة',
    icon: Plus,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    phone: '00962798905595',
    whatsapp: '962798905595',
  },
  {
    id: 'suggestion',
    title: 'اقتراح للموقع',
    description: 'لديك فكرة لتطوير وتحسين المنصة؟',
    icon: Lightbulb,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    phone: '00962798905595',
    whatsapp: '962798905595',
  },
  {
    id: 'supervisor-join',
    title: 'اشتراك كمشرف وتعاون',
    description: 'ترغب بالانضمام كشريك أو مشرف في المنصة',
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    phone: '00962798905595',
    whatsapp: '962798905595',
  },
  {
    id: 'office-coordination',
    title: 'تنسيق مع مكاتب سوريا',
    description: 'مكتب سياحي وترغب بالتعاون معنا',
    icon: Building2,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    phone: '00962798905595',
    whatsapp: '962798905595',
  },
  {
    id: 'development',
    title: 'تطوير وتعاون وخدمات',
    description: 'شراكة في التطوير أو تقديم خدمات متقدمة',
    icon: Briefcase,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    phone: '00962798905595',
    whatsapp: '962798905595',
  },
  {
    id: 'facilities',
    title: 'تسهيلات',
    description: 'طلب تسهيلات خاصة أو ترتيبات مخصصة',
    icon: Zap,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    phone: '00962798905595',
    whatsapp: '962798905595',
  },
  {
    id: 'private-contact',
    title: 'تواصل مباشر خاص',
    description: 'تواصل مباشر مع الإدارة للقضايا الخاصة',
    icon: Mail,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    phone: '00962798905595',
    whatsapp: '962798905595',
  },
  {
    id: 'private-trip',
    title: 'رحلات خاصة',
    description: 'ترتيب رحلة خاصة مخصصة لك أو لمجموعة',
    icon: Plane,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    phone: '00962798905595',
    whatsapp: '962798905595',
  },
  {
    id: 'private-service',
    title: 'خدمات خاصة',
    description: 'طلب خدمة مخصصة غير متوفرة في القائمة',
    icon: Briefcase,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    phone: '00962798905595',
    whatsapp: '962798905595',
  },
  {
    id: 'supervisor-cooperation',
    title: 'تعاون مشرف مع الموقع',
    description: 'مشرف موجود وترغب بتوسيع التعاون',
    icon: UserPlus,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    phone: '00962798905595',
    whatsapp: '962798905595',
  },
]

export default function ContactPage() {
  const [selectedType, setSelectedType] = useState<ContactType | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)

  const selectedTypeInfo = selectedType ? contactTypes.find(t => t.id === selectedType) : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedType) {
      toast.error('يرجى اختيار نوع الرسالة أولاً')
      return
    }
    
    if (!formData.name || !formData.phone || !formData.message) {
      toast.error('يرجى ملء جميع الحقول المطلوبة')
      return
    }

    setLoading(true)

    try {
      const supabase = createSupabaseBrowserClient()

      const typeInfo = contactTypes.find(t => t.id === selectedType)!
      const subject = typeInfo.title

      // حفظ الرسالة في قاعدة البيانات
      const { data: contactMessage, error: insertError } = await supabase
        .from('contact_messages')
        .insert({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone,
          subject: subject,
          message: `[${typeInfo.title}]\n\n${formData.message}`,
          status: 'new',
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error saving contact message:', insertError)
        throw new Error(insertError.message || 'فشل حفظ الرسالة')
      }

      // إرسال إشعار لجميع الإدمن
      try {
        await notifyAllAdmins({
          title: `رسالة تواصل جديدة: ${typeInfo.title}`,
          message: `رسالة جديدة من ${formData.name} (${formData.phone}): ${typeInfo.title}`,
          type: 'info',
          relatedType: 'contact',
          relatedId: contactMessage.id,
        })
      } catch (notifyError) {
        console.error('Error sending notification:', notifyError)
      }

      toast.success('تم إرسال رسالتك بنجاح! سنتواصل معك قريباً')
      setFormData({
        name: '',
        email: '',
        phone: '',
        message: '',
      })
      setSelectedType(null)
    } catch (error: any) {
      console.error('Error submitting contact form:', error)
      toast.error(error.message || 'حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-2 sm:px-3 md:px-4 py-4 sm:py-6 md:py-8 max-w-full overflow-x-hidden">
        <div className="text-center mb-5 sm:mb-6 md:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 mb-2 sm:mb-3">تواصل معنا</h1>
          <div className="w-20 sm:w-24 h-0.5 bg-blue-600 rounded-full mx-auto mb-3 sm:mb-4"></div>
          <p className="text-sm sm:text-base md:text-lg text-gray-600">اختر نوع التواصل المناسب لك</p>
        </div>

        {!selectedType ? (
          <>
            {/* قسم التعاون والعمل التشاركي */}
            <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white rounded-xl p-4 sm:p-6 md:p-8 mb-6 sm:mb-8 shadow-lg">
              <div className="max-w-5xl mx-auto">
                <div className="text-center mb-4 sm:mb-6">
                  <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-2 sm:mb-3 md:mb-4">فرص التعاون والعمل التشاركي</h2>
                  <p className="text-sm sm:text-base md:text-lg opacity-90 max-w-3xl mx-auto px-2">
                    انضم إلى شبكة من الشركاء والمشرفين الذين يساعدون في تقديم أفضل الخدمات للمجتمع السوري
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-4 sm:mt-6 md:mt-8">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 sm:p-5 border border-white/20">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                      <Target className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-yellow-300 flex-shrink-0" />
                      <h3 className="font-bold text-sm sm:text-base md:text-lg">شراكة استراتيجية</h3>
                    </div>
                    <p className="text-xs sm:text-sm opacity-90 leading-relaxed">
                      تعاون طويل الأمد مع فوائد متبادلة ونمو مستمر
                    </p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 sm:p-5 border border-white/20">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                      <Shield className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-green-300 flex-shrink-0" />
                      <h3 className="font-bold text-sm sm:text-base md:text-lg">دعم مستمر</h3>
                    </div>
                    <p className="text-xs sm:text-sm opacity-90 leading-relaxed">
                      نوفر لك الأدوات والدعم الفني اللازم للنجاح
                    </p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 sm:p-5 border border-white/20 sm:col-span-2 lg:col-span-1">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                      <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-blue-300 flex-shrink-0" />
                      <h3 className="font-bold text-sm sm:text-base md:text-lg">نمو مشترك</h3>
                    </div>
                    <p className="text-xs sm:text-sm opacity-90 leading-relaxed">
                      نمو معاً وخدمة أكبر عدد من المستفيدين
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* عرض جميع أنواع التواصل */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {contactTypes.map((type) => {
              const Icon = type.icon
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`${type.bgColor} p-5 sm:p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-transparent hover:border-gray-200 text-right`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className={`${type.color} bg-white p-3 rounded-lg shadow-sm`}>
                      <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>
                    <ArrowLeft className={`w-5 h-5 ${type.color} opacity-50 transition-opacity`} />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">{type.title}</h3>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{type.description}</p>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-700">
                      <Phone className="w-4 h-4" />
                      <span className="font-semibold">{type.phone || '00962798905595'}</span>
                    </div>
                  </div>
                </button>
              )
            })}
            </div>

            {/* قسم "لماذا تتعاون معنا؟" */}
            <div className="mt-6 sm:mt-8 md:mt-12 bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8">
              <div className="text-center mb-5 sm:mb-6 md:mb-8">
                <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 mb-2 sm:mb-3">لماذا تتعاون معنا؟</h2>
                <div className="w-16 sm:w-20 h-0.5 bg-blue-600 rounded-full mx-auto"></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="bg-blue-100 p-2 sm:p-3 rounded-lg flex-shrink-0">
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 mb-1 sm:mb-2 text-sm sm:text-base md:text-lg">منصة متكاملة</h3>
                    <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                      نوفر لك منصة متكاملة لإدارة عملائك وطلباتهم بسهولة وفعالية
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="bg-green-100 p-2 sm:p-3 rounded-lg flex-shrink-0">
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 mb-1 sm:mb-2 text-sm sm:text-base md:text-lg">تدريب شامل</h3>
                    <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                      تدريب كامل على استخدام النظام مع دعم فني مستمر
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="bg-purple-100 p-2 sm:p-3 rounded-lg flex-shrink-0">
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 mb-1 sm:mb-2 text-sm sm:text-base md:text-lg">تحديثات دورية</h3>
                    <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                      نحسن المنصة باستمرار ونضيف ميزات جديدة بناءً على احتياجاتك
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="bg-orange-100 p-2 sm:p-3 rounded-lg flex-shrink-0">
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 mb-1 sm:mb-2 text-sm sm:text-base md:text-lg">فرص نمو</h3>
                    <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                      توسع في السوق ووصل إلى قاعدة عملاء أوسع من خلال شبكتنا
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 sm:p-5 md:p-6 text-center">
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 mb-2 sm:mb-3">جاهز للبدء؟</h3>
                  <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
                    اختر نوع التعاون المناسب لك من القائمة أعلاه واملأ النموذج
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500">
                    سنتواصل معك خلال 24 ساعة لمناقشة تفاصيل التعاون
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* عرض نموذج التواصل */
          <div className="max-w-3xl mx-auto">
            <div className="bg-white p-4 sm:p-6 md:p-8 rounded-xl shadow-lg">
              {/* زر العودة */}
              <button
                onClick={() => {
                  setSelectedType(null)
                  setFormData({ name: '', email: '', phone: '', message: '' })
                }}
                className="flex items-center gap-2 text-sm sm:text-base text-gray-600 hover:text-blue-600 mb-6 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>العودة لاختيار نوع التواصل</span>
              </button>

              {/* معلومات النوع المختار */}
              {selectedTypeInfo && (
                <>
                  <div className={`${selectedTypeInfo.bgColor} p-4 sm:p-5 rounded-lg mb-6 border-2 border-gray-100`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`${selectedTypeInfo.color} bg-white p-2.5 rounded-lg`}>
                        {(() => {
                          const Icon = selectedTypeInfo.icon
                          return <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                        })()}
                      </div>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{selectedTypeInfo.title}</h2>
                        <p className="text-sm sm:text-base text-gray-600 mt-1">{selectedTypeInfo.description}</p>
                      </div>
                    </div>
                    
                    {/* أرقام التواصل المباشر */}
                    <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-3">
                      {selectedTypeInfo.whatsapp && (
                        <a
                          href={`https://wa.me/${selectedTypeInfo.whatsapp}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold"
                        >
                          <MessageCircle className="w-4 h-4" />
                          واتساب مباشر
                        </a>
                      )}
                      {selectedTypeInfo.phone && (
                        <a
                          href={`tel:${selectedTypeInfo.phone}`}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
                        >
                          <Phone className="w-4 h-4" />
                          اتصال مباشر
                        </a>
                      )}
                    </div>
                  </div>

                  {/* معلومات إضافية لأنواع التعاون */}
                  {['supervisor-join', 'development', 'office-coordination', 'supervisor-cooperation'].includes(selectedType) && (
                    <div className="bg-blue-50 border-r-4 border-blue-600 p-4 sm:p-5 rounded-lg mb-4 sm:mb-6">
                      <h3 className="font-bold text-blue-900 mb-3 sm:mb-4 text-base sm:text-lg flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                        <span>معلومات عن التعاون:</span>
                      </h3>
                      <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-blue-800">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <span>نوفر لك منصة متكاملة لإدارة عملائك وطلباتهم بسهولة وفعالية</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <span>دعم فني مستمر وتحديثات دورية لضمان أفضل أداء</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <span>تدريب شامل على استخدام النظام مع فريق الدعم</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <span>فرص نمو وتوسع في السوق من خلال شبكة الشركاء</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <span>مرونة في التعاون حسب احتياجاتك وأهدافك</span>
                        </li>
                      </ul>
                      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-blue-200">
                        <p className="text-xs sm:text-sm text-blue-700 font-semibold">
                          💡 نصيحة: اذكر في رسالتك نوع التعاون الذي تفضله وأهدافك من الشراكة
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* النموذج */}
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    الاسم الكامل *
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="أدخل اسمك الكامل"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    البريد الإلكتروني (اختياري)
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="example@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    رقم الهاتف *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+962XXXXXXXXX أو 05XXXXXXXX"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    الرسالة *
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="اكتب رسالتك هنا..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg text-sm sm:text-base font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                  {loading ? 'جاري الإرسال...' : 'إرسال الرسالة'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
