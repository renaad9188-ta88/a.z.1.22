'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageCircle, Edit2, Trash2, MoreVertical } from 'lucide-react'

interface InvitesActionsDropdownProps {
  onWhatsApp: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function InvitesActionsDropdown({
  onWhatsApp,
  onEdit,
  onDelete,
}: InvitesActionsDropdownProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="px-3 py-2 rounded-lg bg-gray-600 text-white font-extrabold text-xs hover:bg-gray-700 transition inline-flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md"
        title="القائمة"
      >
        <MoreVertical className="w-4 h-4 flex-shrink-0" />
        <span>القائمة</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
          <button
            type="button"
            onClick={() => {
              onWhatsApp()
              setOpen(false)
            }}
            className="w-full px-4 py-2.5 text-right text-sm font-extrabold text-gray-900 hover:bg-green-50 border-b border-gray-100 inline-flex items-center justify-end gap-2"
          >
            <MessageCircle className="w-4 h-4 text-green-600" />
            <span>واتساب</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onEdit()
              setOpen(false)
            }}
            className="w-full px-4 py-2.5 text-right text-sm font-extrabold text-gray-900 hover:bg-blue-50 border-b border-gray-100 inline-flex items-center justify-end gap-2"
          >
            <Edit2 className="w-4 h-4 text-blue-600" />
            <span>تعديل</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onDelete()
              setOpen(false)
            }}
            className="w-full px-4 py-2.5 text-right text-sm font-extrabold text-gray-900 hover:bg-red-50 inline-flex items-center justify-end gap-2"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
            <span>حذف</span>
          </button>
        </div>
      )}
    </div>
  )
}

