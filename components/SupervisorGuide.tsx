'use client'

import { useState, useEffect } from 'react'
import { X, ArrowRight, CheckCircle, ArrowLeft, Shield, CreditCard, BookOpen, Users, MessageCircle, Phone, MapPin, Star, Settings } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'

interface SupervisorGuideProps {
  onClose?: () => void
}

export default function SupervisorGuide({ onClose }: SupervisorGuideProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    {
      title: 'مرحباً بك كمشرف! 👋',
      content: 'دليل شامل لطريقة العمل والصلاحيات',
      icon: '🎯',
      description: 'ستتعلم في هذا الدليل:\n• صلاحياتك ومسؤولياتك\n• كيفية التعامل مع الطلبات\n• إدارة الحجوزات والرحلات\n• التواصل مع الأدمن والمستخدمين',
      color: 'from-blue-600 to-blue-700'
    },
    {
      title: 'صلاحياتك ومسؤولياتك 🛡️',
      content: 'ما يمكنك فعله في النظام',
      icon: '⚡',
      description: '✅ مراجعة الطلبات المعينة لك\n✅ طلب الرسوم من المستخدمين\n✅ تأكيد الدفعات\n✅ حجز الرحلات للمستخدمين\n✅ إدارة المنتسبين والمجموعات\n✅ التواصل مع المستخدمين والأدمن',
      color: 'from-purple-600 to-purple-700'
    },
    {
      title: 'سير العمل: من الطلب إلى الحجز 📋',
      content: 'خطوات العمل الكاملة',
      icon: '🔄',
      description: '1️⃣ المستخدم يقدم طلب زيارة\n2️⃣ الأدمن يعين الطلب لك\n3️⃣ تطلب الرسوم من المستخدم\n4️⃣ تؤكد استلام الدفعة\n5️⃣ تحجز رحلة القدوم والمغادرة\n6️⃣ تسلم المستخدم للنقل',
      color: 'from-green-600 to-green-700'
    },
    {
      title: 'طلب الرسوم من المستخدم 💰',
      content: 'كيف تطلب الرسوم وتؤكد الدفعة',
      icon: '💳',
      description: '• تواصل مع المستخدم عبر واتساب أو هاتف\n• أخبره بالمبلغ المطلوب\n• بعد الدفع، اذهب إلى الطلب واضغط "تأكيد الدفعة"\n• سيتم فتح خيار الحجز تلقائياً',
      color: 'from-amber-600 to-amber-700'
    },
    {
      title: 'حجز الرحلات للمستخدم ✈️',
      content: 'كيف تحجز رحلة القدوم والمغادرة',
      icon: '🚌',
      description: '• بعد تأكيد الدفعة، اضغط "حجز موعد الرحلة"\n• اختر تاريخ القدوم (أحد، ثلاثاء، خميس)\n• اختر تاريخ المغادرة (يُحسب تلقائياً)\n• اضغط "تأكيد الحجز" لإعلام المستخدم',
      color: 'from-cyan-600 to-cyan-700'
    },
    {
      title: 'إخبار المستخدم بقوة الموقع 🌟',
      content: 'نقاط القوة التي تبرزها للمستخدم',
      icon: '⭐',
      description: '✅ تتبع مباشر على الخريطة\n✅ تحديثات فورية لحالة الرحلة\n✅ جودة عالية في الخدمة\n✅ فريق محترف ومتابعة مستمرة\n✅ سهولة الاستخدام والوضوح',
      color: 'from-indigo-600 to-indigo-700'
    },
    {
      title: 'إدارة المنتسبين والمجموعات 👥',
      content: 'كيف تضيف المستخدمين وتدعوهم',
      icon: '👨‍👩‍👧‍👦',
      description: '• من لوحة الإدارة: "إدارة المنتسبين"\n• أضف مستخدمين للمجموعات\n• أرسل دعوات عبر واتساب\n• تابع المنتسبين المعينين لك',
      color: 'from-pink-600 to-pink-700'
    },
    {
      title: 'التواصل مع الأدمن 📞',
      content: 'متى وكيف تتواصل مع الأدمن',
      icon: '🤝',
      description: 'تواصل مع الأدمن في الحالات التالية:\n• إضافة رحلة جديدة\n• تعديل رحلة موجودة\n• استفسار عن طريقة عمل\n• طلب صلاحيات إضافية\n• أي مشكلة تقنية',
      color: 'from-red-600 to-red-700'
    },
    {
      title: 'أنت جاهز للبدء! 🚀',
      content: 'ابدأ العمل الآن',
      icon: '🎉',
      description: '• راجع الطلبات المعينة لك\n• ابدأ بالتواصل مع المستخدمين\n• استخدم زر المساعدة في أي وقت\n• تواصل مع الأدمن عند الحاجة',
      color: 'from-emerald-600 to-emerald-700'
    }
  ]

  const handleClose = () => {
    localStorage.setItem('hasSeenSupervisorGuide', 'true')
    onClose?.()
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleClose()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const currentStepData = steps[currentStep]
  const progress = ((currentStep + 1) / steps.length) * 100

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`bg-gradient-to-r ${currentStepData.color} text-white p-4 sm:p-6 rounded-t-xl sm:rounded-t-2xl flex items-center justify-between flex-shrink-0`}>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 text-2xl sm:text-3xl">
              {currentStepData.icon}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold">{currentStepData.title}</h2>
              <p className="text-xs sm:text-sm text-white/90 mt-0.5">{currentStepData.content}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 sm:w-10 sm:h-10 hover:bg-white/20 rounded-full flex items-center justify-center transition flex-shrink-0"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 bg-gray-200 flex-shrink-0">
          <div 
            className={`h-full bg-gradient-to-r ${currentStepData.color} transition-all duration-300`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200">
              <p className="text-sm sm:text-base text-gray-700 whitespace-pre-line leading-relaxed">
                {currentStepData.description}
              </p>
            </div>

            {/* Quick Actions for specific steps */}
            {currentStep === 3 && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  نصيحة مهمة:
                </p>
                <p className="text-xs sm:text-sm text-blue-800">
                  استخدم زر "تأكيد الدفعة" في صفحة الطلب بعد استلام المبلغ من المستخدم. سيتم فتح خيار الحجز تلقائياً.
                </p>
              </div>
            )}

            {currentStep === 4 && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-sm font-semibold text-green-900 mb-2 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  موقع الحجز:
                </p>
                <p className="text-xs sm:text-sm text-green-800">
                  اذهب إلى لوحة الإدارة → الطلبات → اضغط على الطلب → "حجز موعد الرحلة"
                </p>
              </div>
            )}

            {currentStep === 6 && (
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <p className="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  إدارة المنتسبين:
                </p>
                <p className="text-xs sm:text-sm text-purple-800">
                  من لوحة الإدارة يمكنك إضافة المستخدمين للمجموعات وإرسال دعوات لهم عبر واتساب
                </p>
              </div>
            )}

            {currentStep === 7 && (
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <p className="text-sm font-semibold text-amber-900 mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  معلومات التواصل مع الأدمن:
                </p>
                <div className="space-y-2 text-xs sm:text-sm text-amber-800">
                  <p className="flex items-center gap-2">
                    <MessageCircle className="w-3.5 h-3.5" />
                    واتساب: 00962798905595
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5" />
                    هاتف: 00962798905595
                  </p>
                  <p className="text-amber-700 font-medium">متاحون 24/7 لمساعدتك</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 sm:p-6 flex items-center justify-between gap-3 sm:gap-4 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
            <span>{currentStep + 1}</span>
            <span>/</span>
            <span>{steps.length}</span>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-4 py-2 sm:px-5 sm:py-2.5 text-sm sm:text-base text-gray-700 hover:bg-gray-100 rounded-lg transition flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">السابق</span>
              </button>
            )}
            
            <button
              onClick={handleNext}
              className={`px-4 py-2 sm:px-6 sm:py-2.5 text-sm sm:text-base text-white rounded-lg transition flex items-center gap-2 bg-gradient-to-r ${currentStepData.color} hover:opacity-90`}
            >
              <span>{currentStep === steps.length - 1 ? 'إنهاء' : 'التالي'}</span>
              {currentStep < steps.length - 1 && <ArrowRight className="w-4 h-4" />}
              {currentStep === steps.length - 1 && <CheckCircle className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

