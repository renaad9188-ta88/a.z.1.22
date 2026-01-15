'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { VisitRequest } from './request-details/types'
import { parseAdminNotes, getSignedImageUrl } from './request-details/utils'
import { formatDate } from '@/lib/date-utils'
import RequestHeader from './request-details/RequestHeader'
import RequestInfo from './request-details/RequestInfo'
import CompanionsList from './request-details/CompanionsList'
import PaymentImages from './request-details/PaymentImages'
import ImageGallery from './request-details/ImageGallery'
import AdminResponse from './request-details/AdminResponse'

export default function RequestDetails({ requestId, userId }: { requestId: string; userId: string }) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [request, setRequest] = useState<VisitRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [allImages, setAllImages] = useState<string[]>([])
  const [signedPassportImages, setSignedPassportImages] = useState<{ [key: string]: string }>({})
  const [signedPaymentImages, setSignedPaymentImages] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    loadRequest()
  }, [requestId, userId])

  // تحويل الصور إلى signed URLs عند تحميل الطلب
  useEffect(() => {
    const convertImagesToSigned = async () => {
      if (!request) return
      
      const signedPassports: { [key: string]: string } = {}
      const signedPayments: { [key: string]: string } = {}
      
      // تحويل صور الجوازات
      if (request.passport_image_url) {
        signedPassports[request.passport_image_url] = await getSignedImageUrl(request.passport_image_url, supabase)
      }
      
      if (request.companions_data && Array.isArray(request.companions_data)) {
        for (const companion of request.companions_data) {
          if (companion.passportImages && Array.isArray(companion.passportImages)) {
            for (const imgUrl of companion.passportImages) {
              if (!signedPassports[imgUrl]) {
                signedPassports[imgUrl] = await getSignedImageUrl(imgUrl, supabase)
              }
            }
          }
        }
      }
      
      // تحويل صور الدفعات
      const adminInfo = parseAdminNotes(request.admin_notes || '')
      if (adminInfo?.paymentImages) {
        for (const imgUrl of adminInfo.paymentImages) {
          if (!signedPayments[imgUrl]) {
            signedPayments[imgUrl] = await getSignedImageUrl(imgUrl, supabase)
          }
        }
      }
      
      setSignedPassportImages(signedPassports)
      setSignedPaymentImages(signedPayments)
    }
    
    convertImagesToSigned()
  }, [request, supabase])

  const loadRequest = async () => {
    try {
      const { data, error } = await supabase
        .from('visit_requests')
        .select('*')
        .eq('id', requestId)
        .eq('user_id', userId)
        .maybeSingle()

      if (error) throw error
      if (!data) {
        toast.error('الطلب غير موجود')
        router.push('/dashboard')
        return
      }

      setRequest(data)
      
      // جمع جميع الصور
      const images: string[] = []
      
      // صور الجوازات من companions_data
      if (data.companions_data && Array.isArray(data.companions_data)) {
        for (const companion of data.companions_data) {
          if (companion.passportImages && Array.isArray(companion.passportImages)) {
            for (const imgUrl of companion.passportImages) {
              const signedUrl = await getSignedImageUrl(imgUrl, supabase)
              images.push(signedUrl)
            }
          }
        }
      }
      
      // صورة الجواز الأساسية
      if (data.passport_image_url) {
        const signedUrl = await getSignedImageUrl(data.passport_image_url, supabase)
        images.push(signedUrl)
      }
      
      // صور الدفعات من admin_notes
      if (data.admin_notes) {
        const paymentMatches = data.admin_notes.match(/https?:\/\/[^\s,]+/g)
        if (paymentMatches) {
          const paymentUrls = paymentMatches.filter((url: string) => url.includes('/payments/'))
          for (const url of paymentUrls) {
            const signedUrl = await getSignedImageUrl(url, supabase)
            images.push(signedUrl)
          }
        }
      }
      
      setAllImages(images)
    } catch (error: any) {
      toast.error('حدث خطأ أثناء تحميل الطلب')
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const openImageGallery = (images: string[], startIndex: number = 0) => {
    setAllImages(images)
    setSelectedImageIndex(startIndex)
  }

  const closeImageGallery = () => {
    setSelectedImageIndex(null)
  }

  const nextImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex < allImages.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1)
    }
  }

  const prevImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (!request) {
    return null
  }

  const adminInfo = parseAdminNotes(request.admin_notes || '')
  const companions = request.companions_data && Array.isArray(request.companions_data) 
    ? request.companions_data 
    : []

  // جمع صور الجوازات والدفعات
  const passportImages: string[] = []
  const paymentImages: string[] = []
  
  allImages.forEach((img) => {
    if (img.includes('/payments/')) {
      paymentImages.push(img)
    } else {
      passportImages.push(img)
    }
  })
  
  // إذا لم تكن هناك صور محولة، استخدم الصور الأصلية
  if (passportImages.length === 0) {
    if (request.passport_image_url) {
      passportImages.push(request.passport_image_url)
    }
    companions.forEach((companion: any) => {
      if (companion.passportImages && Array.isArray(companion.passportImages)) {
        passportImages.push(...companion.passportImages)
      }
    })
  }
  
  if (paymentImages.length === 0 && adminInfo?.paymentImages) {
    paymentImages.push(...adminInfo.paymentImages)
  }

  return (
    <div className="page">
      <div className="page-container">
        {/* زر العودة */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 sm:gap-2 text-blue-600 hover:text-blue-700 mb-4 sm:mb-6 text-sm sm:text-base"
        >
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>العودة للوحة التحكم</span>
        </Link>

        <div className="card">
          <RequestHeader requestId={request.id} status={request.status} />
          
          <RequestInfo request={request} adminInfo={adminInfo} />

          <CompanionsList 
            companions={companions}
            signedPassportImages={signedPassportImages}
            onOpenGallery={openImageGallery}
          />

          <PaymentImages
            paymentImages={paymentImages}
            signedPaymentImages={signedPaymentImages}
            onOpenGallery={openImageGallery}
          />

          {/* رد الإدارة */}
          <AdminResponse adminNotes={request.admin_notes} />

          {/* التواريخ */}
          <div className="pt-4 sm:pt-6 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between gap-2 text-xs sm:text-sm text-gray-600">
              <p>تاريخ الإنشاء: {formatDate(request.created_at)}</p>
              <p>آخر تحديث: {formatDate(request.updated_at)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* معرض الصور */}
      {selectedImageIndex !== null && allImages.length > 0 && (
        <ImageGallery
          images={allImages}
          currentIndex={selectedImageIndex}
          onClose={closeImageGallery}
          onNext={nextImage}
          onPrev={prevImage}
        />
      )}
    </div>
  )
}
