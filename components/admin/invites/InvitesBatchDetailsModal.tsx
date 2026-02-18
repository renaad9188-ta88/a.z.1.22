'use client'

import { useState } from 'react'
import { X, Users, Trash2, RefreshCw, CheckCircle2, Phone, MessageCircle, Edit2, Save, Plus, ArrowRight, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import InvitesActionsDropdown from './InvitesActionsDropdown'
import { normalizeDigits } from './InvitesManagementUtils'
import type { InviteRow } from './InvitesManagementTypes'

interface InvitesBatchDetailsModalProps {
  batchId: string | null
  batchName: string
  batchInvites: InviteRow[]
  loadingBatchInvites: boolean
  onClose: () => void
  onDeleteBatch: (batchId: string) => void
  onLoadBatchInvites: (batchId: string) => Promise<void>
  editingInvite: string | null
  setEditingInvite: (id: string | null) => void
  editForm: { full_name: string; phone: string; country: string }
  setEditForm: (form: { full_name: string; phone: string; country: string }) => void
  onSaveEdit: (inviteId: string) => Promise<void>
  onConfirmSent: (inviteId: string, confirmed: boolean) => Promise<void>
  onRemoveFromBatch: (inviteId: string) => Promise<void>
  onOpenWhatsApp: (invite: InviteRow) => void
  addForm: { full_name: string; phone: string; country: string }
  setAddForm: (form: { full_name: string; phone: string; country: string }) => void
  savingOne: boolean
  onAddToBatch: () => Promise<void>
  supabase: any
  messageTpl: string
  setMessageTpl: (text: string) => void
  batches: any[]
}

export default function InvitesBatchDetailsModal({
  batchId,
  batchName,
  batchInvites,
  loadingBatchInvites,
  onClose,
  onDeleteBatch,
  onLoadBatchInvites,
  editingInvite,
  setEditingInvite,
  editForm,
  setEditForm,
  onSaveEdit,
  onConfirmSent,
  onRemoveFromBatch,
  onOpenWhatsApp,
  addForm,
  setAddForm,
  savingOne,
  onAddToBatch,
  supabase,
  messageTpl,
  setMessageTpl,
  batches,
}: InvitesBatchDetailsModalProps) {
  if (!batchId) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-3 sm:p-4 md:p-6 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-base sm:text-lg md:text-xl font-extrabold text-gray-900 flex items-center gap-1.5 sm:gap-2 truncate flex-1 min-w-0">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
            <span className="truncate">{batchName}</span>
          </h3>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (confirm('هل أنت متأكد من حذف هذه المجموعة؟ سيتم إزالة جميع الأرقام من المجموعة.')) {
                  onDeleteBatch(batchId)
                }
              }}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-red-600 text-white text-xs sm:text-sm font-extrabold hover:bg-red-700 transition inline-flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm hover:shadow-md"
              title="حذف المجموعة"
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>حذف</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition flex-shrink-0"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          {loadingBatchInvites ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 animate-spin" />
              <span className="ml-2 text-sm sm:text-base text-gray-600">جاري التحميل...</span>
            </div>
          ) : batchInvites.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-sm sm:text-base text-gray-500">
              لا توجد أرقام في هذه المجموعة
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3">
                  <div className="text-[10px] sm:text-xs font-extrabold text-blue-800 mb-1">الإجمالي</div>
                  <div className="text-base sm:text-lg md:text-xl font-black text-blue-900 tabular-nums">{batchInvites.length}</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 sm:p-3">
                  <div className="text-[10px] sm:text-xs font-extrabold text-amber-800 mb-1">مرسلة</div>
                  <div className="text-base sm:text-lg md:text-xl font-black text-amber-900 tabular-nums">{batchInvites.filter((r) => r.status === 'sent').length}</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-2 sm:p-3">
                  <div className="text-[10px] sm:text-xs font-extrabold text-green-800 mb-1 flex items-center gap-1">
                    <span>انضم</span>
                    {batchInvites.filter((r) => r.joined_user_id).length > 0 && (
                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                    )}
                  </div>
                  <div className="text-base sm:text-lg md:text-xl font-black text-green-900 tabular-nums">
                    {batchInvites.filter((r) => r.joined_user_id).length}
                  </div>
                </div>
              </div>
              
              {batchInvites.map((r) => (
                <div key={r.id} className="border border-gray-200 rounded-lg p-2.5 sm:p-3 md:p-4 hover:border-purple-300 transition">
                  {editingInvite === r.id ? (
                    <div className="space-y-2 sm:space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          value={editForm.full_name}
                          onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                          className="px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="الاسم"
                        />
                        <input
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          className="px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="رقم الهاتف"
                        />
                        <input
                          value={editForm.country}
                          onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                          className="px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="الدولة"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          type="button"
                          onClick={() => onSaveEdit(r.id)}
                          className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg bg-green-600 text-white text-xs sm:text-sm font-extrabold hover:bg-green-700 transition inline-flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm hover:shadow-md"
                          title="حفظ التعديلات"
                        >
                          <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span>حفظ</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingInvite(null)
                            setEditForm({ full_name: '', phone: '', country: '' })
                          }}
                          className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg bg-gray-200 text-gray-800 text-xs sm:text-sm font-extrabold hover:bg-gray-300 transition inline-flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm hover:shadow-md"
                          title="إلغاء التعديل"
                        >
                          <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span>إلغاء</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 sm:gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1.5 sm:mb-2">
                            <div className="font-extrabold text-sm sm:text-base text-gray-900 truncate">
                              {r.full_name || 'بدون اسم'}{' '}
                              <span className="text-[10px] sm:text-xs text-gray-500 font-bold">({r.country || '—'})</span>
                            </div>
                            <span
                              className={[
                                'text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full border font-extrabold whitespace-nowrap',
                                r.status === 'joined'
                                  ? 'bg-green-50 text-green-800 border-green-200'
                                  : r.status === 'sent'
                                    ? 'bg-amber-50 text-amber-900 border-amber-200'
                                    : r.status === 'queued'
                                      ? 'bg-purple-50 text-purple-800 border-purple-200'
                                      : 'bg-gray-50 text-gray-800 border-gray-200',
                              ].join(' ')}
                            >
                              {r.status}
                            </span>
                            {r.joined_user_id && (
                              <span className="text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full border bg-green-50 text-green-800 border-green-200 font-extrabold whitespace-nowrap flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                تم الانتساب
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] sm:text-xs md:text-sm text-gray-700 flex flex-wrap gap-2 sm:gap-2.5 mb-2 sm:mb-3">
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-lg border border-gray-200">
                              <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500 flex-shrink-0" />
                              <span className="font-semibold text-gray-800 break-all">{r.phone}</span>
                            </span>
                            {r.whatsapp_phone && r.whatsapp_phone !== r.phone && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded-lg border border-green-200">
                                <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-600 flex-shrink-0" />
                                <span className="font-semibold text-green-800 break-all">{r.whatsapp_phone}</span>
                              </span>
                            )}
                            {r.invited_at && (
                              <span className="inline-flex items-center px-2 py-1 bg-blue-50 rounded-lg border border-blue-200 text-gray-600 text-[10px] sm:text-xs">
                                📤 {new Date(r.invited_at).toLocaleDateString('ar-JO', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                            {r.joined_at && (
                              <span className="inline-flex items-center px-2 py-1 bg-green-50 rounded-lg border border-green-200 text-green-700 text-[10px] sm:text-xs font-semibold">
                                ✅ {new Date(r.joined_at).toLocaleDateString('ar-JO', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3 mt-1 sm:mt-2">
                            <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={(r as any).manually_confirmed_sent || false}
                                onChange={(e) => onConfirmSent(r.id, e.target.checked)}
                                className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 flex-shrink-0"
                              />
                              <span className="text-[10px] sm:text-xs font-bold text-gray-700">
                                تم الإرسال {((r as any).manually_confirmed_sent && (r as any).confirmed_sent_role) && (
                                  <span className="text-green-600">
                                    ({((r as any).confirmed_sent_role === 'admin' ? 'أدمن' : 'مشرف')})
                                  </span>
                                )}
                              </span>
                            </label>
                          </div>
                        </div>
                        {/* الأزرار - على الشاشات الكبيرة: جميع الأزرار، على الهواتف: قائمة منبثقة */}
                        <div className="hidden sm:flex flex-wrap gap-1.5 sm:gap-2 flex-shrink-0 justify-end sm:justify-start">
                          <button
                            type="button"
                            onClick={() => onOpenWhatsApp(r)}
                            className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-green-600 text-white text-[10px] sm:text-xs md:text-sm font-extrabold hover:bg-green-700 transition inline-flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm hover:shadow-md"
                            title="واتساب"
                          >
                            <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                            <span className="whitespace-nowrap">واتساب</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingInvite(r.id)
                              setEditForm({
                                full_name: r.full_name || '',
                                phone: r.phone,
                                country: r.country || '',
                              })
                            }}
                            className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-blue-600 text-white text-[10px] sm:text-xs md:text-sm font-extrabold hover:bg-blue-700 transition inline-flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm hover:shadow-md"
                            title="تعديل"
                          >
                            <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                            <span className="whitespace-nowrap">تعديل</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveFromBatch(r.id)}
                            className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-red-600 text-white text-[10px] sm:text-xs md:text-sm font-extrabold hover:bg-red-700 transition inline-flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm hover:shadow-md"
                            title="حذف من المجموعة"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                            <span className="whitespace-nowrap">حذف</span>
                          </button>
                        </div>
                        
                        {/* قائمة منبثقة للهواتف */}
                        <div className="sm:hidden relative">
                          <InvitesActionsDropdown
                            onWhatsApp={() => onOpenWhatsApp(r)}
                            onEdit={() => {
                              setEditingInvite(r.id)
                              setEditForm({
                                full_name: r.full_name || '',
                                phone: r.phone,
                                country: r.country || '',
                              })
                            }}
                            onDelete={() => onRemoveFromBatch(r.id)}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {/* إضافة رقم جديد للمجموعة */}
              <div className="border-2 border-dashed border-purple-300 rounded-xl p-3 sm:p-4 md:p-5 bg-gradient-to-br from-purple-50 to-blue-50">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 bg-purple-600 rounded-lg flex items-center justify-center">
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div>
                    <h5 className="text-sm sm:text-base md:text-lg font-extrabold text-gray-900">
                      إضافة رقم جديد للمجموعة
                    </h5>
                    <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                      أدخل بيانات الرقم لإضافته مباشرة
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                    <input
                      value={addForm.full_name}
                      onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
                      className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                      placeholder="👤 الاسم (اختياري)"
                    />
                    <input
                      value={addForm.phone}
                      onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                      className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                      placeholder="📱 رقم الهاتف *"
                      required
                    />
                    <input
                      value={addForm.country}
                      onChange={(e) => setAddForm({ ...addForm, country: e.target.value })}
                      className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                      placeholder="🌍 الدولة"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={onAddToBatch}
                    disabled={savingOne}
                    className="w-full sm:w-auto sm:min-w-[140px] px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white font-extrabold text-sm sm:text-base hover:from-purple-700 hover:to-purple-800 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                  >
                    {savingOne ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جاري الإضافة...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>إضافة للمجموعة</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* نص الرسالة المرسلة للمجموعة */}
              {(() => {
                const currentBatch = batches.find((b: any) => b.id === batchId)
                return currentBatch?.last_message_sent ? (
                  <div className="border-2 border-dashed border-green-300 rounded-xl p-3 sm:p-4 md:p-5 bg-gradient-to-br from-green-50 to-emerald-50">
                    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <div className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 bg-green-600 rounded-lg flex items-center justify-center">
                        <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="text-sm sm:text-base md:text-lg font-extrabold text-gray-900">
                          نص الرسالة المرسلة لهذه المجموعة
                        </h5>
                        <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                          آخر رسالة تم إرسالها لهذه المجموعة
                        </p>
                      </div>
                    </div>
                    <div className="bg-white border border-green-200 rounded-lg p-3 sm:p-4 mb-3">
                      <pre className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap font-medium leading-relaxed max-h-[200px] sm:max-h-[250px] overflow-y-auto">
                        {currentBatch.last_message_sent}
                      </pre>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(currentBatch.last_message_sent)
                          toast.success('تم نسخ نص الرسالة')
                        }}
                        className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-green-600 text-white font-extrabold text-sm hover:bg-green-700 transition inline-flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm hover:shadow-md"
                        title="نسخ نص الرسالة"
                      >
                        <FileText className="w-4 h-4 flex-shrink-0" />
                        <span>نسخ نص الرسالة</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMessageTpl(currentBatch.last_message_sent)
                          toast.success('تم تحميل نص الرسالة للتعديل')
                        }}
                        className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-blue-600 text-white font-extrabold text-sm hover:bg-blue-700 transition inline-flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm hover:shadow-md"
                        title="تحميل هذا النص للتعديل"
                      >
                        <Edit2 className="w-4 h-4 flex-shrink-0" />
                        <span>تحميل للتعديل</span>
                      </button>
                    </div>
                  </div>
                ) : null
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

