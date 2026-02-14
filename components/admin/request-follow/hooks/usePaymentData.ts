import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { getSignedImageUrl } from '@/components/request-details/utils'
import type { ReqRow } from '../types'

export function usePaymentData(request: ReqRow | null, adminInfo: any) {
  const supabase = createSupabaseBrowserClient()
  const [remainingPaymentImageUrl, setRemainingPaymentImageUrl] = useState<string | null>(null)
  const [depositPaymentImageUrls, setDepositPaymentImageUrls] = useState<string[]>([])

  // تحميل signed URL لصورة الدفع المتبقي
  useEffect(() => {
    const loadPaymentImageUrl = async () => {
      if (!request) {
        setRemainingPaymentImageUrl(null)
        return
      }
      
      const notes = (request.admin_notes || '') as string
      const match = notes.match(/صورة الدفع المتبقي:\s*([^\n]+)/)
      const rawUrl = match?.[1]?.trim()
      
      if (!rawUrl) {
        setRemainingPaymentImageUrl(null)
        return
      }
      
      // إذا كان الرابط يحتوي على token (signed URL)، استخدمه مباشرة
      if (rawUrl.includes('?token=') || rawUrl.includes('&token=')) {
        setRemainingPaymentImageUrl(rawUrl)
        return
      }
      
      // إذا لم يكن signed URL، قم بإنشاء signed URL جديد
      try {
        const signedUrl = await getSignedImageUrl(rawUrl, supabase)
        setRemainingPaymentImageUrl(signedUrl)
      } catch (error) {
        console.error('Error loading payment image signed URL:', error)
        // في حالة الخطأ، استخدم الرابط الأصلي
        setRemainingPaymentImageUrl(rawUrl)
      }
    }
    
    loadPaymentImageUrl()
  }, [request, supabase])

  // تحميل signed URLs لصور الدفعة الأولية
  useEffect(() => {
    const loadDepositPaymentImages = async () => {
      if (!request || !adminInfo?.paymentImages || adminInfo.paymentImages.length === 0) {
        setDepositPaymentImageUrls([])
        return
      }

      try {
        const signedUrls = await Promise.all(
          adminInfo.paymentImages.map(async (url: string) => {
            try {
              return await getSignedImageUrl(url, supabase)
            } catch (error) {
              console.warn('Error loading payment image signed URL:', error)
              return url
            }
          })
        )
        setDepositPaymentImageUrls(signedUrls.filter(Boolean))
      } catch (error) {
        console.error('Error loading deposit payment images:', error)
        setDepositPaymentImageUrls(adminInfo.paymentImages || [])
      }
    }

    loadDepositPaymentImages()
  }, [request, adminInfo?.paymentImages, supabase])

  return {
    remainingPaymentImageUrl,
    depositPaymentImageUrls,
  }
}

