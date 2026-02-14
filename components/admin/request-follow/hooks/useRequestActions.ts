import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { notifyRequestApproved, notifyRequestRejected, notifyPaymentVerified, notifyCustomMessage } from '@/lib/notifications'
import type { ReqRow } from '../types'

const supabase = createSupabaseBrowserClient()

export function useRequestActions(request: ReqRow | null, onReload: () => void) {
  const [saving, setSaving] = useState(false)
  const [newResponse, setNewResponse] = useState('')

  const approve = async () => {
    if (!request) return
    try {
      setSaving(true)
      const stamp = new Date().toISOString()
      const autoMsg = '✅ تمت الموافقة على الطلب. تم فتح الحجز ويمكنك المتابعة من صفحة متابعة الطلب.'
      const section = `\n\n=== رد الإدارة ===\n${autoMsg}\nتاريخ الرد: ${stamp}`
      const nextNotes = ((request.admin_notes || '') as string) + section
      const { error } = await supabase
        .from('visit_requests')
        .update({ 
          status: 'approved', 
          payment_verified: true, // فتح الحجز مباشرة عند الموافقة
          admin_notes: nextNotes,
          updated_at: stamp 
        } as any)
        .eq('id', request.id)
      if (error) throw error
      
      // ✅ Logging: تسجيل تغيير حالة الطلب
      try {
        const { logRequestStatusChanged } = await import('@/lib/audit')
        await logRequestStatusChanged(request.id, request.status, 'approved', request.visitor_name)
      } catch (logErr) {
        console.error('Error logging status change:', logErr)
      }
      
      // إرسال الإشعار بشكل منفصل مع معالجة الأخطاء
      try {
        await notifyRequestApproved(request.user_id, request.id, request.visitor_name, supabase)
      } catch (notifyError) {
        console.error('Error sending notification:', notifyError)
      }
      
      toast.success('تم قبول الطلب')
      await onReload()
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
      const stamp = new Date().toISOString()
      const autoMsg = reason?.trim()
        ? `✗ تم رفض الطلب.\nسبب الرفض: ${reason.trim()}`
        : '✗ تم رفض الطلب.'
      const section = `\n\n=== رد الإدارة ===\n${autoMsg}\nتاريخ الرد: ${stamp}`
      const nextNotes = ((request.admin_notes || '') as string) + section
      const { error } = await supabase
        .from('visit_requests')
        .update({ 
          status: 'rejected', 
          rejection_reason: reason || null, 
          admin_notes: nextNotes,
          updated_at: stamp 
        } as any)
        .eq('id', request.id)
      if (error) throw error
      
      // ✅ Logging: تسجيل تغيير حالة الطلب
      try {
        const { logRequestStatusChanged } = await import('@/lib/audit')
        await logRequestStatusChanged(request.id, request.status, 'rejected', request.visitor_name)
      } catch (logErr) {
        console.error('Error logging status change:', logErr)
      }
      
      await notifyRequestRejected(request.user_id, request.id, request.visitor_name, reason || undefined)
      toast.success('تم رفض الطلب')
      await onReload()
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
      await onReload()
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
      await onReload()
    } catch (e: any) {
      console.error('saveResponse error:', e)
      toast.error(e?.message || 'تعذر إرسال الرد')
    } finally {
      setSaving(false)
    }
  }

  const appendAdminResponseAndNotify = async (
    msg: string,
    alsoMarkReceived?: boolean,
    alsoMarkDepositPaid?: boolean
  ) => {
    if (!request) return
    const clean = (msg || '').trim()
    if (!clean) return toast.error('لا يوجد نص لإرساله')
    
    // إذا كان alsoMarkReceived = true و status !== 'pending'، يعني تم استلامه مسبقاً
    if (alsoMarkReceived && request.status !== 'pending') {
      toast.error('تم استلام الطلب مسبقاً. لا يمكن إرسال إشعار الاستلام مرة أخرى.')
      return
    }
    
    try {
      setSaving(true)
      const stamp = new Date().toISOString()
      const section = `\n\n=== رد الإدارة ===\n${clean}\nتاريخ الرد: ${stamp}`
      const nextNotes = ((request.admin_notes || '') as string) + section
      const update: any = { admin_notes: nextNotes, updated_at: new Date().toISOString() }
      if (alsoMarkReceived && request.status === 'pending') {
        update.status = 'under_review'
        // نحدد deposit_paid فقط عند تأكيد استلام الرسوم (وليس عند استلام الطلب بدون دفع)
        if (alsoMarkDepositPaid && !request.deposit_paid) {
          update.deposit_paid = true
          // حساب المبلغ بناءً على عدد الأشخاص (إذا كان موجوداً في companions_data)
          const companionsCount = request.companions_count || 0
          const totalPeople = companionsCount + 1 // الزائر الرئيسي + المرافقين
          update.deposit_amount = totalPeople * 10
          update.total_amount = totalPeople * 10
        }
      }
      const { error } = await supabase.from('visit_requests').update(update).eq('id', request.id)
      if (error) throw error
      await notifyCustomMessage(request.user_id, request.id, clean)
      toast.success('تم إرسال الرسالة للمستخدم')
      await onReload()
    } catch (e: any) {
      console.error('appendAdminResponseAndNotify error:', e)
      toast.error(e?.message || 'تعذر إرسال الرسالة')
    } finally {
      setSaving(false)
    }
  }

  return {
    saving,
    newResponse,
    setNewResponse,
    approve,
    reject,
    setPaymentVerified,
    saveResponse,
    appendAdminResponseAndNotify,
  }
}

