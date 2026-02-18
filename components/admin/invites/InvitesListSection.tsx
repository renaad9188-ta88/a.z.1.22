'use client'

import { Search, Phone, MessageCircle, CheckCircle2, ArrowRight, X } from 'lucide-react'
import type { InviteRow } from './InvitesManagementTypes'

interface InvitesListSectionProps {
  filtered: InviteRow[]
  loading: boolean
  q: string
  setQ: (query: string) => void
  statusFilter: 'all' | InviteRow['status']
  setStatusFilter: (filter: 'all' | InviteRow['status']) => void
  selectedInvites: Set<string>
  setSelectedInvites: (invites: Set<string>) => void
  batches: any[]
  movingInvite: string | null
  setMovingInvite: (id: string | null) => void
  onMoveToBatch: (inviteId: string, targetBatchId: string | null) => Promise<void>
  onOpenWhatsApp: (invite: InviteRow) => void
}

export default function InvitesListSection({
  filtered,
  loading,
  q,
  setQ,
  statusFilter,
  setStatusFilter,
  selectedInvites,
  setSelectedInvites,
  batches,
  movingInvite,
  setMovingInvite,
  onMoveToBatch,
  onOpenWhatsApp,
}: InvitesListSectionProps) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="بحث بالاسم/الهاتف/الحالة..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full sm:w-56 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">كل الحالات</option>
            <option value="new">جديد</option>
            <option value="queued">قائمة اليوم</option>
            <option value="sent">مرسلة</option>
            <option value="joined">انضم</option>
            <option value="failed">فشل</option>
            <option value="opted_out">مرفوض</option>
          </select>
        </div>
        <div className="text-xs text-gray-600">
          {loading ? 'جاري التحميل...' : `النتائج: ${filtered.length}`}
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {filtered.slice(0, 300).map((r) => (
          <div key={r.id} className={`border-2 rounded-xl p-3 sm:p-4 transition-all ${selectedInvites.has(r.id) ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-blue-50 shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}>
            <div className="flex flex-col lg:flex-row justify-between gap-3">
              <div className="min-w-0 flex-1 flex items-start gap-2 sm:gap-3">
                <label className="flex items-center cursor-pointer mt-0.5 sm:mt-1 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={selectedInvites.has(r.id)}
                    onChange={(e) => {
                      const newSet = new Set(selectedInvites)
                      if (e.target.checked) {
                        newSet.add(r.id)
                      } else {
                        newSet.delete(r.id)
                      }
                      setSelectedInvites(newSet)
                    }}
                    className="w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6 text-purple-600 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 cursor-pointer transition"
                  />
                  <span className="sr-only">تحديد {r.full_name || r.phone}</span>
                </label>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-extrabold text-sm sm:text-base text-gray-900 truncate">
                      {r.full_name || 'بدون اسم'}{' '}
                      <span className="text-xs sm:text-sm text-gray-500 font-bold">({r.country || '—'})</span>
                    </div>
                    <span
                      className={[
                        'text-[11px] px-2 py-0.5 rounded-full border font-extrabold',
                        r.status === 'joined'
                          ? 'bg-green-50 text-green-800 border-green-200'
                          : r.status === 'sent'
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : r.status === 'queued'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : r.status === 'opted_out'
                                ? 'bg-red-50 text-red-800 border-red-200'
                                : 'bg-gray-50 text-gray-800 border-gray-200',
                      ].join(' ')}
                    >
                      {r.status}
                    </span>
                    {r.joined_user_id && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full border bg-green-50 text-green-800 border-green-200 font-extrabold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        تم الانتساب للموقع
                      </span>
                    )}
                  </div>
                  <div className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-700 flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-1.5 sm:gap-y-2">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-lg border border-gray-200">
                      <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                      <span className="font-semibold text-gray-800 break-all">{r.phone}</span>
                    </span>
                    {r.whatsapp_phone && r.whatsapp_phone !== r.phone && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded-lg border border-green-200">
                        <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" />
                        <span className="font-semibold text-green-800 break-all">{r.whatsapp_phone}</span>
                      </span>
                    )}
                    {r.invited_at && (
                      <span className="inline-flex items-center px-2 py-1 bg-blue-50 rounded-lg border border-blue-200 text-gray-600 text-[10px] sm:text-xs">
                        📤 آخر إرسال: {new Date(r.invited_at).toLocaleDateString('ar-JO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    {r.joined_at && (
                      <span className="inline-flex items-center px-2 py-1 bg-green-50 rounded-lg border border-green-200 text-green-700 text-[10px] sm:text-xs font-semibold">
                        ✅ انضم: {new Date(r.joined_at).toLocaleDateString('ar-JO', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    {r.batch_id && (
                      <span className="inline-flex items-center px-2 py-1 bg-purple-50 rounded-lg border border-purple-200 text-purple-700 text-[10px] sm:text-xs font-bold">
                        📋 {batches.find((b: any) => b.id === r.batch_id)?.name || r.batch_id}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
                <button
                  type="button"
                  onClick={() => onOpenWhatsApp(r)}
                  className="flex-1 sm:flex-none px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 rounded-lg bg-green-600 text-white text-[10px] sm:text-xs md:text-sm font-extrabold hover:bg-green-700 transition inline-flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2 shadow-sm hover:shadow-md"
                  title="فتح واتساب برسالة دعوة جاهزة"
                >
                  <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-4 md:h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">واتساب</span>
                </button>
                {batches.length > 0 && (
                  <div className="relative flex-1 sm:flex-none min-w-[120px]">
                    {movingInvite === r.id ? (
                      <div className="flex gap-1.5 sm:gap-2">
                        <select
                          onChange={(e) => {
                            const targetBatchId = e.target.value || null
                            if (targetBatchId === 'CANCEL') {
                              setMovingInvite(null)
                            } else {
                              onMoveToBatch(r.id, targetBatchId)
                            }
                          }}
                          className="flex-1 px-2.5 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm border-2 border-purple-400 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-semibold shadow-sm"
                          autoFocus
                        >
                          <option value="CANCEL">❌ إلغاء</option>
                          <option value="">🗑️ إزالة من المجموعة</option>
                          {batches.map((batch: any) => (
                            <option key={batch.id} value={batch.id} disabled={batch.id === r.batch_id}>
                              {batch.id === r.batch_id ? `✓ ${batch.name} (الحالية)` : `→ ${batch.name} (${batch.total_count || 0} رقم)`}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setMovingInvite(null)}
                          className="px-2 sm:px-2.5 py-2 sm:py-2.5 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition text-xs sm:text-sm font-extrabold flex-shrink-0"
                          title="إلغاء"
                        >
                          <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setMovingInvite(r.id)}
                        className="w-full sm:w-auto px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 rounded-lg bg-purple-600 text-white text-[10px] sm:text-xs md:text-sm font-extrabold hover:bg-purple-700 transition inline-flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2 shadow-sm hover:shadow-md"
                        title="نقل إلى مجموعة أخرى"
                      >
                        <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-4 md:h-4 flex-shrink-0" />
                        <span className="whitespace-nowrap">نقل</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && !loading && (
          <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4">
            لا يوجد بيانات لعرضها.
          </div>
        )}

        {filtered.length > 300 && (
          <div className="text-xs text-gray-500">
            تم عرض أول 300 نتيجة فقط (لتحسين الأداء). استخدم البحث/التصفية.
          </div>
        )}
      </div>
    </div>
  )
}

