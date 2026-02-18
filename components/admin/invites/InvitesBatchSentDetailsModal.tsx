'use client'

import { X, FileText, Calendar, User, Send, CheckCircle2, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface Batch {
  id: string
  name: string
  sent_at?: string | null
  confirmed_sent_at?: string | null
  confirmed_sent_by?: string | null
  confirmed_sent_role?: 'admin' | 'supervisor' | null
  sent_count?: number
  total_count?: number
  joined_count?: number
  last_message_sent?: string | null
}

interface InvitesBatchSentDetailsModalProps {
  batch: Batch | null
  onClose: () => void
}

export default function InvitesBatchSentDetailsModal({
  batch,
  onClose,
}: InvitesBatchSentDetailsModalProps) {
  if (!batch) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-center justify-between">
          <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600" />
            تفاصيل إرسال المجموعة: {batch.name}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* معلومات الإرسال */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-xs sm:text-sm font-extrabold text-blue-800">تاريخ الإرسال</span>
              </div>
              <div className="text-sm sm:text-base font-bold text-blue-900">
                {batch.sent_at || batch.confirmed_sent_at
                  ? new Date(batch.sent_at || batch.confirmed_sent_at || '').toLocaleString('ar-JO', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'غير محدد'}
              </div>
            </div>
            
            {batch.confirmed_sent_by && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-green-600" />
                  <span className="text-xs sm:text-sm font-extrabold text-green-800">أكد الإرسال</span>
                </div>
                <div className="text-sm sm:text-base font-bold text-green-900">
                  {batch.confirmed_sent_role === 'admin' ? 'أدمن' : 'مشرف'}
                  {batch.confirmed_sent_at && (
                    <span className="block text-xs text-green-700 mt-1">
                      {new Date(batch.confirmed_sent_at).toLocaleString('ar-JO', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>
              </div>
            )}
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <Send className="w-4 h-4 text-purple-600" />
                <span className="text-xs sm:text-sm font-extrabold text-purple-800">عدد المرسلة</span>
              </div>
              <div className="text-sm sm:text-base font-bold text-purple-900 tabular-nums">
                {batch.sent_count || 0} من {batch.total_count || 0}
              </div>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600" />
                <span className="text-xs sm:text-sm font-extrabold text-amber-800">انضم</span>
              </div>
              <div className="text-sm sm:text-base font-bold text-amber-900 tabular-nums">
                {batch.joined_count || 0} شخص
              </div>
            </div>
          </div>

          {/* نص الرسالة */}
          {batch.last_message_sent && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle className="w-5 h-5 text-gray-600" />
                <h4 className="text-sm sm:text-base font-extrabold text-gray-900">نص الرسالة المرسلة</h4>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
                <pre className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap font-medium leading-relaxed">
                  {batch.last_message_sent}
                </pre>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(batch.last_message_sent!)
                  toast.success('تم نسخ نص الرسالة')
                }}
                className="mt-3 w-full px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-extrabold text-sm hover:bg-gray-300 transition inline-flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                نسخ نص الرسالة
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

