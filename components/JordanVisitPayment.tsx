'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Upload, Save, DollarSign, Phone, MessageCircle, CheckCircle, X, Copy } from 'lucide-react'
import Link from 'next/link'
import { createNotification, notifyAdminNewRequest, notifyAllAdmins } from '@/lib/notifications'
import { getSignedImageUrl } from './request-details/utils'

interface Person {
  name: string
  passportImages: string[]
}

export default function JordanVisitPayment({ requestId, userId }: { requestId: string; userId: string }) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [savingImages, setSavingImages] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [request, setRequest] = useState<any>(null)
  const [persons, setPersons] = useState<Person[]>([])
  const [paymentImages, setPaymentImages] = useState<File[]>([])
  const [paymentPreviews, setPaymentPreviews] = useState<string[]>([])
  const [paymentSaved, setPaymentSaved] = useState(false)
  const [savedPaymentUrls, setSavedPaymentUrls] = useState<string[]>([])
  const [signedSavedPaymentUrls, setSignedSavedPaymentUrls] = useState<{ [key: string]: string }>({})

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

  useEffect(() => {
    loadRequest()
    // Scroll to top when page loads
    window.scrollTo(0, 0)
  }, [requestId])

  // تحويل روابط صور الدفعات المحفوظة إلى signed URLs (لأن bucket passports خاص)
  useEffect(() => {
    const convertSavedPaymentsToSigned = async () => {
      if (!savedPaymentUrls || savedPaymentUrls.length === 0) {
        setSignedSavedPaymentUrls({})
        return
      }

      const nextMap: { [key: string]: string } = {}
      for (const u of savedPaymentUrls) {
        try {
          nextMap[u] = await getSignedImageUrl(u, supabase)
        } catch {
          nextMap[u] = u
        }
      }
      setSignedSavedPaymentUrls(nextMap)
    }

    convertSavedPaymentsToSigned()
  }, [savedPaymentUrls, supabase])

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
        toast.error('الطلب غير موجود أو ليس لديك صلاحية لعرضه')
        router.push('/dashboard')
        return
      }
      setRequest(data)

      // اكتشاف هل تم حفظ صور الدفعات سابقاً
      const notes = (data.admin_notes || '') as string
      const match = notes.match(/صور الدفعات:\s*([^\n]+)/)
      const urls = match?.[1]
        ? match[1].split(',').map(s => s.trim()).filter(Boolean)
        : []
      setSavedPaymentUrls(urls)
      setPaymentSaved(Boolean(data.deposit_paid) || urls.length > 0)
      
      // تحميل بيانات الأشخاص
      // في النظام: visitor_name هو الزائر الرئيسي، companions_data هم المرافقون فقط
      const list: Person[] = [{
        name: data.visitor_name,
        passportImages: data.passport_image_url ? [data.passport_image_url] : []
      }]
      if (data.companions_data && Array.isArray(data.companions_data) && data.companions_data.length > 0) {
        list.push(...data.companions_data)
      }
      setPersons(list)
    } catch (error: any) {
      toast.error('حدث خطأ أثناء تحميل البيانات')
      router.push('/dashboard')
    }
  }

  const handlePaymentImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`صورة ${file.name} أكبر من 5 ميجابايت`)
        return false
      }
      return true
    })

    const newImages = [...paymentImages, ...validFiles]
    setPaymentImages(newImages)

    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPaymentPreviews(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })

    // يسمح بإعادة اختيار نفس الملف مرة أخرى
    e.currentTarget.value = ''
  }

  const removePaymentImage = (index: number) => {
    setPaymentImages(paymentImages.filter((_, i) => i !== index))
    setPaymentPreviews(paymentPreviews.filter((_, i) => i !== index))
  }

  const uploadPaymentImages = async (files: File[]): Promise<string[]> => {
    const uploadedUrls: string[] = []
    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${userId}/payments/${Date.now()}_${Math.random()}.${fileExt}`
        const { data, error } = await supabase.storage
          .from('passports')
          .upload(fileName, file)
        if (error) throw error
        const { data: { publicUrl } } = supabase.storage
          .from('passports')
          .getPublicUrl(fileName)
        uploadedUrls.push(publicUrl)
      } catch (error) {
        console.error('Error uploading payment image:', error)
      }
    }
    return uploadedUrls
  }

  const handleSavePaymentImages = async () => {
    if (paymentImages.length === 0) {
      toast.error('يرجى رفع صور الدفعات')
      return
    }

    setSavingImages(true)

    try {
      const paymentImageUrls = await uploadPaymentImages(paymentImages)
      const totalAmount = persons.length * 10 // 10 دنانير لكل شخص
      const currentNotes = (request?.admin_notes || '') as string

      const combinedUrls = [...savedPaymentUrls, ...paymentImageUrls].filter(Boolean)
      const notesWithoutOldLine = currentNotes.replace(/\n*صور الدفعات:\s*[^\n]*\n*/g, '\n')
      const nextNotes = `${notesWithoutOldLine.trim()}\n\nصور الدفعات: ${combinedUrls.join(', ')}`.trim()

      const { error } = await supabase
        .from('visit_requests')
        .update({
          deposit_paid: true,
          deposit_amount: totalAmount,
          total_amount: totalAmount,
          // لا نزيل [DRAFT] هنا — الإرسال يتم بزر منفصل
          admin_notes: nextNotes,
        })
        .eq('id', requestId)

      if (error) throw error

      setSavedPaymentUrls(combinedUrls)
      setPaymentSaved(true)
      setPaymentImages([])
      setPaymentPreviews([])
      setRequest((prev: any) => (prev ? { ...prev, admin_notes: nextNotes, deposit_paid: true } : prev))

      // إشعار للإدمن: تم رفع صور الدفعات (لكن لم يتم إرسال الطلب بعد)
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', userId)
          .maybeSingle()
        const userName = profile?.full_name || 'مستخدم'

        await notifyAllAdmins({
          title: 'تم رفع صور الدفعات',
          message: `قام ${userName} برفع صور دفعات لطلب ${request?.visitor_name || 'زائر'} (بانتظار الضغط على زر إرسال الطلب).`,
          type: 'warning',
          relatedType: 'request',
          relatedId: requestId,
        })

        // إشعار للمشرف المعيّن (إن وجد)
        const assignedTo = (request as any)?.assigned_to as string | null | undefined
        if (assignedTo) {
          await createNotification({
            userId: assignedTo,
            title: 'تم رفع صور الدفعة',
            message: `قام ${userName} برفع صور الدفعة لطلب ${request?.visitor_name || 'زائر'}. يرجى المتابعة والتأكد.`,
            type: 'warning',
            relatedType: 'request',
            relatedId: requestId,
          })
        }
      } catch (notifyErr) {
        console.error('Notification error after saving payment images:', notifyErr)
      }

      toast.success('تم حفظ صور الدفعات بنجاح. يمكنك الآن إرسال الطلب.')
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء رفع صور الدفعات')
    } finally {
      setSavingImages(false)
    }
  }

  const handleSubmitRequest = async () => {
    if (!paymentSaved) {
      toast.error('يرجى حفظ صور الدفعات أولاً')
      return
    }

    setSubmitting(true)
    try {
      const totalAmount = persons.length * 10
      const currentNotes = (request?.admin_notes || '') as string
      const cleanedNotes = currentNotes.replace(/^\[DRAFT\]\s*\n?/i, '')

      const { error } = await supabase
        .from('visit_requests')
        .update({
          status: 'pending',
          deposit_paid: true,
          deposit_amount: totalAmount,
          total_amount: totalAmount,
          admin_notes: cleanedNotes,
        })
        .eq('id', requestId)

      if (error) throw error

      // إشعار للمستخدم: تم إرسال الطلب + (معلومة أنه قيد الإجراء بعد الاستلام)
      try {
        await createNotification({
          userId,
          title: 'تم استلام الطلب',
          message: 'تم استلام طلبك بنجاح. سيتم مراجعته من قبل الإدارة وسيتم إشعارك عند تحديث الحالة.',
          type: 'info',
          relatedType: 'request',
          relatedId: requestId,
        })

        // إشعار للإدمن: طلب جديد جاهز للمراجعة
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', userId)
          .maybeSingle()
        const userName = profile?.full_name || 'مستخدم'

        await notifyAdminNewRequest(requestId, request?.visitor_name || 'زائر', userName, request?.city || '')

        // إشعار للمشرف المعيّن (إن وجد) أن الطلب تم إرساله مع الدفعة
        const assignedTo = (request as any)?.assigned_to as string | null | undefined
        if (assignedTo) {
          await createNotification({
            userId: assignedTo,
            title: 'تم إرسال الطلب مع الدفعة',
            message: `تم إرسال الطلب ${request?.visitor_name || 'زائر'} بعد رفع الدفعة. يرجى المتابعة.`,
            type: 'info',
            relatedType: 'request',
            relatedId: requestId,
          })
        }
      } catch (notifyErr) {
        console.error('Notification error after submit:', notifyErr)
      }

      toast.success('تم إرسال الطلب بنجاح! سيتم الرد على طلبك قريباً.')
      router.push('/dashboard')
      router.refresh()
    } catch (e: any) {
      toast.error(e?.message || 'حدث خطأ أثناء إرسال الطلب')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteSavedPaymentImage = async (index: number) => {
    if (!savedPaymentUrls[index]) return
    if (!confirm('هل تريد حذف هذه الصورة من صور الدفعات؟')) return

    try {
      setSavingImages(true)
      const nextUrls = savedPaymentUrls.filter((_, i) => i !== index)
      const currentNotes = (request?.admin_notes || '') as string
      const notesWithoutOldLine = currentNotes.replace(/\n*صور الدفعات:\s*[^\n]*\n*/g, '\n')
      const nextNotes =
        nextUrls.length > 0
          ? `${notesWithoutOldLine.trim()}\n\nصور الدفعات: ${nextUrls.join(', ')}`.trim()
          : notesWithoutOldLine.trim()

      const totalAmount = persons.length * 10
      const shouldMarkPaid = nextUrls.length > 0

      const { error } = await supabase
        .from('visit_requests')
        .update({
          deposit_paid: shouldMarkPaid,
          deposit_amount: shouldMarkPaid ? totalAmount : null,
          total_amount: shouldMarkPaid ? totalAmount : null,
          admin_notes: nextNotes,
        })
        .eq('id', requestId)

      if (error) throw error

      setSavedPaymentUrls(nextUrls)
      setPaymentSaved(shouldMarkPaid)
      setRequest((prev: any) => (prev ? { ...prev, admin_notes: nextNotes, deposit_paid: shouldMarkPaid } : prev))
      toast.success('تم حذف الصورة')
    } catch (e: any) {
      console.error('Delete saved payment image error:', e)
      toast.error(e?.message || 'تعذر حذف الصورة')
    } finally {
      setSavingImages(false)
    }
  }

  if (!request) {
    return (
      <div className="page">
        <div className="page-container">
          <div className="max-w-3xl mx-auto">
            <div className="card flex items-center justify-center">
              <div className="text-center py-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">جاري التحميل...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const totalAmount = persons.length * 10 // 10 دنانير لكل شخص

  return (
    <div className="page">
      <div className="page-container">
        <div className="max-w-3xl mx-auto">
          <div className="card">
            {/* Header */}
            <div className="text-center mb-6 sm:mb-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
              </div>
              <h1 className="font-bold text-gray-800 mb-2">الدفع والرسوم</h1>
              <p className="text-sm sm:text-base text-gray-600">يرجى رفع صور الدفعات للمتابعة</p>
            </div>

          {/* قائمة الأشخاص */}
          <div className="mb-6 sm:mb-8">
            <h2 className="font-bold text-gray-800 mb-4">الأشخاص المسجلين</h2>
            <div className="space-y-3 sm:space-y-4">
              {persons.map((person, index) => (
                <div key={index} className="card-soft">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-sm sm:text-base">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm sm:text-base text-gray-800">{person.name}</p>
                        <p className="text-xs sm:text-sm text-gray-600">10 دنانير</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-lg sm:text-xl font-bold text-green-600">10 د.أ</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* إجمالي المبلغ */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 sm:p-6 rounded-lg mb-6 sm:mb-8 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm sm:text-base text-gray-600 mb-1">عدد الأشخاص</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-800">{persons.length} شخص</p>
              </div>
              <div className="text-left">
                <p className="text-sm sm:text-base text-gray-600 mb-1">المبلغ الإجمالي</p>
                <p className="text-3xl sm:text-4xl font-bold text-green-600">{totalAmount} د.أ</p>
              </div>
            </div>
            <div className="mt-3 text-xs sm:text-sm text-gray-600">
              رسوم تقديم الطلب: <span className="font-bold text-gray-800">10 دنانير لكل شخص</span>
            </div>
          </div>

          {/* معلومات الدفع */}
          <div className="card-soft mb-6 sm:mb-8">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-sm sm:text-base font-bold text-gray-800">معلومات الدفع</h3>
              <span className="text-xs text-gray-500">اضغط للنسخ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
                <p className="text-xs sm:text-sm font-bold text-gray-800 mb-1">البنك الإسلامي الأردني</p>
                <p className="text-xs text-gray-600 mb-2">باسم: محمد محمد محمد (تجريبي)</p>
                <div className="flex items-center justify-between gap-2">
                  <a href="tel:077777777777" className="font-mono font-bold text-blue-700 text-sm sm:text-base ltr">
                    077777777777
                  </a>
                  <button
                    type="button"
                    onClick={() => copyText('077777777777', 'تم نسخ رقم الدفع')}
                    className="btn-secondary px-3 py-2 text-xs sm:text-sm"
                    title="نسخ الرقم"
                    aria-label="نسخ الرقم"
                  >
                    <Copy className="w-4 h-4" />
                    نسخ
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
                <p className="text-xs sm:text-sm font-bold text-gray-800 mb-1">محفظة زين كاش</p>
                <p className="text-xs text-gray-600 mb-2">حمادة حمادة حمادة</p>
                <div className="flex items-center justify-between gap-2">
                  <a href="tel:07979797979" className="font-mono font-bold text-blue-700 text-sm sm:text-base ltr">
                    07979797979
                  </a>
                  <button
                    type="button"
                    onClick={() => copyText('07979797979', 'تم نسخ رقم الدفع')}
                    className="btn-secondary px-3 py-2 text-xs sm:text-sm"
                    title="نسخ الرقم"
                    aria-label="نسخ الرقم"
                  >
                    <Copy className="w-4 h-4" />
                    نسخ
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* رفع صور الدفعات */}
          <div className="mb-6 sm:mb-8">
            <h2 className="font-bold text-gray-800 mb-4">رفع صور الدفعات *</h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-green-400 transition">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePaymentImageUpload}
                className="hidden"
                id="payment-upload"
              />
              <label
                htmlFor="payment-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 mb-2" />
                <span className="text-xs sm:text-sm text-gray-600 mb-1">
                  {paymentImages.length > 0 
                    ? `${paymentImages.length} صورة` 
                    : 'اضغط لرفع صور الدفعات'}
                </span>
                <span className="text-xs text-gray-500">الحجم الأقصى: 5 ميجابايت لكل صورة</span>
              </label>
            </div>

            {/* صور الدفعات المحفوظة (بعد الحفظ) */}
            {savedPaymentUrls.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-sm sm:text-base font-bold text-gray-800">
                    صور الدفعات المحفوظة
                  </p>
                  <span className="text-xs sm:text-sm text-green-700 font-semibold">
                    تم الحفظ ✓
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                  {savedPaymentUrls.map((url, index) => (
                    <div key={`${url}-${index}`} className="relative group">
                      <a href={signedSavedPaymentUrls[url] || url} target="_blank" rel="noreferrer" title="فتح الصورة">
                        <img
                          src={signedSavedPaymentUrls[url] || url}
                          alt={`دفعة محفوظة ${index + 1}`}
                          className="w-full h-24 sm:h-32 object-cover rounded-lg border border-gray-300"
                        />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteSavedPaymentImage(index)}
                        disabled={savingImages || submitting}
                        className="absolute top-1 left-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                        title="حذف الصورة"
                        aria-label="حذف الصورة"
                      >
                        <X className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs sm:text-sm text-gray-500">
                  يمكنك حذف صورة خاطئة ثم رفع صورة جديدة بدلها.
                </p>
              </div>
            )}

            {/* معاينة صور الدفعات */}
            {paymentPreviews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 mt-4">
                {paymentPreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`دفعة ${index + 1}`}
                      className="w-full h-24 sm:h-32 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => removePaymentImage(index)}
                      className="absolute top-1 left-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* معلومات التواصل */}
          <div className="bg-blue-50 p-4 sm:p-5 rounded-lg mb-6 sm:mb-8 border border-blue-100">
            <h2 className="font-bold text-gray-800 mb-3 sm:mb-4">معلومات التواصل</h2>
            <div className="space-y-2 sm:space-y-3">
              <a 
                href="tel:0798905595" 
                className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white rounded-lg hover:bg-blue-100 transition"
              >
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                <span className="text-xs sm:text-sm font-semibold text-gray-800">0798905595</span>
              </a>
              <a 
                href="https://wa.me/962798905595" 
                target="_blank"
                className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white rounded-lg hover:bg-green-100 transition"
              >
                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                <span className="text-xs sm:text-sm font-semibold text-gray-800">واتساب: 00962798905595</span>
              </a>
            </div>
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleSavePaymentImages}
              disabled={savingImages || paymentImages.length === 0}
              className="btn flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-green-600 text-white hover:bg-green-700 text-sm sm:text-base"
            >
              <Save className="w-4 h-4 sm:w-5 sm:h-5" />
              {savingImages ? 'جاري الحفظ...' : 'حفظ صور الدفعات'}
            </button>
            <button
              onClick={handleSubmitRequest}
              disabled={submitting || !paymentSaved}
              className="btn-primary flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base"
            >
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
            </button>
            <Link
              href="/dashboard"
              className="btn-secondary flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base"
            >
              العودة للوحة التحكم
            </Link>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-3">
            - أولاً احفظ صور الدفعات، ثم اضغط <span className="font-semibold">إرسال الطلب</span> ليصل للإدارة وتبدأ المتابعة.
          </p>
          </div>
        </div>
      </div>
    </div>
  )
}




