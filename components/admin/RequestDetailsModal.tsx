'use client'

import { useState, useEffect } from 'react'
import { X, Save, User, Phone, Calendar, MapPin, FileText, Image as ImageIcon, MessageSquare, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react'
import { VisitRequest, UserProfile } from './types'
import { parseAdminNotes } from '../request-details/utils'
import { getSignedImageUrl } from '../request-details/utils'
import { formatDate } from '@/lib/date-utils'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import TripTrackingAdminPanel from './TripTrackingAdminPanel'
import { 
  notifyRequestApproved, 
  notifyRequestRejected, 
  notifyAdminResponse,
  notifyRequestUnderReview,
  notifyRequestCompleted,
  notifyCustomMessage,
  notifyAllAdmins,
  createNotification,
  notifySupervisorAssigned,
  notifyPaymentVerified
} from '@/lib/notifications'

interface RequestDetailsModalProps {
  request: VisitRequest | null
  userProfile: UserProfile | null
  onClose: () => void
  onUpdate: () => void
}

export default function RequestDetailsModal({
  request,
  userProfile,
  onClose,
  onUpdate,
}: RequestDetailsModalProps) {
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('pending')
  const [rejectionReason, setRejectionReason] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [adminResponse, setAdminResponse] = useState('')
  const [initialAdminResponse, setInitialAdminResponse] = useState('')
  const [assignedTo, setAssignedTo] = useState<string>('')
  const [supervisors, setSupervisors] = useState<Array<{ user_id: string; full_name: string | null; phone: string | null }>>([])
  const [paymentVerified, setPaymentVerified] = useState<boolean>(false)
  const [passportImages, setPassportImages] = useState<string[]>([])
  const [paymentImages, setPaymentImages] = useState<string[]>([])
  const [imagesLoading, setImagesLoading] = useState(true)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [selectedImageType, setSelectedImageType] = useState<'passport' | 'payment' | null>(null)

  useEffect(() => {
    if (request) {
      setStatus(request.status)
      setRejectionReason(request.rejection_reason || '')
      setAdminNotes(request.admin_notes || '')
      setAssignedTo((request as any)?.assigned_to || '')
      setPaymentVerified(Boolean((request as any)?.payment_verified))
      
      // استخراج الرد السابق من admin_notes
      if (request.admin_notes) {
        const lines = request.admin_notes.split('\n')
        const responseIndex = lines.findIndex(line => line.includes('=== رد الإدارة ==='))
        if (responseIndex !== -1) {
          const prev = lines.slice(responseIndex + 1).join('\n').trim()
          setAdminResponse(prev)
          setInitialAdminResponse(prev)
        } else {
          setAdminResponse('')
          setInitialAdminResponse('')
        }
      } else {
        setAdminResponse('')
        setInitialAdminResponse('')
      }

      // تحميل الصور
      loadImages()
    }
  }, [request])

  useEffect(() => {
    // تحميل قائمة المشرفين (للتعيين)
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone')
          .eq('role', 'supervisor')
          .order('updated_at', { ascending: false })
        if (error) throw error
        setSupervisors((data || []) as any)
      } catch (e) {
        console.warn('Could not load supervisors list:', e)
        setSupervisors([])
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadImages = async () => {
    if (!request) return

    setImagesLoading(true)
    const images: string[] = []
    const payments: string[] = []

    try {
      // صورة الجواز الرئيسية
      if (request.passport_image_url) {
        try {
          const signedUrl = await getSignedImageUrl(request.passport_image_url, supabase)
          // استخدم signed URL إذا كان متاحاً، وإلا استخدم الرابط الأصلي
          images.push(signedUrl || request.passport_image_url)
        } catch (error) {
          console.error('Error loading main passport image:', error)
          // إذا فشل، استخدم الرابط الأصلي
          images.push(request.passport_image_url)
        }
      }

      // صور المرافقين
      if (request.companions_data) {
        try {
          // إذا كان JSON string، حوله إلى object
          const companions = typeof request.companions_data === 'string' 
            ? JSON.parse(request.companions_data) 
            : request.companions_data

          if (Array.isArray(companions)) {
            for (const companion of companions) {
              if (companion.passportImages && Array.isArray(companion.passportImages)) {
                for (const imgUrl of companion.passportImages) {
                  if (imgUrl) {
                    try {
                      const signedUrl = await getSignedImageUrl(imgUrl, supabase)
                      images.push(signedUrl || imgUrl)
                    } catch (error) {
                      console.warn('Error loading companion passport image, using original URL:', error)
                      images.push(imgUrl)
                    }
                  }
                }
              } else if (companion.passport_image_url) {
                try {
                  const signedUrl = await getSignedImageUrl(companion.passport_image_url, supabase)
                  images.push(signedUrl || companion.passport_image_url)
                } catch (error) {
                  console.warn('Error loading companion passport image, using original URL:', error)
                  images.push(companion.passport_image_url)
                }
              }
            }
          } else if (companions && typeof companions === 'object') {
            // إذا كان object وليس array
            Object.values(companions).forEach((companion: any) => {
              if (companion?.passportImages && Array.isArray(companion.passportImages)) {
                companion.passportImages.forEach((imgUrl: string) => {
                  if (imgUrl) {
                    try {
                      getSignedImageUrl(imgUrl, supabase).then(signedUrl => {
                        images.push(signedUrl || imgUrl)
                      }).catch(() => {
                        images.push(imgUrl)
                      })
                    } catch {
                      images.push(imgUrl)
                    }
                  }
                })
              }
            })
          }
        } catch (error) {
          console.error('Error parsing companions_data:', error)
        }
      }

      // صور الدفعات
      const adminInfo = parseAdminNotes(request.admin_notes || '')
      if (adminInfo?.paymentImages && Array.isArray(adminInfo.paymentImages)) {
        for (const imgUrl of adminInfo.paymentImages) {
          if (imgUrl) {
            try {
              const signedUrl = await getSignedImageUrl(imgUrl, supabase)
              payments.push(signedUrl || imgUrl)
            } catch (error) {
              console.warn('Error loading payment image, using original URL:', error)
              payments.push(imgUrl)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in loadImages:', error)
      toast.error('حدث خطأ أثناء تحميل الصور')
    } finally {
      setPassportImages(images)
      setPaymentImages(payments)
      setImagesLoading(false)
    }
  }

  const handleSave = async () => {
    if (!request) return

    setLoading(true)
    try {
      let updatedNotes = adminNotes

      const trimmedResponse = adminResponse.trim()
      const trimmedInitialResponse = initialAdminResponse.trim()
      const hasNewResponse = Boolean(trimmedResponse) && trimmedResponse !== trimmedInitialResponse

      // إضافة الرد الجديد فقط إذا كان مختلفاً عن الرد السابق
      if (hasNewResponse) {
        const responseSection = `\n\n=== رد الإدارة ===\n${trimmedResponse}\nتاريخ الرد: ${formatDate(new Date())}`
        updatedNotes = adminNotes ? adminNotes + responseSection : responseSection
      }

      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
        admin_notes: updatedNotes,
      }

      // تعيين مشرف (اختياري)
      const prevAssignedTo = ((request as any)?.assigned_to || '') as string
      const trimmedAssignedTo = assignedTo.trim()
      const assignedChanged = trimmedAssignedTo !== (prevAssignedTo || '')
      if (assignedChanged) {
        updateData.assigned_to = trimmedAssignedTo || null
        updateData.assigned_at = trimmedAssignedTo ? new Date().toISOString() : null
        const { data: { user: adminUser } } = await supabase.auth.getUser()
        updateData.assigned_by = trimmedAssignedTo && adminUser ? adminUser.id : null
      }

      // تأكيد الدفعة (بوابة الحجز)
      const prevPaymentVerified = Boolean((request as any)?.payment_verified)
      const paymentVerifiedChanged = paymentVerified !== prevPaymentVerified
      if (paymentVerifiedChanged) {
        updateData.payment_verified = paymentVerified
        updateData.payment_verified_at = paymentVerified ? new Date().toISOString() : null
        const { data: { user: adminUser } } = await supabase.auth.getUser()
        updateData.payment_verified_by = paymentVerified && adminUser ? adminUser.id : null
      }

      if (status === 'rejected' && rejectionReason) {
        updateData.rejection_reason = rejectionReason
      } else if (status !== 'rejected') {
        updateData.rejection_reason = null
      }

      const { error } = await supabase
        .from('visit_requests')
        .update(updateData)
        .eq('id', request.id)

      if (error) throw error

      // إنشاء إشعارات حسب الحالة
      try {
        const oldStatus = request.status
        if (oldStatus !== status) {
          // إشعار عند تغيير الحالة إلى "قيد المراجعة"
          if (status === 'under_review' && oldStatus !== 'under_review') {
            console.log('Sending under review notification to user...')
            await notifyRequestUnderReview(request.user_id, request.id, request.visitor_name)
            console.log('Under review notification sent successfully')
          }
          
          // إشعار عند الموافقة
          if (status === 'approved') {
            console.log('Sending request approval notification to user...')
            const notifyId = await notifyRequestApproved(request.user_id, request.id, request.visitor_name)
            if (!notifyId) {
              // غالباً RLS/SQL للإشعارات غير مُفعل في Supabase، نوضح للإدمن بدل الفشل الصامت
              toast.error('تعذر إرسال إشعار الموافقة للمستخدم. يرجى تفعيل نظام الإشعارات في Supabase (notifications + create_notification).')
            }
            console.log('Request approval notification sent successfully')
            
            // إشعار للإدمن (تأكيد الموافقة)
            const { data: { user: adminUser } } = await supabase.auth.getUser()
            if (adminUser) {
              const { data: adminProfile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('user_id', adminUser.id)
                .single()
              
              const adminName = adminProfile?.full_name || 'الإدارة'
              await notifyAllAdmins({
                title: 'تم الموافقة على طلب',
                message: `تم الموافقة على طلب ${request.visitor_name} من قبل ${adminName}.`,
                type: 'success',
                relatedType: 'request',
                relatedId: request.id,
              })
            }
          } 
          // إشعار عند الرفض
          else if (status === 'rejected') {
            console.log('Sending request rejection notification to user...')
            await notifyRequestRejected(request.user_id, request.id, request.visitor_name, rejectionReason || undefined)
            console.log('Request rejection notification sent successfully')
            
            // إشعار للإدمن (تأكيد الرفض)
            const { data: { user: adminUser } } = await supabase.auth.getUser()
            if (adminUser) {
              const { data: adminProfile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('user_id', adminUser.id)
                .single()
              
              const adminName = adminProfile?.full_name || 'الإدارة'
              await notifyAllAdmins({
                title: 'تم رفض طلب',
                message: `تم رفض طلب ${request.visitor_name} من قبل ${adminName}.${rejectionReason ? ` السبب: ${rejectionReason}` : ''}`,
                type: 'error',
                relatedType: 'request',
                relatedId: request.id,
              })
            }
          }
          // إشعار عند الإكمال
          else if (status === 'completed') {
            console.log('Sending request completed notification to user...')
            await notifyRequestCompleted(request.user_id, request.id, request.visitor_name)
            console.log('Request completed notification sent successfully')
          }
        }

        // إنشاء إشعار عند وجود رد مخصص جديد من الإدارة
        if (hasNewResponse) {
          console.log('Sending custom admin message notification to user...')
          // استخدام الرسالة المخصصة مباشرة
          await notifyCustomMessage(request.user_id, request.id, trimmedResponse)
          console.log('Custom admin message notification sent successfully')
        }

        // إشعار للمشرف عند التعيين/إعادة التعيين
        if (assignedChanged && trimmedAssignedTo) {
          await notifySupervisorAssigned(trimmedAssignedTo, request.id, request.visitor_name)
        }

        // إشعار للمستخدم عند تأكيد الدفعة (فتح الحجز)
        if (paymentVerifiedChanged && paymentVerified) {
          await notifyPaymentVerified(request.user_id, request.id)
        }
      } catch (notifyError) {
        console.error('Error sending notifications:', notifyError)
        // لا نوقف العملية إذا فشل الإشعار
      }

      toast.success('تم تحديث الطلب بنجاح')
      onUpdate()
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء التحديث')
    } finally {
      setLoading(false)
    }
  }

  if (!request) return null

  const adminInfo = parseAdminNotes(request.admin_notes || '')
  const isJordanVisit = request.admin_notes?.includes('خدمة: زيارة الأردن لمدة شهر')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-center justify-between z-10">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">تفاصيل الطلب</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* معلومات المستخدم */}
          {userProfile && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                معلومات المستخدم
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">الاسم:</span>
                  <span className="font-medium text-gray-800 mr-2">{userProfile.full_name || 'غير متوفر'}</span>
                </div>
                {userProfile.phone && (
                  <div>
                    <span className="text-gray-600">الهاتف:</span>
                    <span className="font-medium text-gray-800 mr-2">{userProfile.phone}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* معلومات الطلب */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600" />
              معلومات الطلب
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">اسم الزائر:</span>
                <span className="font-medium text-gray-800 mr-2">{request.visitor_name}</span>
              </div>
              <div>
                <span className="text-gray-600">المدينة:</span>
                <span className="font-medium text-gray-800 mr-2">{request.city}</span>
              </div>
              <div>
                <span className="text-gray-600">تاريخ السفر:</span>
                <span className="font-medium text-gray-800 mr-2">{formatDate(request.travel_date)}</span>
              </div>
              <div>
                <span className="text-gray-600">عدد الأيام:</span>
                <span className="font-medium text-gray-800 mr-2">{request.days_count}</span>
              </div>
            </div>

            {/* معلومات طلب الأردن */}
            {isJordanVisit && adminInfo && (
              <div className="mt-4 pt-4 border-t border-gray-300">
                <h4 className="text-sm font-bold text-gray-700 mb-2">معلومات خاصة بطلب الأردن:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {adminInfo.jordanPhone && (
                    <div>
                      <span className="text-gray-600">الهاتف الأردني:</span>
                      <span className="font-medium text-gray-800 mr-2">{adminInfo.jordanPhone}</span>
                    </div>
                  )}
                  {adminInfo.syrianPhone && (
                    <div>
                      <span className="text-gray-600">الهاتف السوري/واتساب:</span>
                      <span className="font-medium text-gray-800 mr-2">{adminInfo.syrianPhone}</span>
                    </div>
                  )}
                  {adminInfo.purpose && (
                    <div className="sm:col-span-2">
                      <span className="text-gray-600">الغرض:</span>
                      <span className="font-medium text-gray-800 mr-2">{adminInfo.purpose}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* تتبع الرحلة (إدمن) */}
          {request.visit_type === 'visit' && (
            <TripTrackingAdminPanel requestId={request.id} />
          )}

          {/* صور الجوازات */}
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-gray-600" />
              صور الجوازات ({passportImages.length})
            </h3>
            {/* Hint for common storage/RLS misconfig */}
            {!imagesLoading && passportImages.length > 0 && (
              <div className="mb-3 text-xs sm:text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3">
                إذا لم تظهر صور الجوازات هنا بينما تظهر صور الدفعات، فهذا غالباً بسبب صلاحيات Storage (RLS).
                شغّل سكربت <span className="font-mono bg-white px-1 rounded">supabase/ADD_ADMIN_STORAGE_POLICY.sql</span> في Supabase SQL Editor (مع التأكد أن حسابك دوره admin).
              </div>
            )}
            {imagesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="mr-3 text-gray-600">جاري تحميل الصور...</span>
              </div>
            ) : passportImages.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {passportImages.map((img, index) => (
                  <div 
                    key={index} 
                    className="relative aspect-[3/4] rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-all cursor-pointer group"
                    onClick={() => {
                      setSelectedImageIndex(index)
                      setSelectedImageType('passport')
                    }}
                  >
                    <img
                      src={img}
                      alt={`جواز ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        const parent = target.parentElement
                        if (parent) {
                          // محاولة استخدام الرابط الأصلي إذا كان مختلفاً
                          const originalUrl = img.includes('?token=') 
                            ? img.split('?token=')[0] 
                            : img
                          
                          if (target.src !== originalUrl && !originalUrl.includes('?token=')) {
                            target.src = originalUrl
                            return
                          }
                          
                          // إذا فشل أيضاً، اعرض رسالة خطأ
                          target.style.display = 'none'
                          parent.innerHTML = '<div class="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400 text-xs p-2"><p>فشل تحميل الصورة</p><p class="text-[10px] mt-1 break-all text-center">' + originalUrl.substring(0, 30) + '...</p></div>'
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                      <ZoomIn className="w-6 h-6 sm:w-8 sm:h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">لا توجد صور جوازات متاحة</p>
              </div>
            )}
          </div>

          {/* صور الدفعات */}
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-green-600" />
              صور الدفعات ({paymentImages.length})
            </h3>
            {imagesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                <span className="mr-3 text-gray-600">جاري تحميل الصور...</span>
              </div>
            ) : paymentImages.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {paymentImages.map((img, index) => (
                  <div 
                    key={index} 
                    className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-green-500 transition-all cursor-pointer group"
                    onClick={() => {
                      setSelectedImageIndex(index)
                      setSelectedImageType('payment')
                    }}
                  >
                    <img
                      src={img}
                      alt={`دفعة ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        const parent = target.parentElement
                        if (parent) {
                          // محاولة استخدام الرابط الأصلي إذا كان مختلفاً
                          const originalUrl = img.includes('?token=') 
                            ? img.split('?token=')[0] 
                            : img
                          
                          if (target.src !== originalUrl && !originalUrl.includes('?token=')) {
                            target.src = originalUrl
                            return
                          }
                          
                          // إذا فشل أيضاً، اعرض رسالة خطأ
                          target.style.display = 'none'
                          parent.innerHTML = '<div class="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400 text-xs p-2"><p>فشل تحميل الصورة</p><p class="text-[10px] mt-1 break-all text-center">' + originalUrl.substring(0, 30) + '...</p></div>'
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                      <ZoomIn className="w-6 h-6 sm:w-8 sm:h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">لا توجد صور دفعات متاحة</p>
              </div>
            )}
          </div>

          {/* تحديث الحالة */}
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4">تحديث حالة الطلب</h3>
            <div className="space-y-4">
              {/* تعيين المشرف */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label className="block text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  تعيين مشرف للطلب
                </label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base bg-white"
                >
                  <option value="">-- بدون تعيين (الإدارة فقط) --</option>
                  {supervisors.length === 0 ? (
                    <option disabled>لا يوجد مشرفين متاحين</option>
                  ) : (
                    supervisors.map((s) => (
                      <option key={s.user_id} value={s.user_id}>
                        {s.full_name || 'مشرف'} — {s.phone || 'لا يوجد رقم'}
                      </option>
                    ))
                  )}
                </select>
                {assignedTo && (
                  <div className="mt-2 p-2 bg-white border border-green-200 rounded-lg">
                    <p className="text-xs text-gray-700">
                      <span className="font-bold text-green-700">✓ تم التعيين:</span>{' '}
                      {supervisors.find((s) => s.user_id === assignedTo)?.full_name || 'مشرف'}
                    </p>
                  </div>
                )}
                <div className="mt-3 space-y-1 text-[11px] text-gray-700">
                  <p className="font-bold">الصلاحيات التي سيحصل عليها المشرف:</p>
                  <ul className="list-disc list-inside space-y-0.5 mr-2">
                    <li>رؤية وتعديل هذا الطلب فقط</li>
                    <li>تأكيد استلام الدفعة (payment_verified)</li>
                    <li>إدارة ملفات المنتسبين</li>
                  </ul>
                  <p className="mt-2 text-amber-700 font-bold">
                    ⚠️ ملاحظة: المشرف لن يرى الطلبات الأخرى، فقط الطلبات المعيّنة له
                  </p>
                </div>
              </div>

              {/* بوابة الدفع -> فتح الحجز */}
              {(adminInfo?.postApprovalStatus ||
                adminInfo?.guaranteeMethod ||
                adminInfo?.remainingPaymentMethod ||
                adminInfo?.remainingAmountText) && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <p className="text-sm font-extrabold text-gray-900 mb-2">
                    استكمال بعد الموافقة (من المستخدم)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-gray-700">
                    <div className="flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-lg p-2">
                      <span className="text-gray-500">الحالة</span>
                      <span className="font-bold">
                        {adminInfo?.postApprovalStatus || 'غير محدد'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-lg p-2">
                      <span className="text-gray-500">طريقة الكفالة</span>
                      <span className="font-bold truncate">
                        {adminInfo?.guaranteeMethod || 'غير محدد'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-lg p-2">
                      <span className="text-gray-500">طريقة دفع المتبقي</span>
                      <span className="font-bold truncate">
                        {adminInfo?.remainingPaymentMethod || 'غير محدد'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-lg p-2">
                      <span className="text-gray-500">المبلغ المتبقي</span>
                      <span className="font-bold">
                        {adminInfo?.remainingAmountText || (request as any)?.remaining_amount || '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-lg p-2 sm:col-span-2">
                      <span className="text-gray-500">إثبات دفع كليك</span>
                      <span className={`font-bold ${paymentImages.length > 0 ? 'text-green-700' : 'text-gray-500'}`}>
                        {paymentImages.length > 0 ? `موجود (${paymentImages.length})` : 'غير موجود'}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-gray-600 leading-relaxed">
                    بعد مراجعة هذه البيانات يمكنك تفعيل "تم تأكيد الدفعة" لفتح الحجز للمستخدم.
                  </p>
                </div>
              )}

              <div className="flex items-start gap-3 p-3 rounded-lg bg-white border border-yellow-200">
                <input
                  id="paymentVerified"
                  type="checkbox"
                  checked={paymentVerified}
                  onChange={(e) => setPaymentVerified(e.target.checked)}
                  className="mt-1"
                />
                <div className="min-w-0">
                  <label htmlFor="paymentVerified" className="block text-sm font-bold text-gray-800">
                    تم تأكيد الدفعة (فتح الحجز للمستخدم)
                  </label>
                  <p className="text-xs text-gray-600 mt-0.5">
                    عند التفعيل: يظهر للمستخدم زر “حجز موعد الرحلة”.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الحالة</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                >
                  <option value="pending">جديد / مستلم</option>
                  <option value="under_review">قيد المراجعة</option>
                  <option value="approved">مقبول</option>
                  <option value="rejected">مرفوض</option>
                  <option value="completed">مكتمل</option>
                </select>
              </div>

              {status === 'rejected' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">سبب الرفض</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                    placeholder="أدخل سبب الرفض..."
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات الإدارة</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  placeholder="أدخل ملاحظات إضافية..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  رد الإدارة (سيظهر للمستخدم)
                </label>
                <textarea
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  placeholder="اكتب ردك للمستخدم هنا... سيظهر هذا الرد في لوحة المستخدم"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 sm:p-6 flex flex-col sm:flex-row justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm sm:text-base font-medium"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 text-sm sm:text-base font-medium disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                حفظ التغييرات
              </>
            )}
          </button>
        </div>
      </div>

      {/* Image Lightbox */}
      {selectedImageIndex !== null && selectedImageType && (
        <div 
          className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4"
          onClick={() => {
            setSelectedImageIndex(null)
            setSelectedImageType(null)
          }}
        >
          <button
            onClick={() => {
              setSelectedImageIndex(null)
              setSelectedImageType(null)
            }}
            className="absolute top-4 left-4 text-white hover:text-gray-300 z-10 bg-black/50 rounded-full p-2"
          >
            <X className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>
          
          {selectedImageType === 'passport' && selectedImageIndex < passportImages.length && (
            <>
              {selectedImageIndex > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedImageIndex(selectedImageIndex - 1)
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-10 bg-black/50 rounded-full p-2 sm:p-3"
                >
                  <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
                </button>
              )}
              
              {selectedImageIndex < passportImages.length - 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedImageIndex(selectedImageIndex + 1)
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-10 bg-black/50 rounded-full p-2 sm:p-3"
                >
                  <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
                </button>
              )}

              <div className="relative w-full h-full max-w-5xl max-h-[90vh] flex items-center justify-center">
                <img
                  src={passportImages[selectedImageIndex]}
                  alt={`جواز ${selectedImageIndex + 1}`}
                  className="max-w-full max-h-full object-contain"
                  style={{ maxHeight: '90vh' }}
                  onClick={(e) => e.stopPropagation()}
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

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm sm:text-base bg-black/50 px-4 py-2 rounded-full">
                {selectedImageIndex + 1} / {passportImages.length}
              </div>
            </>
          )}

          {selectedImageType === 'payment' && selectedImageIndex < paymentImages.length && (
            <>
              {selectedImageIndex > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedImageIndex(selectedImageIndex - 1)
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-10 bg-black/50 rounded-full p-2 sm:p-3"
                >
                  <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
                </button>
              )}
              
              {selectedImageIndex < paymentImages.length - 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedImageIndex(selectedImageIndex + 1)
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-10 bg-black/50 rounded-full p-2 sm:p-3"
                >
                  <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
                </button>
              )}

              <div className="relative w-full h-full max-w-5xl max-h-[90vh] flex items-center justify-center">
                <img
                  src={paymentImages[selectedImageIndex]}
                  alt={`دفعة ${selectedImageIndex + 1}`}
                  className="max-w-full max-h-full object-contain"
                  style={{ maxHeight: '90vh' }}
                  onClick={(e) => e.stopPropagation()}
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

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm sm:text-base bg-black/50 px-4 py-2 rounded-full">
                {selectedImageIndex + 1} / {paymentImages.length}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}


