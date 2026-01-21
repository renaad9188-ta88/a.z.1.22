'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ArrowRight, CheckCircle, Clock, Save, MessageCircle, Phone } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import TripSchedulingModal from '@/components/admin/TripSchedulingModal'
import { formatDate } from '@/lib/date-utils'
import { parseAdminNotes } from '@/components/request-details/utils'
import { notifyRequestApproved, notifyRequestRejected, notifyPaymentVerified, notifyCustomMessage } from '@/lib/notifications'

type Role = 'admin' | 'supervisor'
type ContactProfile = { full_name: string | null; phone: string | null; jordan_phone?: string | null; whatsapp_phone?: string | null }

type ReqRow = {
  id: string
  user_id: string
  visitor_name: string
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'completed'
  admin_notes: string | null
  rejection_reason: string | null
  payment_verified: boolean | null
  remaining_amount: number | null
  arrival_date: string | null
  trip_status: string | null
  assigned_to: string | null
  created_at: string
  updated_at: string
}

const POST_APPROVAL_SUBMITTED_MARK = 'حالة الاستكمال: مرسل'

function extractLatestAdminResponse(notes: string): { body: string; dateText?: string } | null {
  const marker = '=== رد الإدارة ==='
  const idx = notes.lastIndexOf(marker)
  if (idx === -1) return null
  const after = notes.slice(idx + marker.length).trim()
  if (!after) return null
  const dateIdx = after.lastIndexOf('تاريخ الرد:')
  if (dateIdx !== -1) {
    const body = after.slice(0, dateIdx).trim()
    const dateText = after.slice(dateIdx).replace('تاريخ الرد:', '').trim()
    return body ? { body, dateText } : null
  }
  return { body: after }
}

function extractAllAdminResponses(notes: string): Array<{ body: string; dateText?: string }> {
  const marker = '=== رد الإدارة ==='
  if (!notes.includes(marker)) return []
  const parts = notes.split(marker).slice(1) // content after each marker
  const res: Array<{ body: string; dateText?: string }> = []
  for (const p of parts) {
    const chunk = (p || '').trim()
    if (!chunk) continue
    const dateIdx = chunk.lastIndexOf('تاريخ الرد:')
    if (dateIdx !== -1) {
      const body = chunk.slice(0, dateIdx).trim()
      const dateText = chunk.slice(dateIdx).replace('تاريخ الرد:', '').trim()
      if (body) res.push({ body, dateText })
      continue
    }
    res.push({ body: chunk })
  }
  // newest first (because we append to notes)
  return res.reverse()
}

export default function AdminRequestFollow({
  requestId,
  adminUserId,
  role,
}: {
  requestId: string
  adminUserId: string
  role: Role
}) {
  const supabase = createSupabaseBrowserClient()
  const [request, setRequest] = useState<ReqRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeStep, setActiveStep] = useState(1)
  const [showSchedule, setShowSchedule] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newResponse, setNewResponse] = useState('')
  const [userProfile, setUserProfile] = useState<ContactProfile | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('visit_requests')
        .select(
          'id,user_id,visitor_name,status,admin_notes,rejection_reason,payment_verified,remaining_amount,arrival_date,trip_status,assigned_to,created_at,updated_at'
        )
        .eq('id', requestId)
        .single()
      if (error) throw error

      const row = data as any as ReqRow
      if (role === 'supervisor' && row.assigned_to && row.assigned_to !== adminUserId) {
        toast.error('هذا الطلب غير مخصص لك')
        setRequest(null)
        return
      }

      setRequest(row)

      // Load contact profile for WhatsApp/phone buttons
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('full_name,phone,jordan_phone,whatsapp_phone')
          .eq('user_id', row.user_id)
          .maybeSingle()
        setUserProfile((prof as any) || null)
      } catch {
        setUserProfile(null)
      }
    } catch (e: any) {
      console.error('Admin follow load error:', e)
      toast.error(e?.message || 'تعذر تحميل الطلب')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const onFocus = () => load()
    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId])

  const adminInfo = useMemo(() => parseAdminNotes((request?.admin_notes || '') as string) || {}, [request])
  const latestResponse = useMemo(() => extractLatestAdminResponse((request?.admin_notes || '') as string), [request])
  const responseHistory = useMemo(() => extractAllAdminResponses((request?.admin_notes || '') as string), [request])

  const steps = useMemo(() => {
    const notes = (request?.admin_notes || '') as string
    const postApprovalSubmitted = notes.includes(POST_APPROVAL_SUBMITTED_MARK) || (adminInfo?.postApprovalStatus || '') === 'مرسل'
    const paymentVerified = Boolean(request?.payment_verified)
    const hasArrival = Boolean(request?.arrival_date)
    const isApproved = request?.status === 'approved' || request?.status === 'completed'
    const isReceived = Boolean(request) && request?.status !== 'pending'

    return [
      { id: 1, title: 'استلام الطلب', done: isReceived, help: 'اضغط "تم استلام الطلب" لإرسال رد تلقائي للمستخدم وتسجيل الاستلام.' },
      { id: 2, title: 'مراجعة + قبول/رفض', done: Boolean(isApproved) || request?.status === 'rejected', help: 'قم بقبول الطلب أو رفضه.' },
      { id: 3, title: 'استلام استكمال المستخدم', done: postApprovalSubmitted, help: 'بانتظار إرسال المستخدم لاستكمال ما بعد الموافقة.' },
      { id: 4, title: 'تأكيد الدفع (فتح الحجز)', done: paymentVerified, help: 'بعد التأكيد يظهر للمستخدم الحجز.' },
      { id: 5, title: 'حجز الموعد/المتابعة', done: hasArrival, help: 'حدد موعد القدوم أو راجع الموعد الحالي.' },
    ]
  }, [request, adminInfo])

  useEffect(() => {
    const firstIncomplete = steps.find((s) => !s.done)?.id || 5
    setActiveStep(firstIncomplete)
  }, [steps])

  const current = steps.find((s) => s.id === activeStep)
  const canGoNext = activeStep < 5 && Boolean(current?.done)
  const canGoPrev = activeStep > 1

  const approve = async () => {
    if (!request) return
    try {
      setSaving(true)
      const { error } = await supabase
        .from('visit_requests')
        .update({ status: 'approved', updated_at: new Date().toISOString() } as any)
        .eq('id', request.id)
      if (error) throw error
      await notifyRequestApproved(request.user_id, request.id, request.visitor_name)
      toast.success('تم قبول الطلب')
      await load()
    } catch (e: any) {
      console.error('approve error:', e)
      toast.error(e?.message || 'تعذر قبول الطلب')
    } finally {
      setSaving(false)
    }
  }

  const reject = async () => {
    if (!request) return
    const reason = prompt('أدخل سبب الرفض (اختياري):') || ''
    try {
      setSaving(true)
      const { error } = await supabase
        .from('visit_requests')
        .update({ status: 'rejected', rejection_reason: reason || null, updated_at: new Date().toISOString() } as any)
        .eq('id', request.id)
      if (error) throw error
      await notifyRequestRejected(request.user_id, request.id, request.visitor_name, reason || undefined)
      toast.success('تم رفض الطلب')
      await load()
    } catch (e: any) {
      console.error('reject error:', e)
      toast.error(e?.message || 'تعذر رفض الطلب')
    } finally {
      setSaving(false)
    }
  }

  const setPaymentVerified = async (val: boolean) => {
    if (!request) return
    try {
      setSaving(true)
      const { error } = await supabase
        .from('visit_requests')
        .update({ payment_verified: val, updated_at: new Date().toISOString() } as any)
        .eq('id', request.id)
      if (error) throw error
      if (val) await notifyPaymentVerified(request.user_id, request.id)
      toast.success(val ? 'تم تأكيد الدفع' : 'تم إلغاء تأكيد الدفع')
      await load()
    } catch (e: any) {
      console.error('payment verify error:', e)
      toast.error(e?.message || 'تعذر تحديث حالة الدفع')
    } finally {
      setSaving(false)
    }
  }

  const saveResponse = async () => {
    if (!request) return
    const msg = newResponse.trim()
    if (!msg) return toast.error('اكتب رد الإدارة أولاً')
    try {
      setSaving(true)
      const stamp = new Date().toISOString()
      const section = `\n\n=== رد الإدارة ===\n${msg}\nتاريخ الرد: ${stamp}`
      const updatedNotes = ((request.admin_notes || '') as string) + section
      const { error } = await supabase
        .from('visit_requests')
        .update({ admin_notes: updatedNotes, updated_at: new Date().toISOString() } as any)
        .eq('id', request.id)
      if (error) throw error
      await notifyCustomMessage(request.user_id, request.id, msg)
      toast.success('تم إرسال الرد للمستخدم')
      setNewResponse('')
      await load()
    } catch (e: any) {
      console.error('saveResponse error:', e)
      toast.error(e?.message || 'تعذر إرسال الرد')
    } finally {
      setSaving(false)
    }
  }

  const appendAdminResponseAndNotify = async (msg: string, alsoMarkReceived?: boolean) => {
    if (!request) return
    const clean = (msg || '').trim()
    if (!clean) return toast.error('لا يوجد نص لإرساله')
    try {
      setSaving(true)
      const stamp = new Date().toISOString()
      const section = `\n\n=== رد الإدارة ===\n${clean}\nتاريخ الرد: ${stamp}`
      const nextNotes = ((request.admin_notes || '') as string) + section
      const update: any = { admin_notes: nextNotes, updated_at: new Date().toISOString() }
      if (alsoMarkReceived && request.status === 'pending') {
        update.status = 'under_review'
      }
      const { error } = await supabase.from('visit_requests').update(update).eq('id', request.id)
      if (error) throw error
      await notifyCustomMessage(request.user_id, request.id, clean)
      toast.success('تم إرسال الرسالة للمستخدم')
      await load()
    } catch (e: any) {
      console.error('appendAdminResponseAndNotify error:', e)
      toast.error(e?.message || 'تعذر إرسال الرسالة')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-container">
          <div className="card">
            <div className="p-6 text-center text-gray-600">جاري التحميل...</div>
          </div>
        </div>
      </div>
    )
  }

  if (!request) return null

  const remaining = request.remaining_amount ?? 20
  const contactRaw = String(userProfile?.whatsapp_phone || adminInfo?.syrianPhone || userProfile?.phone || adminInfo?.jordanPhone || '')
  const waDigits = contactRaw.replace(/[^\d]/g, '')
  const callDigits = String(userProfile?.phone || adminInfo?.syrianPhone || adminInfo?.jordanPhone || '').replace(/[^\d+]/g, '')

  return (
    <div className="page">
      <div className="page-container">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 sm:gap-2 text-blue-600 hover:text-blue-700 mb-4 sm:mb-6 text-sm sm:text-base"
        >
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>العودة للوحة الإدارة</span>
        </Link>

        <div className="card">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold text-gray-900">متابعة الطلب (إدمن)</h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              الطلب: <span className="font-bold text-gray-800">{request.visitor_name}</span> • الكود:{' '}
              <span className="font-mono font-bold">{request.id.slice(0, 8).toUpperCase()}</span>
            </p>

            {/* Stepper (scrollable on mobile to avoid broken text) */}
            <div className="mt-4">
              <div className="flex items-start gap-3 overflow-x-auto pb-2 -mx-1 px-1 sm:overflow-visible sm:pb-0 sm:mx-0 sm:px-0">
                {steps.map((s, idx) => {
                  const isActive = s.id === activeStep
                  const isDone = s.done
                  const isClickable = s.id <= activeStep
                  return (
                    <div key={s.id} className="flex-1 min-w-[92px] sm:min-w-0 flex-shrink-0 sm:flex-shrink">
                      <button
                        type="button"
                        onClick={() => isClickable && setActiveStep(s.id)}
                        className={`w-full flex flex-col items-center gap-1 ${
                          isClickable ? 'cursor-pointer' : 'cursor-default'
                        }`}
                        disabled={!isClickable}
                      >
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center border-2 ${
                            isDone
                              ? 'bg-green-600 border-green-600 text-white'
                              : isActive
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-white border-gray-300 text-gray-500'
                          }`}
                        >
                          {isDone ? <CheckCircle className="w-5 h-5" /> : <span className="font-bold">{s.id}</span>}
                        </div>
                        <div
                          className={`text-[11px] sm:text-xs font-bold text-center leading-snug ${
                            isActive ? 'text-blue-700' : 'text-gray-700'
                          }`}
                        >
                          {s.title}
                        </div>
                      </button>
                      {idx < steps.length - 1 && (
                        <div className="hidden sm:block h-0.5 bg-gray-200 -mt-5 mx-6"></div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm sm:text-base font-extrabold text-gray-900">
                    المرحلة {activeStep}: {current?.title}
                  </p>
                  <p className="mt-1 text-xs sm:text-sm text-gray-600 leading-relaxed">{current?.help}</p>
                </div>
                <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold border ${
                  current?.done ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  {current?.done ? 'مكتملة' : 'قيد الانتظار'}
                </span>
              </div>

              {/* Actions */}
              <div className="mt-4 space-y-2">
                {activeStep === 1 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-extrabold text-gray-900 text-sm">خيارات سريعة</p>
                        <p className="text-xs text-gray-600">اضغط لإرسال رد جاهز للمستخدم وتسجيله في ملاحظات الطلب.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {waDigits && (
                          <a
                            href={`https://wa.me/${waDigits}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-xs font-semibold inline-flex items-center gap-2"
                            title="واتساب"
                          >
                            <MessageCircle className="w-4 h-4" />
                            واتساب
                          </a>
                        )}
                        {callDigits && (
                          <a
                            href={`tel:${callDigits}`}
                            className="px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-black transition text-xs font-semibold inline-flex items-center gap-2"
                            title="اتصال"
                          >
                            <Phone className="w-4 h-4" />
                            اتصال
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={() => appendAdminResponseAndNotify('تم استلام طلبك وسيتم التواصل معك قريباً.', true)}
                        disabled={saving}
                        className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold disabled:opacity-50"
                      >
                        تم استلام الطلب
                      </button>
                      <button
                        type="button"
                        onClick={() => appendAdminResponseAndNotify('يرجى تزويدنا بصورة جواز أوضح/صالحة لإكمال الطلب.')}
                        disabled={saving}
                        className="px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition text-sm font-semibold disabled:opacity-50"
                      >
                        طلب صورة أوضح للجواز
                      </button>
                      <button
                        type="button"
                        onClick={() => appendAdminResponseAndNotify('يرجى مراجعة بيانات الطلب وإكمال النواقص ثم إعادة الإرسال.')}
                        disabled={saving}
                        className="px-4 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-black transition text-sm font-semibold disabled:opacity-50"
                      >
                        طلب إكمال النواقص
                      </button>
                    </div>
                  </div>
                )}
                {activeStep === 2 && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={approve}
                      disabled={saving || request.status === 'approved'}
                      className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold disabled:opacity-50"
                    >
                      قبول الطلب
                    </button>
                    <button
                      type="button"
                      onClick={reject}
                      disabled={saving || request.status === 'rejected'}
                      className="px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-semibold disabled:opacity-50"
                    >
                      رفض الطلب
                    </button>
                  </div>
                )}

                {activeStep === 3 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <p className="font-extrabold text-gray-900 text-sm mb-2">استكمال المستخدم</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-gray-700">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-500">الحالة</span>
                        <span className="font-bold">
                          {(adminInfo?.postApprovalStatus || '') === 'مرسل' || (request.admin_notes || '').includes(POST_APPROVAL_SUBMITTED_MARK)
                            ? 'مرسل'
                            : (adminInfo?.postApprovalStatus || '') === 'محفوظ'
                            ? 'محفوظ'
                            : 'غير مرسل'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-500">الكفالة</span>
                        <span className="font-bold truncate">{adminInfo?.guaranteeMethod || 'غير محدد'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-500">طريقة دفع المتبقي</span>
                        <span className="font-bold truncate">{adminInfo?.remainingPaymentMethod || 'غير محدد'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-500">المتبقي</span>
                        <span className="font-bold">{`${remaining} دينار`}</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeStep === 4 && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentVerified(true)}
                      disabled={saving || Boolean(request.payment_verified)}
                      className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold disabled:opacity-50"
                    >
                      تأكيد الدفع (فتح الحجز)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentVerified(false)}
                      disabled={saving || !Boolean(request.payment_verified)}
                      className="px-4 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition text-sm font-semibold disabled:opacity-50"
                    >
                      إلغاء تأكيد الدفع
                    </button>
                  </div>
                )}

                {activeStep === 5 && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSchedule(true)}
                      disabled={saving || request.status !== 'approved'}
                      className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-semibold disabled:opacity-50"
                    >
                      {request.arrival_date ? 'تعديل موعد القدوم' : 'تحديد موعد القدوم'}
                    </button>
                    <button
                      type="button"
                      onClick={() => appendAdminResponseAndNotify('تم تأكيد الحجز ✅', false)}
                      disabled={saving}
                      className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold disabled:opacity-50"
                      title="يرسل للمستخدم رسالة تأكيد الحجز"
                    >
                      تأكيد الحجز
                    </button>
                    {request.arrival_date && (
                      <div className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700">
                        الموعد: <span className="font-bold">{formatDate(request.arrival_date)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => canGoPrev && setActiveStep((s) => Math.max(1, s - 1))}
                disabled={!canGoPrev}
                className="px-4 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition text-sm font-semibold disabled:opacity-50"
              >
                السابق
              </button>
              <button
                type="button"
                onClick={() => canGoNext && setActiveStep((s) => Math.min(5, s + 1))}
                disabled={!canGoNext}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold disabled:opacity-50"
              >
                التالي
              </button>
            </div>

            {/* Admin responses */}
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
                onChange={(e) => setNewResponse(e.target.value)}
                rows={4}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="اكتب رد الإدارة هنا..."
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={saveResponse}
                  disabled={saving}
                  className="px-4 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  إرسال الرد
                </button>
                <button
                  type="button"
                  onClick={() => setNewResponse('')}
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

            <div className="text-[11px] text-gray-500">
              آخر تحديث: {formatDate(request.updated_at)} • تاريخ الإنشاء: {formatDate(request.created_at)}
            </div>
          </div>
        </div>
      </div>

      {showSchedule && (
        <TripSchedulingModal
          request={request as any}
          onClose={() => setShowSchedule(false)}
          onUpdate={load}
          isAdmin={true}
        />
      )}
    </div>
  )
}


