'use client'

import { Users, Plus, X, Eye, Send, RefreshCw, CheckCircle2, Trash2, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

interface Batch {
  id: string
  name: string
  total_count?: number
  sent_count?: number
  joined_count?: number
  sent_at?: string | null
  confirmed_sent_at?: string | null
  last_message_sent?: string | null
}

interface InvitesBatchSectionProps {
  batches: Batch[]
  loadingBatches: boolean
  showCreateBatch: boolean
  setShowCreateBatch: (show: boolean) => void
  newBatchName: string
  setNewBatchName: (name: string) => void
  creatingBatches: boolean
  onCreateBatch: () => void
  onBatchClick: (batchId: string) => void
  sendingBatch: string | null
  onSendBatch: (batchId: string) => void
  onConfirmBatchSent: (batchId: string) => void
  onShowBatchSentDetails: (batchId: string) => void
  onDeleteBatch: (batchId: string) => void
}

export default function InvitesBatchSection({
  batches,
  loadingBatches,
  showCreateBatch,
  setShowCreateBatch,
  newBatchName,
  setNewBatchName,
  creatingBatches,
  onCreateBatch,
  onBatchClick,
  sendingBatch,
  onSendBatch,
  onConfirmBatchSent,
  onShowBatchSentDetails,
  onDeleteBatch,
}: InvitesBatchSectionProps) {
  return (
    <>
      {/* إنشاء مجموعة جديدة */}
      {showCreateBatch && (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm sm:text-base font-extrabold text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              إنشاء مجموعة جديدة
            </h4>
            <button
              type="button"
              onClick={() => {
                setShowCreateBatch(false)
                setNewBatchName('')
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newBatchName}
              onChange={(e) => setNewBatchName(e.target.value)}
              placeholder="اسم المجموعة (مثل: مجموعة 1)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              onKeyPress={(e) => {
                if (e.key === 'Enter') onCreateBatch()
              }}
            />
            <button
              type="button"
              onClick={onCreateBatch}
              disabled={creatingBatches || !newBatchName.trim()}
              className="px-3 sm:px-4 py-2 rounded-lg bg-purple-600 text-white font-extrabold text-sm hover:bg-purple-700 transition disabled:opacity-50 inline-flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm hover:shadow-md"
              title="إنشاء مجموعة جديدة"
            >
              <Plus className="w-4 h-4 flex-shrink-0" />
              <span>{creatingBatches ? 'جاري الإنشاء...' : 'إنشاء'}</span>
            </button>
          </div>
        </div>
      )}

      {/* عرض المجموعات */}
      {batches.length > 0 && (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-5">
          <h4 className="text-sm sm:text-base font-extrabold text-gray-900 flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-blue-600" />
            المجموعات ({batches.length})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {batches.map((batch) => (
              <div
                key={batch.id}
                className="border border-gray-200 rounded-lg p-3 hover:border-purple-300 hover:shadow-md transition cursor-pointer"
                onClick={() => onBatchClick(batch.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h5 className="font-extrabold text-sm text-gray-900 truncate flex-1">{batch.name}</h5>
                  {batch.sent_at && (
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  )}
                </div>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>الإجمالي:</span>
                    <span className="font-bold text-gray-900 tabular-nums">{batch.total_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>مرسلة:</span>
                    <span className="font-bold text-amber-600 tabular-nums">{batch.sent_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>انضم:</span>
                    <span className={`font-bold tabular-nums ${(batch.joined_count || 0) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      {batch.joined_count || 0}
                      {(batch.joined_count || 0) > 0 && (
                        <span className="mr-1 text-[10px]">✓</span>
                      )}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onBatchClick(batch.id)
                    }}
                    className="flex-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-blue-600 text-white font-extrabold text-[10px] sm:text-xs hover:bg-blue-700 transition inline-flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm hover:shadow-md"
                    title="عرض محتوى المجموعة"
                  >
                    <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">عرض</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSendBatch(batch.id)
                    }}
                    disabled={sendingBatch === batch.id || !!batch.sent_at}
                    className="flex-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-purple-600 text-white font-extrabold text-[10px] sm:text-xs hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm hover:shadow-md"
                    title={batch.sent_at ? 'تم الإرسال' : 'إرسال المجموعة عبر واتساب'}
                  >
                    {sendingBatch === batch.id ? (
                      <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 animate-spin" />
                    ) : batch.sent_at ? (
                      <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    ) : (
                      <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    )}
                    <span className="whitespace-nowrap">
                      {sendingBatch === batch.id ? 'جاري الإرسال...' : batch.sent_at ? 'تم الإرسال' : 'إرسال'}
                    </span>
                  </button>
                  {(batch.sent_at || batch.confirmed_sent_at) ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onShowBatchSentDetails(batch.id)
                      }}
                      className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-green-600 text-white font-extrabold text-[10px] sm:text-xs hover:bg-green-700 transition inline-flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm hover:shadow-md"
                      title="عرض تفاصيل الإرسال"
                    >
                      <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">تفاصيل الإرسال</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onConfirmBatchSent(batch.id)
                      }}
                      className="w-full px-2 sm:px-3 py-1.5 rounded-lg bg-amber-600 text-white font-extrabold text-[10px] sm:text-xs hover:bg-amber-700 transition inline-flex items-center justify-center gap-1"
                      title="تأكيد إرسال المجموعة يدوياً"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>تم الإرسال</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteBatch(batch.id)
                    }}
                    className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-red-600 text-white font-extrabold text-[10px] sm:text-xs hover:bg-red-700 transition inline-flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm hover:shadow-md"
                    title="حذف المجموعة"
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">حذف المجموعة</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

