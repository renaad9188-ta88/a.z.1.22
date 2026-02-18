'use client'

import { X, Users, UserPlus } from 'lucide-react'
import type { InviteRow } from './InvitesManagementTypes'

interface InvitesAddToBatchSectionProps {
  selectedInvites: Set<string>
  setSelectedInvites: (invites: Set<string>) => void
  rows: InviteRow[]
  batches: any[]
  onAddToBatch: (batchId: string) => void
}

export default function InvitesAddToBatchSection({
  selectedInvites,
  setSelectedInvites,
  rows,
  batches,
  onAddToBatch,
}: InvitesAddToBatchSectionProps) {
  if (selectedInvites.size === 0 || batches.length === 0) return null

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl shadow-lg border-2 border-purple-300 p-3 sm:p-4 md:p-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-purple-600 rounded-lg flex items-center justify-center">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm sm:text-base md:text-lg font-extrabold text-gray-900">
              إضافة {selectedInvites.size} رقم لمجموعة
            </h4>
            <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
              اختر المجموعة لإضافة الأرقام المحددة
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSelectedInvites(new Set())}
          className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-white border border-gray-300 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition"
          title="إلغاء التحديد"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <select
          onChange={(e) => {
            if (e.target.value) {
              onAddToBatch(e.target.value)
            }
          }}
          className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-purple-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-semibold"
          defaultValue=""
        >
          <option value="">📋 اختر المجموعة...</option>
          {batches.map((batch: any) => (
            <option key={batch.id} value={batch.id}>
              {batch.name} ({batch.total_count || 0} رقم)
            </option>
          ))}
        </select>
      </div>
      {selectedInvites.size <= 5 && (
        <div className="mt-3 pt-3 border-t border-purple-200">
          <p className="text-xs sm:text-sm text-gray-600 mb-2 font-semibold">الأرقام المحددة:</p>
          <div className="flex flex-wrap gap-2">
            {Array.from(selectedInvites).slice(0, 5).map((id) => {
              const invite = rows.find((r) => r.id === id)
              return invite ? (
                <span
                  key={id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-xs sm:text-sm font-semibold text-gray-700"
                >
                  <UserPlus className="w-3 h-3 text-purple-600" />
                  {invite.full_name || 'بدون اسم'} ({invite.phone.slice(-4)})
                </span>
              ) : null
            })}
          </div>
        </div>
      )}
    </div>
  )
}

