'use client'

import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
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
import TripSchedulingModal from './admin/TripSchedulingModal'
import { Banknote, Copy, FileText, MessageCircle, X } from 'lucide-react'

export default function RequestDetails({ requestId, userId }: { requestId: string; userId: string }) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [request, setRequest] = useState<VisitRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [allImages, setAllImages] = useState<string[]>([])
  const [signedPassportImages, setSignedPassportImages] = useState<{ [key: string]: string }>({})
  const [signedPaymentImages, setSignedPaymentImages] = useState<{ [key: string]: string }>({})
  const [reportOpen, setReportOpen] = useState(false)
  const [reportText, setReportText] = useState<string>('')
  const [reportGenerating, setReportGenerating] = useState(false)

  // Post-approval steps (user flow)
  const [showSchedulingModal, setShowSchedulingModal] = useState(false)
  const [guaranteeMethod, setGuaranteeMethod] = useState<string>('توقيع الكفالة في المكتب عند الوصول')
  const [remainingPaymentMethod, setRemainingPaymentMethod] = useState<'bus' | 'office' | 'click'>('click')
  const [newPaymentFiles, setNewPaymentFiles] = useState<File[]>([])
  const [newPaymentPreviews, setNewPaymentPreviews] = useState<string[]>([])
  const [savingPostApproval, setSavingPostApproval] = useState(false)

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

  const POST_APPROVAL_START = '=== استكمال بعد الموافقة ==='
  const POST_APPROVAL_END = '=== نهاية الاستكمال ==='

  const upsertNotesBlock = (notes: string, start: string, end: string, block: string) => {
    const n = notes || ''
    const startIdx = n.indexOf(start)
    const endIdx = n.indexOf(end)
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const before = n.slice(0, startIdx).trimEnd()
      const after = n.slice(endIdx + end.length).trimStart()
      return [before, block.trim(), after].filter(Boolean).join('\n\n')
    }
    return [n.trim(), block.trim()].filter(Boolean).join('\n\n')
  }

  const handlePaymentFilesChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const allowed = files.filter((f) => {
      if (f.size > 5 * 1024 * 1024) {
        toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت')
        return false
      }
      return true
    })

    if (allowed.length === 0) return
    setNewPaymentFiles((prev) => [...prev, ...allowed])
    setNewPaymentPreviews((prev) => [...prev, ...allowed.map((f) => URL.createObjectURL(f))])
    e.target.value = ''
  }

  const removeNewPaymentAt = (idx: number) => {
    setNewPaymentFiles((prev) => prev.filter((_, i) => i !== idx))
    setNewPaymentPreviews((prev) => {
      const url = prev[idx]
      if (url) URL.revokeObjectURL(url)
      return prev.filter((_, i) => i !== idx)
    })
  }

  const uploadPaymentImage = async (file: File): Promise<string> => {
    const { data: auth } = await supabase.auth.getUser()
    const u = auth?.user
    const ownerId = u?.id || userId

    const ext = file.name.split('.').pop() || 'jpg'
    const filePath = `${ownerId}/payments/remaining/${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`

    const { error: upErr } = await supabase.storage.from('passports').upload(filePath, file)
    if (upErr) throw upErr

    const { data } = supabase.storage.from('passports').getPublicUrl(filePath)
    return data.publicUrl
  }

  const handleSavePostApproval = async () => {
    if (!request) return

    try {
      setSavingPostApproval(true)

      const uploadedUrls: string[] = []
      for (const f of newPaymentFiles) {
        const url = await uploadPaymentImage(f)
        uploadedUrls.push(url)
      }

      const remaining = request.remaining_amount ?? 20
      const blockLines: string[] = []
      blockLines.push(POST_APPROVAL_START)
      blockLines.push(`طريقة توقيع الكفالة: ${guaranteeMethod || 'غير محدد'}`)
      blockLines.push(
        `طريقة دفع المتبقي: ${
          remainingPaymentMethod === 'click'
            ? 'كليك (تحويل)'
            : remainingPaymentMethod === 'office'
            ? 'في المكتب'
            : 'في الباص مع المندوب'
        }`
      )
      blockLines.push(`المبلغ المتبقي: ${remaining} دينار`)
      if (uploadedUrls.length > 0) {
        blockLines.push('صور الدفعات:')
        uploadedUrls.forEach((u) => blockLines.push(u))
      }
      blockLines.push(`تاريخ الإرسال: ${new Date().toISOString()}`)
      blockLines.push(POST_APPROVAL_END)

      const updatedNotes = upsertNotesBlock(request.admin_notes || '', POST_APPROVAL_START, POST_APPROVAL_END, blockLines.join('\n'))

      const { error } = await supabase
        .from('visit_requests')
        .update({ admin_notes: updatedNotes, updated_at: new Date().toISOString() } as any)
        .eq('id', request.id)
        .eq('user_id', userId)

      if (error) throw error

      toast.success('تم حفظ استكمال الإجراءات. سيتم مراجعتها من الإدارة لتأكيد الدفعة.')
      setNewPaymentFiles([])
      newPaymentPreviews.forEach((u) => URL.revokeObjectURL(u))
      setNewPaymentPreviews([])
      await loadRequest()
    } catch (e: any) {
      console.error('Save post-approval error:', e)
      toast.error(e?.message || 'تعذر حفظ استكمال الإجراءات')
    } finally {
      setSavingPostApproval(false)
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
    lines.push('مرحباً بك في المنصة')
    lines.push('')
    lines.push('للامان: احفظ الكود وشاركنا به عند الحاجة للتأكد والمتابعة.')
    lines.push(`الكود: ${shortCode}`)
    lines.push(`رقم الطلب: #${shortCode}`)
    lines.push('')
    lines.push('ملخص الطلب:')
    lines.push(`- الاسم: ${request.visitor_name || '-'}`)
    lines.push(`- المدينة: ${request.city || '-'}`)
    if (isJordanVisit) {
      lines.push(`- الشركة المقدّم لها الطلب: ${tourismCompany}`)
      lines.push(`- شركة النقل: ${transportCompany}`)
    }
    if (adminInfo?.purpose) {
      lines.push(`- الغرض: ${adminInfo.purpose === 'غير محدد' ? 'زيارات الاقارب ( سياحة )' : adminInfo.purpose}`)
    }
    if (adminInfo?.note) lines.push(`- ملاحظة: ${adminInfo.note}`)
    lines.push('')
    lines.push('ملاحظة مهمة:')
    lines.push('تم استلام طلبك وسيتم الرد عليك خلال فترة من 3 إلى 10 أيام لإجراءات الموافقة والقبول وتحديد موعد الزيارة والمتابعة.')
    lines.push('هناك ميزات تربطنا ونسهل عليك الزيارة، وميزة تتبّع الرحلة لحظة بلحظة من لحظة الانطلاق إلى أن تصل. نحن معك.')
    lines.push('')
    lines.push('ملاحظة: صور الجوازات وصور الدفعات محفوظة داخل المنصة ويمكن الرجوع لها من صفحة الطلب عند الحاجة.')
    lines.push('')
    lines.push('دمتم بخير.')
    return lines.join('\n')
  }

  const handleGenerateReport = async () => {
    try {
      setReportGenerating(true)
      const text = await buildReport()
      setReportText(text)
      setReportOpen(true)
      toast.success('تم إنشاء التقرير')
    } catch (e: any) {
      console.error('Report generation error:', e)
      toast.error(e?.message || 'تعذر إنشاء التقرير')
    } finally {
      setReportGenerating(false)
    }
  }

  const handleSendReportWhatsApp = async () => {
    try {
      setReportGenerating(true)
      const text = reportText || (await buildReport())
      setReportText(text)
      setReportOpen(true)
      const encoded = encodeURIComponent(text)
      window.open(`https://wa.me/${platformWhatsappDigits}?text=${encoded}`, '_blank', 'noopener,noreferrer')
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
          
          {/* استكمال الإجراءات بعد الموافقة */}
          {request.status === 'approved' && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 sm:p-5 md:p-6 mb-4 sm:mb-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-gray-900">
                    استكمال الإجراءات بعد الموافقة
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-gray-700 leading-relaxed">
                    يرجى استكمال الخطوات التالية. بعد رفع صورة الدفعة سيتم تأكيدها من الإدارة لفتح حجز موعد القدوم.
                  </p>
                </div>
                {Boolean((request as any)?.payment_verified) ? (
                  <span className="text-[10px] sm:text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-800 border border-green-200 whitespace-nowrap">
                    الدفعة مؤكدة
                  </span>
                ) : (
                  <span className="text-[10px] sm:text-xs font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">
                    بانتظار تأكيد الدفعة
                  </span>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                {/* 1) تحديد موعد القدوم */}
                <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
                  <p className="font-bold text-gray-800 text-sm sm:text-base mb-2">1) تحديد موعد القدوم</p>
                  <p className="text-xs sm:text-sm text-gray-600 mb-3">
                    {request.arrival_date ? `الموعد الحالي: ${formatDate(request.arrival_date)}` : 'لم يتم تحديد موعد القدوم بعد.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowSchedulingModal(true)}
                    className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold"
                  >
                    {request.arrival_date ? 'تعديل موعد القدوم' : 'تحديد موعد القدوم'}
                  </button>
                </div>

                {/* 2) توقيع الكفالة */}
                <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
                  <p className="font-bold text-gray-800 text-sm sm:text-base mb-2">2) توقيع الكفالة</p>
                  <div className="space-y-2 text-sm">
                    {[
                      'توقيع الكفالة في المكتب عند الوصول',
                      'توقيع الكفالة في النقل مع المندوب',
                      'توقيع الكفالة قبل القدوم',
                    ].map((opt) => (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="guarantee"
                          checked={(guaranteeMethod || '') === opt}
                          onChange={() => setGuaranteeMethod(opt)}
                        />
                        <span className="text-gray-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 3) دفع المبلغ المتبقي */}
                <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 lg:col-span-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className="font-bold text-gray-800 text-sm sm:text-base">3) دفع المبلغ المتبقي</p>
                    <span className="text-sm font-extrabold text-blue-700">
                      المتبقي: {(request.remaining_amount ?? 20)} دينار
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { key: 'bus' as const, label: 'في الباص مع المندوب' },
                      { key: 'office' as const, label: 'في المكتب' },
                      { key: 'click' as const, label: 'كليك (تحويل)' },
                    ].map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setRemainingPaymentMethod(m.key)}
                        className={`px-3 py-2 rounded-lg border text-sm font-semibold transition ${
                          remainingPaymentMethod === m.key
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {remainingPaymentMethod === 'click' && (
                    <div className="mt-3 bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-100">
                      <p className="font-bold text-gray-800 text-sm mb-2">أرقام الدفع (كليك)</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="bg-white p-3 rounded-lg border border-gray-200 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 text-sm">البنك الإسلامي الأردني</p>
                            <p className="text-xs text-gray-600">باسم: محمد محمد محمد (تجريبي)</p>
                            <p className="text-sm font-mono ltr text-blue-700">077777777777</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyText('077777777777', 'تم نسخ رقم البنك')}
                            className="p-2 rounded-lg hover:bg-gray-100 transition"
                            aria-label="نسخ رقم البنك"
                            title="نسخ"
                          >
                            <Copy className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-200 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 text-sm">محفظة زين كاش</p>
                            <p className="text-xs text-gray-600">باسم: حمادة حمادة حمادة</p>
                            <p className="text-sm font-mono ltr text-blue-700">07979797979</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyText('07979797979', 'تم نسخ رقم زين كاش')}
                            className="p-2 rounded-lg hover:bg-gray-100 transition"
                            aria-label="نسخ رقم زين كاش"
                            title="نسخ"
                          >
                            <Copy className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-3">
                    <p className="font-bold text-gray-800 text-sm mb-2">رفع صورة الدفعة</p>
                    <label className="block cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-4 text-center hover:border-green-400 transition bg-white">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePaymentFilesChange}
                        className="hidden"
                      />
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                        <Banknote className="w-4 h-4 text-green-600" />
                        اضغط لرفع صور الدفعات (حد أقصى 5MB لكل صورة)
                      </div>
                    </label>

                    {newPaymentPreviews.length > 0 && (
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {newPaymentPreviews.map((src, idx) => (
                          <div key={src} className="relative group">
                            <img
                              src={src}
                              alt={`دفعة جديدة ${idx + 1}`}
                              className="w-full h-24 sm:h-28 object-cover rounded-lg border border-gray-200"
                            />
                            <button
                              type="button"
                              onClick={() => removeNewPaymentAt(idx)}
                              className="absolute top-1 left-1 bg-red-600 text-white rounded-full p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                              title="حذف"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={handleSavePostApproval}
                        disabled={savingPostApproval}
                        className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold disabled:opacity-50"
                      >
                        {savingPostApproval ? 'جاري الحفظ...' : 'حفظ استكمال الإجراءات'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

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
          <AdminResponse adminNotes={request.admin_notes} />

          {/* التواريخ */}
          <div className="pt-4 sm:pt-6 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between gap-2 text-xs sm:text-sm text-gray-600">
              <p>تاريخ الإنشاء: {formatDate(request.created_at)}</p>
              <p>آخر تحديث: {formatDate(request.updated_at)}</p>
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleGenerateReport}
                disabled={reportGenerating}
                className="btn-primary text-sm sm:text-base"
              >
                <FileText className="w-4 h-4" />
                {reportGenerating ? 'جارٍ إنشاء التقرير...' : 'إنشاء تقرير'}
              </button>
              <button
                type="button"
                onClick={handleSendReportWhatsApp}
                disabled={reportGenerating}
                className="btn px-4 py-2.5 sm:py-3 bg-green-600 text-white hover:bg-green-700 text-sm sm:text-base"
              >
                <MessageCircle className="w-4 h-4" />
                إرسال عبر واتساب
              </button>
            </div>

            {reportOpen && reportText && (
              <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <p className="font-bold text-gray-800 text-sm sm:text-base">تقرير جاهز للإرسال</p>
                  <button
                    type="button"
                    onClick={() => copyText(reportText, 'تم نسخ التقرير')}
                    className="btn-secondary text-sm"
                  >
                    <Copy className="w-4 h-4" />
                    نسخ التقرير
                  </button>
                </div>
                <pre className="mt-3 text-xs sm:text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {reportText}
                </pre>
              </div>
            )}
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

      {showSchedulingModal && (
        <TripSchedulingModal
          request={request as any}
          onClose={() => setShowSchedulingModal(false)}
          onUpdate={loadRequest}
          isAdmin={false}
        />
      )}
    </div>
  )
}
