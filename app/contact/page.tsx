'use client'

import { useState } from 'react'
import { Phone, Mail, Globe, MessageCircle, Send } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // In a real application, you would send this to your backend
    // For now, we'll just show a success message
    setTimeout(() => {
      toast.success('تم إرسال رسالتك بنجاح! سنتواصل معك قريباً')
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
      })
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-6 sm:py-8 px-3 sm:px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-3 sm:mb-4">تواصل معنا</h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-600">نحن هنا لمساعدتك في أي استفسار</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
          {/* Contact Information */}
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
              <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">معلومات التواصل</h2>
              
              <div className="space-y-3 sm:space-y-4">
                <a href="tel:+966541700017" className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm sm:text-base text-gray-800">الهاتف</p>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">+966541700017</p>
                  </div>
                </a>

                <a href="https://wa.me/966541700017" target="_blank" className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-green-50 rounded-lg hover:bg-green-100 transition">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm sm:text-base text-gray-800">واتساب</p>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">+966541700017</p>
                  </div>
                </a>

                <a href="mailto:info@maidaa-sa.com" className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm sm:text-base text-gray-800">البريد الإلكتروني</p>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">info@maidaa-sa.com</p>
                  </div>
                </a>

                <a href="https://www.maidaa-sa.com" target="_blank" className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm sm:text-base text-gray-800">الموقع الإلكتروني</p>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">www.maidaa-sa.com</p>
                  </div>
                </a>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
              <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">ساعات العمل</h3>
              <div className="space-y-2 text-sm sm:text-base text-gray-700">
                <p><strong>الأحد - الخميس:</strong> 9:00 ص - 6:00 م</p>
                <p><strong>الجمعة:</strong> 2:00 م - 6:00 م</p>
                <p><strong>السبت:</strong> مغلق</p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white p-5 sm:p-6 md:p-8 rounded-lg shadow-md">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">أرسل لنا رسالة</h2>
            
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
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  البريد الإلكتروني *
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                  الموضوع *
                </label>
                <input
                  type="text"
                  id="subject"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  الرسالة *
                </label>
                <textarea
                  id="message"
                  required
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
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
      </div>
    </div>
  )
}

