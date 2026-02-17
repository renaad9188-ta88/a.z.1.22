'use client'

import { useState, useEffect } from 'react'
import { X, ArrowRight, CheckCircle, MessageCircle, Phone } from 'lucide-react'
import Link from 'next/link'

export default function WelcomeGuide() {
  const [showGuide, setShowGuide] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    // التحقق من أول زيارة
    const hasSeenGuide = localStorage.getItem('hasSeenWelcomeGuide')
    if (!hasSeenGuide) {
      // تأخير بسيط لإظهار الدليل بعد تحميل الصفحة
      setTimeout(() => {
        setShowGuide(true)
      }, 1000)
    }
  }, [])

  const steps = [
    {
      title: 'مرحباً بك في سوريا بلس! 🎉',
      content: 'منصة شاملة لتنظيم الزيارات والقدوم إلى الأردن',
      icon: '👋',
      description: 'نقدم لك خدمات متكاملة لتنظيم زيارتك بكل سهولة'
    },
    {
      title: 'خدمة القدوم والزيارات 🚌',
      content: 'نظم قدومك للأردن مع خدمات شاملة',
      icon: '🛂',
      description: '• حجز رحلات القدوم والذهاب\n• تتبع الرحلة على الخريطة\n• خدمات خاصة وسيارات خاصة\n• قدوم مطار (طيران)'
    },
    {
      title: 'كيف تقدم طلبك؟ 📝',
      content: 'خطوات بسيطة وسريعة',
      icon: '✅',
      description: '1. اختر نوع الخدمة (زيارة، عمرة، فيز)\n2. املأ البيانات المطلوبة\n3. ارفع صورة الجواز\n4. تابع حالة طلبك'
    },
    {
      title: 'تتبع رحلتك 🗺️',
      content: 'راقب رحلتك لحظة بلحظة',
      icon: '📍',
      description: '• تتبع موقع الحافلة على الخريطة\n• معرفة وقت الوصول المتوقع\n• تحديثات فورية لحالة الرحلة'
    },
    {
      title: 'نحن هنا لمساعدتك 💬',
      content: 'تواصل معنا في أي وقت',
      icon: '🤝',
      description: '• واتساب: 00962798905595\n• هاتف: 00962798905595\n• متاحون 24/7 لمساعدتك'
    }
  ]

  const handleClose = () => {
    setShowGuide(false)
    localStorage.setItem('hasSeenWelcomeGuide', 'true')
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleClose()
    }
  }

  const handleSkip = () => {
    handleClose()
  }

  if (!showGuide) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sm:p-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">{steps[currentStep].icon}</span>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold">دليل الاستخدام</h3>
              <p className="text-xs sm:text-sm text-blue-100">
                {currentStep + 1} من {steps.length}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-800 mb-3">
            {steps[currentStep].title}
          </h2>
          <p className="text-lg sm:text-xl text-gray-700 mb-4 font-semibold">
            {steps[currentStep].content}
          </p>
          <div className="bg-blue-50 rounded-xl p-4 sm:p-5 mb-6">
            <p className="text-sm sm:text-base text-gray-700 whitespace-pre-line leading-relaxed">
              {steps[currentStep].description}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 flex-1 rounded-full transition-all ${
                    index <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {currentStep < steps.length - 1 ? (
              <>
                <button
                  onClick={handleSkip}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-gray-700 transition"
                >
                  تخطي
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition"
                >
                  التالي
                  <ArrowRight className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button
                onClick={handleClose}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition"
              >
                ابدأ الآن
                <CheckCircle className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

