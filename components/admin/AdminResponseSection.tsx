'use client'

import { Save } from 'lucide-react'

interface AdminResponse {
  body: string
  dateText?: string
}

interface AdminResponseSectionProps {
  latestResponse: AdminResponse | null
  responseHistory: AdminResponse[]
  newResponse: string
  saving: boolean
  onResponseChange: (value: string) => void
  onSave: () => void
  onClear: () => void
}

export default function AdminResponseSection({
  latestResponse,
  responseHistory,
  newResponse,
  saving,
  onResponseChange,
  onSave,
  onClear,
}: AdminResponseSectionProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="font-extrabold text-gray-900 mb-2">ردود الإدارة (تصل للمستخدم)</p>
      {latestResponse ? (
        <div className="mb-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">آخر رد</p>
          <p className="text-sm text-gray-800 font-semibold whitespace-pre-wrap">{latestResponse.body}</p>
          {latestResponse.dateText && (
            <p className="mt-1 text-[11px] text-gray-500">تاريخ: {latestResponse.dateText}</p>
          )}
        </div>
      ) : (
        <div className="mb-3 text-sm text-gray-600">لا يوجد رد حتى الآن.</div>
      )}

      <textarea
        value={newResponse}
        onChange={(e) => onResponseChange(e.target.value)}
        rows={4}
        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
        placeholder="اكتب رد الإدارة هنا..."
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          إرسال الرد
        </button>
        <button
          type="button"
          onClick={onClear}
          className="px-4 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition text-sm font-semibold"
        >
          مسح
        </button>
      </div>

      {responseHistory.length > 1 && (
        <div className="mt-4">
          <p className="text-xs font-bold text-gray-700 mb-2">سجل الردود</p>
          <div className="space-y-2">
            {responseHistory.slice(0, 5).map((r, idx) => (
              <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">
                  {r.dateText ? `تاريخ: ${r.dateText}` : 'بدون تاريخ'}
                </p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{r.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}



