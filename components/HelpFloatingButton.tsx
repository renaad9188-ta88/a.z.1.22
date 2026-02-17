'use client'

import { useState } from 'react'
import { HelpCircle, X, MessageCircle, Phone, BookOpen, MapPin } from 'lucide-react'
import Link from 'next/link'

export default function HelpFloatingButton() {
  const [showHelp, setShowHelp] = useState(false)

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setShowHelp(!showHelp)}
        className="fixed bottom-4 left-4 z-40 w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
        aria-label="مركز المساعدة"
      >
        <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Help Panel - Modal */}
      {showHelp && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={() => setShowHelp(false)}
          />
          
          {/* Panel - يظهر من الأسفل */}
          <div className="fixed bottom-20 left-4 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 w-80 max-h-[70vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="font-bold text-base sm:text-lg">مركز المساعدة</h3>
              <button
                onClick={() => setShowHelp(false)}
                className="w-8 h-8 hover:bg-white/20 rounded-full flex items-center justify-center transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Quick Actions Icons */}
            <div className="p-4 border-b border-gray-200">
              <p className="text-xs text-gray-600 mb-3 font-medium">وصول سريع:</p>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/services/jordan-visit"
                  onClick={() => setShowHelp(false)}
                  className="flex flex-col items-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                >
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <span className="text-xs font-semibold text-gray-800">طلب زيارة</span>
                </Link>
                
                <Link
                  href="/map"
                  onClick={() => setShowHelp(false)}
                  className="flex flex-col items-center gap-2 p-3 bg-green-50 hover:bg-green-100 rounded-lg transition"
                >
                  <MapPin className="w-5 h-5 text-green-600" />
                  <span className="text-xs font-semibold text-gray-800">تتبع رحلة</span>
                </Link>
                
                <a
                  href="https://wa.me/962798905595"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowHelp(false)}
                  className="flex flex-col items-center gap-2 p-3 bg-green-50 hover:bg-green-100 rounded-lg transition"
                >
                  <MessageCircle className="w-5 h-5 text-green-600" />
                  <span className="text-xs font-semibold text-gray-800">واتساب</span>
                </a>
                
                <a
                  href="tel:00962798905595"
                  onClick={() => setShowHelp(false)}
                  className="flex flex-col items-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                >
                  <Phone className="w-5 h-5 text-blue-600" />
                  <span className="text-xs font-semibold text-gray-800">اتصال</span>
                </a>
              </div>
            </div>
            
            {/* Detailed Links */}
            <div className="p-4 space-y-3">
              <Link
                href="/services/jordan-visit"
                onClick={() => setShowHelp(false)}
                className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
              >
                <BookOpen className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-gray-800">كيف أقدم طلب زيارة؟</p>
                  <p className="text-xs text-gray-600">دليل خطوة بخطوة</p>
                </div>
              </Link>
              
              <Link
                href="/map"
                onClick={() => setShowHelp(false)}
                className="flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 rounded-lg transition"
              >
                <MapPin className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-gray-800">تتبع رحلتي</p>
                  <p className="text-xs text-gray-600">عرض الخريطة والتتبع</p>
                </div>
              </Link>
              
              <a
                href="https://wa.me/962798905595"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowHelp(false)}
                className="flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 rounded-lg transition"
              >
                <MessageCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-gray-800">واتساب للمساعدة</p>
                  <p className="text-xs text-gray-600">تواصل مباشر</p>
                </div>
              </a>
              
              <a
                href="tel:00962798905595"
                onClick={() => setShowHelp(false)}
                className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
              >
                <Phone className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-gray-800">اتصال للمساعدة</p>
                  <p className="text-xs text-gray-600">00962798905595</p>
                </div>
              </a>
            </div>
          </div>
        </>
      )}
    </>
  )
}

