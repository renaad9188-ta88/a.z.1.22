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
import PassportImages from './request-details/PassportImages'
import ImageGallery from './request-details/ImageGallery'
import AdminResponse from './request-details/AdminResponse'
import { Copy, MessageCircle } from 'lucide-react'

export default function RequestDetails({ requestId, userId }: { requestId: string; userId: string }) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [request, setRequest] = useState<VisitRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [allImages, setAllImages] = useState<string[]>([])
  const [signedPassportImages, setSignedPassportImages] = useState<{ [key: string]: string }>({})
  const [signedPaymentImages, setSignedPaymentImages] = useState<{ [key: string]: string }>({})
  const [reportGenerating, setReportGenerating] = useState(false)

  useEffect(() => {
    loadRequest()
  }, [requestId, userId])

  // تحديد الإشعارات المرتبطة بهذا الطلب كمقروءة عند فتح الصفحة
  useEffect(() => {
    if (requestId && userId) {
      ;(async () => {
        try {
          await supabase
            .from('notifications')
            .update({ 
              is_read: true,
              read_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('related_type', 'request')
            .eq('related_id', requestId)
            .eq('is_read', false)
          // لا حاجة لتحديث الحالة هنا لأن NotificationsDropdown يستمع للتغييرات
        } catch (error) {
          console.error('Error marking request notifications as read:', error)
        }
      })()
    }
  }, [requestId, userId, supabase])

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

  const copyText = async (text: string, successMsg: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        ta.style.top = '0'
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      toast.success(successMsg)
    } catch (e) {
      console.error('Copy failed:', e)
      toast.error('تعذر النسخ')
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

  // صور الجوازات (الزائر الرئيسي + المرافقين)
  const passportImagesRaw: string[] = []
  if (request.passport_image_url) passportImagesRaw.push(request.passport_image_url)
  companions.forEach((companion: any) => {
    if (companion?.passportImages && Array.isArray(companion.passportImages)) {
      passportImagesRaw.push(...companion.passportImages)
    }
  })
  const passportImagesUnique = Array.from(new Set(passportImagesRaw.filter(Boolean)))

  const platformWhatsappDigits = '962798905595' // 0798905595
  const shortCode = request.id.slice(0, 8).toUpperCase()

  const buildReport = async (): Promise<string> => {
    const isJordanVisit = Boolean((request.admin_notes || '').includes('خدمة: زيارة الأردن لمدة شهر'))
    const tourismCompany = adminInfo?.tourismCompany || 'غير محدد'
    const transportCompany = adminInfo?.transportCompany || 'شركة الرويال للنقل'

    const lines: string[] = []
    lines.push('📋 *ملخص طلب الزيارة*')
    lines.push('')
    lines.push(`🆔 *الكود:* ${shortCode}`)
    lines.push(`📝 *رقم الطلب:* #${shortCode}`)
    lines.push('')
    lines.push('━━━━━━━━━━━━━━━━')
    lines.push('')
    lines.push('*معلومات الطلب:*')
    lines.push(`👤 الاسم: ${request.visitor_name || '-'}`)
    lines.push(`📍 المدينة: ${request.city || '-'}`)
    if (isJordanVisit) {
      lines.push(`🏢 الشركة المقدّم لها الطلب: ${tourismCompany}`)
      lines.push(`🚌 شركة النقل: ${transportCompany}`)
    }
    if (adminInfo?.purpose) {
      lines.push(`🎯 الغرض: ${adminInfo.purpose === 'غير محدد' ? 'زيارات الاقارب ( سياحة )' : adminInfo.purpose}`)
    }
    if (adminInfo?.note) lines.push(`📌 ملاحظة: ${adminInfo.note}`)
    if (companions.length > 0) {
      lines.push(`👥 عدد المرافقين: ${companions.length}`)
    }
    lines.push('')
    lines.push('━━━━━━━━━━━━━━━━')
    lines.push('')
    lines.push('*صور الجوازات:*')
    if (passportImages.length > 0) {
      passportImages.forEach((url, idx) => {
        lines.push(`${idx + 1}. ${url}`)
      })
    } else {
      lines.push('لا توجد صور')
    }
    lines.push('')
    lines.push('*صور الدفعات:*')
    if (paymentImages.length > 0) {
      paymentImages.forEach((url, idx) => {
        lines.push(`${idx + 1}. ${url}`)
      })
    } else {
      lines.push('لا توجد صور')
    }
    lines.push('')
    lines.push('━━━━━━━━━━━━━━━━')
    lines.push('')
    lines.push('*ملاحظة مهمة:*')
    lines.push('تم استلام طلبك وسيتم الرد عليك خلال فترة من 3 إلى 10 أيام لإجراءات الموافقة والقبول وتحديد موعد الزيارة والمتابعة.')
    lines.push('')
    lines.push('💡 *ميزات المنصة:*')
    lines.push('• تتبّع الرحلة لحظة بلحظة من لحظة الانطلاق إلى أن تصل')
    lines.push('• متابعة حالة الطلب بسهولة')
    lines.push('• التواصل السريع مع الإدارة')
    lines.push('')
    lines.push('📸 *الصور:*')
    lines.push('جميع صور الجوازات والدفعات محفوظة داخل المنصة ويمكن الرجوع لها من صفحة الطلب عند الحاجة.')
    lines.push('')
    lines.push('✅ *للامان:* احفظ الكود وشاركنا به عند الحاجة للتأكد والمتابعة.')
    lines.push('')
    lines.push('دمتم بخير 🙏')
    return lines.join('\n')
  }

  const handleSendReportWhatsApp = async () => {
    try {
      setReportGenerating(true)
      const text = await buildReport()
      
      // جمع جميع روابط الصور (صور الجوازات + صور الدفعات)
      const allImageUrls: string[] = []
      
      // إضافة صور الجوازات
      if (passportImages.length > 0) {
        allImageUrls.push(...passportImages)
      } else {
        // استخدام الصور الأصلية إذا لم تكن محولة
        if (request.passport_image_url) {
          allImageUrls.push(request.passport_image_url)
        }
        companions.forEach((companion: any) => {
          if (companion?.passportImages && Array.isArray(companion.passportImages)) {
            allImageUrls.push(...companion.passportImages)
          }
        })
      }
      
      // إضافة صور الدفعات
      if (paymentImages.length > 0) {
        allImageUrls.push(...paymentImages)
      } else if (adminInfo?.paymentImages) {
        allImageUrls.push(...adminInfo.paymentImages)
      }
      
      // إنشاء رابط واتساب مع النص
      const encoded = encodeURIComponent(text)
      let whatsappUrl = `https://wa.me/${platformWhatsappDigits}?text=${encoded}`
      
      // إضافة روابط الصور في النص (واتساب يدعم إرسال روابط الصور)
      if (allImageUrls.length > 0) {
        const imagesText = '\n\n📸 *روابط الصور:*\n' + allImageUrls.map((url, idx) => `${idx + 1}. ${url}`).join('\n')
        const fullText = text + imagesText
        const fullEncoded = encodeURIComponent(fullText)
        whatsappUrl = `https://wa.me/${platformWhatsappDigits}?text=${fullEncoded}`
      }
      
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
      toast.success('تم فتح واتساب مع التقرير والصور')
    } catch (e: any) {
      console.error('Send report WhatsApp error:', e)
      toast.error(e?.message || 'تعذر إرسال التقرير عبر واتساب')
    } finally {
      setReportGenerating(false)
    }
  }

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
          <RequestHeader requestId={request.id} status={request.status} trackingHref={`/dashboard/request/${request.id}/track`} />
          
          <RequestInfo request={request} adminInfo={adminInfo} />

          <PassportImages
            passportImages={passportImagesUnique}
            signedPassportImages={signedPassportImages}
            onOpenGallery={openImageGallery}
          />

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
          <div id="admin-response">
            <AdminResponse adminNotes={request.admin_notes} />
          </div>

          {/* التواريخ */}
          <div className="pt-4 sm:pt-6 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between gap-2 text-xs sm:text-sm text-gray-600">
              <p>تاريخ الإنشاء: {formatDate(request.created_at)}</p>
              <p>آخر تحديث: {formatDate(request.updated_at)}</p>
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={handleSendReportWhatsApp}
                disabled={reportGenerating}
                className="w-full sm:w-auto btn px-4 py-2.5 sm:py-3 bg-green-600 text-white hover:bg-green-700 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MessageCircle className="w-4 h-4" />
                {reportGenerating ? 'جارٍ الإعداد...' : 'إرسال التقرير والصور عبر واتساب'}
              </button>
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
