'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
// Using regular img tag for Supabase images to avoid Next.js Image optimization issues
import { 
  ArrowRight, 
  Calendar, 
  MapPin, 
  User, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock,
  Phone,
  Car,
  Hotel,
  DollarSign,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  MessageCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

interface VisitRequest {
  id: string
  visitor_name: string
  nationality: string
  passport_number: string
  passport_expiry: string
  passport_image_url: string | null
  visit_type: string
  travel_date: string
  days_count: number
  city: string
  destination: string | null
  companions_count: number
  companions_data: any
  driver_name: string | null
  driver_phone: string | null
  vehicle_type: string | null
  seats_count: number | null
  route_going: string | null
  route_return: string | null
  hotel_name: string | null
  hotel_location: string | null
  rooms_count: number | null
  nights_count: number | null
  status: string
  rejection_reason: string | null
  deposit_paid: boolean
  deposit_amount: number | null
  total_amount: number | null
  remaining_amount: number | null
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export default function RequestDetails({ requestId, userId }: { requestId: string; userId: string }) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [request, setRequest] = useState<VisitRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [allImages, setAllImages] = useState<string[]>([])
  const [signedPassportImages, setSignedPassportImages] = useState<{ [key: string]: string }>({})
  const [signedPaymentImages, setSignedPaymentImages] = useState<{ [key: string]: string }>({})
  const [imageType, setImageType] = useState<'passport' | 'payment'>('passport')

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
        signedPassports[request.passport_image_url] = await getSignedImageUrl(request.passport_image_url)
      }
      
      if (request.companions_data && Array.isArray(request.companions_data)) {
        for (const companion of request.companions_data) {
          if (companion.passportImages && Array.isArray(companion.passportImages)) {
            for (const imgUrl of companion.passportImages) {
              if (!signedPassports[imgUrl]) {
                signedPassports[imgUrl] = await getSignedImageUrl(imgUrl)
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
            signedPayments[imgUrl] = await getSignedImageUrl(imgUrl)
          }
        }
      }
      
      setSignedPassportImages(signedPassports)
      setSignedPaymentImages(signedPayments)
    }
    
    convertImagesToSigned()
  }, [request])

  // دالة لإنشاء signed URL للصور المحمية
  const getSignedImageUrl = async (publicUrl: string): Promise<string> => {
    try {
      // استخراج مسار الملف من URL
      const urlParts = publicUrl.split('/storage/v1/object/public/passports/')
      if (urlParts.length < 2) return publicUrl
      
      const filePath = urlParts[1]
      
      // إنشاء signed URL صالح لمدة ساعة
      const { data, error } = await supabase.storage
        .from('passports')
        .createSignedUrl(filePath, 3600) // صالح لمدة ساعة
      
      if (error || !data) {
        console.error('Error creating signed URL:', error)
        return publicUrl // إرجاع URL الأصلي في حالة الفشل
      }
      
      return data.signedUrl
    } catch (error) {
      console.error('Error in getSignedImageUrl:', error)
      return publicUrl
    }
  }

  const loadRequest = async () => {
    try {
      const { data, error } = await supabase
        .from('visit_requests')
        .select('*')
        .eq('id', requestId)
        .eq('user_id', userId)
        .single()

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
            // إنشاء signed URLs للصور
            for (const imgUrl of companion.passportImages) {
              const signedUrl = await getSignedImageUrl(imgUrl)
              images.push(signedUrl)
            }
          }
        }
      }
      
      // صورة الجواز الأساسية
      if (data.passport_image_url) {
        const signedUrl = await getSignedImageUrl(data.passport_image_url)
        images.push(signedUrl)
      }
      
      // صور الدفعات من admin_notes
      if (data.admin_notes) {
        const paymentMatches = data.admin_notes.match(/https?:\/\/[^\s,]+/g)
        if (paymentMatches) {
          const paymentUrls = paymentMatches.filter((url: string) => url.includes('/payments/'))
          for (const url of paymentUrls) {
            const signedUrl = await getSignedImageUrl(url)
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

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; color: string; icon: any }> = {
      pending: { text: 'قيد المراجعة', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      under_review: { text: 'بانتظار الموافقة', color: 'bg-blue-100 text-blue-800', icon: Clock },
      approved: { text: 'تم القبول', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { text: 'تم الرفض', color: 'bg-red-100 text-red-800', icon: XCircle },
    }

    const statusInfo = statusMap[status] || statusMap.pending
    const Icon = statusInfo.icon

    return (
      <span className={`inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-full text-xs sm:text-sm font-medium ${statusInfo.color}`}>
        <Icon className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
        <span>{statusInfo.text}</span>
      </span>
    )
  }

  const getVisitTypeText = (type: string) => {
    const types: Record<string, string> = {
      visit: 'زيارة',
      umrah: 'عمرة',
      tourism: 'سياحة',
    }
    return types[type] || type
  }

  const parseAdminNotes = (notes: string) => {
    if (!notes) return null
    
    const info: any = {}
    const lines = notes.split('\n')
    
    // استخراج جميع URLs من admin_notes
    const allUrls = notes.match(/https?:\/\/[^\s,\n]+/g) || []
    const paymentUrls = allUrls.filter((url: string) => url.includes('/payments/'))
    
    if (paymentUrls.length > 0) {
      info.paymentImages = paymentUrls
    }
    
    lines.forEach(line => {
      if (line.includes('الهاتف الأردني:')) {
        info.jordanPhone = line.split('الهاتف الأردني:')[1]?.trim().split('\n')[0].split(' ')[0]
      }
      if (line.includes('الهاتف السوري / واتساب')) {
        const parts = line.split('الهاتف السوري / واتساب')
        if (parts[1]) {
          // استخراج الرقم فقط (قبل أي URLs)
          const phonePart = parts[1].trim().split(' ')[0]
          info.syrianPhone = phonePart
        }
      }
      if (line.includes('الغرض:')) {
        const purposePart = line.split('الغرض:')[1]?.trim()
        if (purposePart && !purposePart.startsWith('http')) {
          info.purpose = purposePart.split(' ')[0] || 'غير محدد'
        } else {
          info.purpose = 'غير محدد'
        }
      }
    })
    
    return info
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

  // جمع صور الجوازات (استخدام الصور المحولة من allImages)
  const passportImages: string[] = []
  const paymentImages: string[] = []
  
  // فصل الصور من allImages (التي تم تحويلها لـ signed URLs)
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        {/* زر العودة */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 sm:gap-2 text-blue-600 hover:text-blue-700 mb-4 sm:mb-6 text-sm sm:text-base"
        >
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>العودة للوحة التحكم</span>
        </Link>

        <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8">
          {/* العنوان والحالة */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8 pb-4 sm:pb-6 border-b border-gray-200">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-1 sm:mb-2">تفاصيل الطلب</h1>
              <p className="text-xs sm:text-sm text-gray-600">رقم الطلب: {request.id.slice(0, 8)}</p>
            </div>
            {getStatusBadge(request.status)}
          </div>

          {/* سبب الرفض */}
          {request.rejection_reason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
              <h3 className="font-semibold text-red-800 mb-1 sm:mb-2 text-sm sm:text-base">سبب الرفض:</h3>
              <p className="text-red-700 text-xs sm:text-sm">{request.rejection_reason}</p>
            </div>
          )}

          {/* معلومات التواصل من admin_notes */}
          {adminInfo && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
              <h3 className="font-semibold text-blue-800 mb-2 sm:mb-3 text-sm sm:text-base flex items-center gap-2">
                <Phone className="w-4 h-4" />
                معلومات التواصل
              </h3>
              <div className="space-y-2 text-xs sm:text-sm">
                {adminInfo.jordanPhone && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">الهاتف الأردني:</span>
                    <a href={`tel:${adminInfo.jordanPhone}`} className="text-blue-600 hover:underline font-semibold">
                      {adminInfo.jordanPhone}
                    </a>
                  </div>
                )}
                {adminInfo.syrianPhone && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">الهاتف السوري / واتساب:</span>
                    <a 
                      href={`https://wa.me/${adminInfo.syrianPhone.replace(/[^\d]/g, '')}`} 
                      target="_blank"
                      className="text-green-600 hover:underline font-semibold flex items-center gap-1"
                    >
                      {adminInfo.syrianPhone}
                      <MessageCircle className="w-3 h-3" />
                    </a>
                  </div>
                )}
                {adminInfo.purpose && (
                  <div>
                    <span className="text-gray-600">الغرض من الزيارة:</span>
                    <span className="text-gray-800 font-semibold mr-2">{adminInfo.purpose}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* البيانات الأساسية */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            {/* بيانات الزائر */}
            <div className="bg-gray-50 p-4 sm:p-5 md:p-6 rounded-lg">
              <h2 className="text-base sm:text-lg md:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
                <User className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>بيانات الزائر</span>
              </h2>
              <div className="space-y-2 sm:space-y-3">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">الاسم الكامل</p>
                  <p className="font-semibold text-sm sm:text-base">{request.visitor_name}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">الجنسية</p>
                  <p className="font-semibold text-sm sm:text-base">{request.nationality}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">المدينة</p>
                  <p className="font-semibold text-sm sm:text-base">{request.city}</p>
                </div>
              </div>
            </div>

            {/* بيانات الرحلة */}
            <div className="bg-gray-50 p-4 sm:p-5 md:p-6 rounded-lg">
              <h2 className="text-base sm:text-lg md:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>بيانات الرحلة</span>
              </h2>
              <div className="space-y-2 sm:space-y-3">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">نوع الزيارة</p>
                  <p className="font-semibold text-sm sm:text-base">{getVisitTypeText(request.visit_type)}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">عدد الأيام</p>
                  <p className="font-semibold text-sm sm:text-base">{request.days_count} يوم</p>
                </div>
              </div>
            </div>
          </div>

          {/* الأشخاص وصور الجوازات */}
          {companions.length > 0 && (
            <div className="bg-gray-50 p-4 sm:p-5 md:p-6 rounded-lg mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg md:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
                <User className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>الأشخاص المسجلين ({companions.length})</span>
              </h2>
              <div className="space-y-3 sm:space-y-4">
                {companions.map((companion: any, index: number) => {
                  const images = companion.passportImages || []
                  return (
                    <div key={index} className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-bold text-sm sm:text-base">{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-sm sm:text-base text-gray-800">{companion.name || `شخص ${index + 1}`}</p>
                            <p className="text-xs sm:text-sm text-gray-600">{images.length} صورة جواز</p>
                          </div>
                        </div>
                        {images.length > 0 && (
                          <button
                            onClick={() => {
                              // استخدام signed URLs
                              const signedImages = images.map(url => signedPassportImages[url] || url)
                              openImageGallery(signedImages, 0)
                            }}
                            className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs sm:text-sm"
                          >
                            <Maximize2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>عرض الصور</span>
                          </button>
                        )}
                      </div>
                      {images.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 mt-3">
                          {images.slice(0, 4).map((img: string, imgIndex: number) => {
                            // استخدام signed URL إذا كان متوفراً، وإلا استخدم URL الأصلي
                            const displayUrl = signedPassportImages[img] || img
                            return (
                              <div
                                key={imgIndex}
                                onClick={() => {
                                  // استخدام signed URLs من allImages
                                  const signedImages = images.map(url => signedPassportImages[url] || url)
                                  openImageGallery(signedImages, imgIndex)
                                }}
                                className="relative aspect-video cursor-pointer group rounded-lg overflow-hidden border border-gray-300"
                              >
                                <img
                                  src={displayUrl}
                                  alt={`صورة جواز ${companion.name}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  loading="lazy"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    target.style.display = 'none'
                                    const parent = target.parentElement
                                    if (parent) {
                                      parent.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-xs">فشل تحميل الصورة</div>'
                                    }
                                  }}
                                />
                                {images.length > 4 && imgIndex === 3 && (
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">+{images.length - 4}</span>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* صور الدفعات */}
          {paymentImages.length > 0 && (
            <div className="bg-gray-50 p-4 sm:p-5 md:p-6 rounded-lg mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg md:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>صور الدفعات ({paymentImages.length})</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                {paymentImages.map((img: string, index: number) => {
                  // استخدام signed URL إذا كان متوفراً
                  const displayUrl = signedPaymentImages[img] || img
                  return (
                    <div
                      key={index}
                      onClick={() => {
                        // استخدام signed URLs
                        const signedImages = paymentImages.map(url => signedPaymentImages[url] || url)
                        openImageGallery(signedImages, index)
                      }}
                      className="relative aspect-video cursor-pointer group rounded-lg overflow-hidden border border-gray-300"
                    >
                      <img
                        src={displayUrl}
                        alt={`صورة دفعة ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          const parent = target.parentElement
                          if (parent) {
                            parent.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-xs">فشل تحميل الصورة</div>'
                          }
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* معلومات الدفع */}
          <div className="bg-gray-50 p-4 sm:p-5 md:p-6 rounded-lg mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg md:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>معلومات الدفع</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">حالة العربون</p>
                <p className={`font-semibold text-sm sm:text-base ${request.deposit_paid ? 'text-green-600' : 'text-red-600'}`}>
                  {request.deposit_paid ? '✓ مدفوع' : '✗ غير مدفوع'}
                </p>
              </div>
              {request.deposit_amount && (
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">مبلغ العربون</p>
                  <p className="font-semibold text-sm sm:text-base">{request.deposit_amount} د.أ</p>
                </div>
              )}
              {request.total_amount && (
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">المبلغ الإجمالي</p>
                  <p className="font-semibold text-sm sm:text-base">{request.total_amount} د.أ</p>
                </div>
              )}
            </div>
          </div>

          {/* التواريخ */}
          <div className="pt-4 sm:pt-6 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between gap-2 text-xs sm:text-sm text-gray-600">
              <p>تاريخ الإنشاء: {new Date(request.created_at).toLocaleDateString('ar-SA')}</p>
              <p>آخر تحديث: {new Date(request.updated_at).toLocaleDateString('ar-SA')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* معرض الصور */}
      {selectedImageIndex !== null && allImages.length > 0 && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <button
            onClick={closeImageGallery}
            className="absolute top-4 left-4 text-white hover:text-gray-300 z-10"
          >
            <X className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>
          
          {selectedImageIndex > 0 && (
            <button
              onClick={prevImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-10 bg-black/50 rounded-full p-2"
            >
              <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
          )}
          
          {selectedImageIndex < allImages.length - 1 && (
            <button
              onClick={nextImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-10 bg-black/50 rounded-full p-2"
            >
              <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
          )}

          <div className="relative w-full h-full max-w-5xl max-h-[90vh] flex items-center justify-center">
            <img
              src={allImages[selectedImageIndex]}
              alt={`صورة ${selectedImageIndex + 1}`}
              className="max-w-full max-h-full object-contain"
              style={{ maxHeight: '90vh' }}
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  parent.innerHTML = '<div class="text-white text-center"><p class="text-lg mb-2">فشل تحميل الصورة</p><p class="text-sm text-gray-400">يرجى المحاولة مرة أخرى</p></div>'
                }
              }}
            />
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm sm:text-base">
            {selectedImageIndex + 1} / {allImages.length}
          </div>
        </div>
      )}
    </div>
  )
}

