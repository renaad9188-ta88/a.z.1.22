'use client'

import { useRef } from 'react'
import { Upload, Plus, Pencil } from 'lucide-react'
import type { ImportItem } from './InvitesManagementTypes'

interface InvitesImportSectionProps {
  importText: string
  setImportText: (text: string) => void
  importing: boolean
  onImport: () => void
  addForm: { full_name: string; phone: string; country: string }
  setAddForm: (form: { full_name: string; phone: string; country: string }) => void
  savingOne: boolean
  onAddOne: () => void
  messageTpl: string
  setMessageTpl: (text: string) => void
}

export default function InvitesImportSection({
  importText,
  setImportText,
  importing,
  onImport,
  addForm,
  setAddForm,
  savingOne,
  onAddOne,
  messageTpl,
  setMessageTpl,
}: InvitesImportSectionProps) {
  const fileRef = useRef<HTMLInputElement | null>(null)

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm sm:text-base font-extrabold text-gray-900 flex items-center gap-2">
            <Upload className="w-4 h-4 text-blue-600" />
            إدخال/استيراد أرقام
          </h4>
          <p className="text-xs text-gray-600 mt-1">
            يمكنك إضافة رقم واحد بسرعة أو لصق/رفع CSV. افتراضياً: <span className="font-bold">واتساب = الهاتف</span>
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              const txt = await f.text()
              setImportText(txt)
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gray-100 text-gray-900 font-extrabold text-sm hover:bg-gray-200 transition"
          >
            اختيار ملف
          </button>
          <button
            type="button"
            onClick={onImport}
            disabled={importing}
            className="w-full sm:w-auto px-3 sm:px-4 py-2 rounded-lg bg-green-600 text-white font-extrabold text-sm hover:bg-green-700 transition disabled:opacity-50 inline-flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm hover:shadow-md"
            title="استيراد الأرقام من الملف"
          >
            <Upload className="w-4 h-4 flex-shrink-0" />
            <span>{importing ? 'جارٍ الاستيراد...' : 'استيراد'}</span>
          </button>
        </div>
      </div>

      {/* Add single */}
      <div className="mt-4 border border-gray-200 rounded-xl p-3 sm:p-4">
        <div className="text-xs sm:text-sm font-extrabold text-gray-900 flex items-center gap-2">
          <Plus className="w-4 h-4 text-blue-600" />
          إضافة رقم واحد
          <span className="text-[11px] font-bold text-gray-500">(واتساب = الهاتف)</span>
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            value={addForm.full_name}
            onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="الاسم (اختياري)"
          />
          <input
            value={addForm.phone}
            onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="رقم الهاتف *"
          />
          <div className="flex gap-2">
            <input
              value={addForm.country}
              onChange={(e) => setAddForm({ ...addForm, country: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="الدولة (اختياري) SY/JO"
            />
            <button
              type="button"
              onClick={onAddOne}
              disabled={savingOne}
              className="px-3 sm:px-4 py-2 rounded-lg bg-blue-600 text-white font-extrabold text-sm hover:bg-blue-700 transition disabled:opacity-50 whitespace-nowrap inline-flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm hover:shadow-md"
            >
              {savingOne ? '...' : 'إضافة'}
            </button>
          </div>
        </div>
      </div>

      {/* Message template */}
      <div className="mt-4 border border-gray-200 rounded-xl p-3 sm:p-4">
        <div className="text-xs sm:text-sm font-extrabold text-gray-900 flex items-center gap-2">
          <Pencil className="w-4 h-4 text-blue-600" />
          نص الرسالة (قابل للتعديل)
          <span className="text-[11px] font-bold text-gray-500">{'{name}'} + {'{link}'}</span>
        </div>
        <textarea
          value={messageTpl}
          onChange={(e) => setMessageTpl(e.target.value)}
          rows={4}
          className="mt-2 w-full border border-gray-200 rounded-lg p-3 text-sm"
        />
      </div>

      <textarea
        value={importText}
        onChange={(e) => setImportText(e.target.value)}
        rows={6}
        className="mt-3 w-full border border-gray-200 rounded-lg p-3 text-sm font-mono"
        placeholder="مثال:\nأحمد محمد,9639xxxxxxx,9639xxxxxxx,SY\nبدون اسم,9627xxxxxxx,,JO"
      />
    </div>
  )
}

