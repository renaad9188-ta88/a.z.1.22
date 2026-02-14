import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/date-utils'
import type { ReqRow } from '../types'

export function usePaymentUpload(request: ReqRow | null, onReload: () => void) {
  const supabase = createSupabaseBrowserClient()
  const [remainingPaymentImage, setRemainingPaymentImage] = useState<File | null>(null)
  const [remainingPaymentPreview, setRemainingPaymentPreview] = useState<string | null>(null)
  const [uploadingRemainingPayment, setUploadingRemainingPayment] = useState(false)
  const [uploadedRemainingPaymentUrl, setUploadedRemainingPaymentUrl] = useState<string | null>(null)

  const handleRemainingPaymentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('الصورة أكبر من 5 ميجابايت')
      return
    }

    setRemainingPaymentImage(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setRemainingPaymentPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
    e.currentTarget.value = ''
  }

  const removeRemainingPaymentImage = () => {
    setRemainingPaymentImage(null)
    setRemainingPaymentPreview(null)
  }

  const uploadRemainingPayment = async () => {
    if (!remainingPaymentImage || !request) {
      toast.error('يرجى اختيار صورة الدفع')
      return
    }

    setUploadingRemainingPayment(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('يجب تسجيل الدخول')
        return
      }

      // رفع الصورة
      const fileExt = remainingPaymentImage.name.split('.').pop()
      const fileName = `${user.id}/remaining_payment_${Date.now()}.${fileExt}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('passports')
        .upload(fileName, remainingPaymentImage)

      if (uploadError) throw uploadError

      // إنشاء signed URL للصورة
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('passports')
        .createSignedUrl(fileName, 60 * 60 * 24 * 7) // 7 أيام

      if (signedUrlError) throw signedUrlError

      const imageUrl = signedUrlData?.signedUrl || fileName

      // تحديث admin_notes
      const currentNotes = (request.admin_notes || '') as string
      const updatedNotes = currentNotes + `\nصورة الدفع المتبقي: ${imageUrl}\nتم رفع صورة الدفع المتبقي بتاريخ: ${formatDate(new Date())}`

      const { error: updateError } = await supabase
        .from('visit_requests')
        .update({
          admin_notes: updatedNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.id)

      if (updateError) throw updateError

      toast.success('تم رفع صورة الدفع بنجاح. سيتم مراجعتها من الإدارة.')
      setRemainingPaymentImage(null)
      setRemainingPaymentPreview(null)
      onReload()

      // إشعار للإدمن
      try {
        const { notifyAllAdmins } = await import('@/lib/notifications')
        await notifyAllAdmins({
          title: 'صورة دفع متبقي جديدة',
          message: `تم رفع صورة الدفع المتبقي للمستخدم ${request.visitor_name}`,
          type: 'info',
          relatedType: 'request',
          relatedId: request.id,
        })
      } catch (notifyError) {
        console.error('Error sending admin notification:', notifyError)
      }
    } catch (e: any) {
      console.error('Error uploading remaining payment:', e)
      toast.error(e.message || 'حدث خطأ أثناء رفع الصورة')
    } finally {
      setUploadingRemainingPayment(false)
    }
  }

  // تحميل signed URL لصورة الدفع المتبقي المرفوعة
  useEffect(() => {
    const loadUploadedRemainingPaymentImage = async () => {
      if (!request) {
        setUploadedRemainingPaymentUrl(null)
        return
      }
      
      const notes = (request.admin_notes || '') as string
      const match = notes.match(/صورة الدفع المتبقي:\s*([^\n]+)/)
      const rawUrl = match?.[1]?.trim()
      
      if (!rawUrl) {
        setUploadedRemainingPaymentUrl(null)
        return
      }
      
      // إذا كان الرابط يحتوي على token (signed URL)، استخدمه مباشرة
      if (rawUrl.includes('?token=') || rawUrl.includes('&token=')) {
        setUploadedRemainingPaymentUrl(rawUrl)
        return
      }
      
      // إذا لم يكن signed URL، قم بإنشاء signed URL جديد
      try {
        const { getSignedImageUrl } = await import('@/components/request-details/utils')
        const signedUrl = await getSignedImageUrl(rawUrl, supabase)
        setUploadedRemainingPaymentUrl(signedUrl)
      } catch (error) {
        console.error('Error loading remaining payment image signed URL:', error)
        setUploadedRemainingPaymentUrl(rawUrl)
      }
    }
    
    loadUploadedRemainingPaymentImage()
  }, [request, supabase])

  return {
    remainingPaymentImage,
    remainingPaymentPreview,
    uploadingRemainingPayment,
    uploadedRemainingPaymentUrl,
    handleRemainingPaymentUpload,
    removeRemainingPaymentImage,
    uploadRemainingPayment,
  }
}


