'use client'

import { ArrowDown, ArrowUp, Edit, Plus, Trash2 } from 'lucide-react'

export type EditorStop = { id: string; name: string }

export default function RouteStopsEditor({
  title,
  colorClass,
  stops,
  addMode,
  onToggleAddMode,
  onMove,
  onEdit,
  onDelete,
}: {
  title: string
  colorClass: string
  stops: EditorStop[]
  addMode: boolean
  onToggleAddMode: () => void
  onMove: (index: number, dir: -1 | 1) => void
  onEdit: (index: number) => void
  onDelete: (index: number) => void
}) {
  return (
    <div className="border border-gray-200 rounded-2xl p-3 bg-white">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-extrabold text-gray-900">{title}</p>
        <button
          type="button"
          onClick={onToggleAddMode}
          className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 sm:gap-2 border transition touch-manipulation ${
            addMode ? 'bg-gray-900 text-white border-gray-900' : `bg-white ${colorClass} border-gray-200 hover:bg-gray-50 active:bg-gray-100`
          }`}
          title={addMode ? 'إلغاء وضع الإضافة' : 'إضافة محطة من الخريطة'}
          style={{ touchAction: 'manipulation' }}
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
          <span className="whitespace-nowrap">{addMode ? 'إلغاء الإضافة' : 'إضافة محطة'}</span>
        </button>
      </div>

      <p className="mt-1 text-[11px] sm:text-xs text-gray-600 font-semibold">
        إضافة/تعديل/حذف/ترتيب — والمحطات مرسومة على الخريطة بخط متصل.
      </p>

      <div className="mt-3 space-y-2">
        {stops.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-xs text-gray-600 font-bold">
            لا توجد محطات بعد. اضغط &quot;إضافة محطة&quot; ثم انقر على الخريطة.
          </div>
        ) : (
          stops.map((s, idx) => (
            <div key={s.id} className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-xl">
              <span className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-extrabold">
                {idx + 1}
              </span>
              <span className="flex-1 text-xs sm:text-sm font-bold text-gray-900 truncate">{s.name}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onMove(idx, -1)}
                  disabled={idx === 0}
                  className="p-1.5 sm:p-2 rounded-lg border border-gray-200 hover:bg-white active:bg-gray-100 disabled:opacity-30 touch-manipulation"
                  title="أعلى"
                  style={{ touchAction: 'manipulation', minWidth: '36px', minHeight: '36px' }}
                >
                  <ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onMove(idx, 1)}
                  disabled={idx === stops.length - 1}
                  className="p-1.5 sm:p-2 rounded-lg border border-gray-200 hover:bg-white active:bg-gray-100 disabled:opacity-30 touch-manipulation"
                  title="أسفل"
                  style={{ touchAction: 'manipulation', minWidth: '36px', minHeight: '36px' }}
                >
                  <ArrowDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(idx)}
                  className="p-1.5 sm:p-2 rounded-lg border border-gray-200 hover:bg-white active:bg-gray-100 touch-manipulation"
                  title="تعديل الاسم"
                  style={{ touchAction: 'manipulation', minWidth: '36px', minHeight: '36px' }}
                >
                  <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-700" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(idx)}
                  className="p-1.5 sm:p-2 rounded-lg border border-gray-200 hover:bg-white active:bg-gray-100 touch-manipulation"
                  title="حذف"
                  style={{ touchAction: 'manipulation', minWidth: '36px', minHeight: '36px' }}
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-700" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}


