import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { getSignedImageUrl } from '@/components/request-details/utils'
import type { ReqRow, ContactProfile, Role } from '../types'

export function useRequestData(requestId: string, adminUserId: string, role: Role) {
  const supabase = createSupabaseBrowserClient()
  const [request, setRequest] = useState<ReqRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<ContactProfile | null>(null)
  const [remainingPaymentImageUrl, setRemainingPaymentImageUrl] = useState<string | null>(null)
  const [depositPaymentImageUrls, setDepositPaymentImageUrls] = useState<string[]>([])

  const load = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('visit_requests')
        .select(
          'id,user_id,visitor_name,status,admin_notes,rejection_reason,payment_verified,remaining_amount,arrival_date,departure_date,trip_status,trip_id,assigned_to,selected_dropoff_stop_id,selected_pickup_stop_id,deposit_paid,deposit_amount,companions_count,created_at,updated_at'
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
      
      if (rawUrl.includes('?token=') || rawUrl.includes('&token=')) {
        setRemainingPaymentImageUrl(rawUrl)
        return
      }
      
      try {
        const signedUrl = await getSignedImageUrl(rawUrl, supabase)
        setRemainingPaymentImageUrl(signedUrl)
      } catch (error) {
        console.error('Error loading payment image signed URL:', error)
        setRemainingPaymentImageUrl(rawUrl)
      }
    }
    
    loadPaymentImageUrl()
  }, [request, supabase])

  // تحميل signed URLs لصور الدفعة الأولية
  useEffect(() => {
    const loadDepositPaymentImages = async () => {
      if (!request) {
        setDepositPaymentImageUrls([])
        return
      }
      
      const notes = (request.admin_notes || '') as string
      // استخراج صور الدفعة الأولية من admin_notes
      const paymentImageMatches = notes.match(/صورة الدفعة الأولية:\s*([^\n]+)/g)
      if (!paymentImageMatches || paymentImageMatches.length === 0) {
        setDepositPaymentImageUrls([])
        return
      }
      
      const paymentImageUrls = paymentImageMatches.map(match => {
        const url = match.replace(/صورة الدفعة الأولية:\s*/, '').trim()
        return url
      }).filter(Boolean)

      if (paymentImageUrls.length === 0) {
        setDepositPaymentImageUrls([])
        return
      }

      try {
        const signedUrls = await Promise.all(
          paymentImageUrls.map(async (url: string) => {
            try {
              if (url.includes('?token=') || url.includes('&token=')) {
                return url
              }
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
        setDepositPaymentImageUrls(paymentImageUrls)
      }
    }

    loadDepositPaymentImages()
  }, [request, supabase])

  return {
    request,
    setRequest,
    loading,
    userProfile,
    remainingPaymentImageUrl,
    depositPaymentImageUrls,
    reload: load,
  }
}

