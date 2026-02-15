'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { ArrowLeft, Calendar, Upload, Trash2, X, Plus, User, Phone, MessageCircle, Lock, CheckCircle } from 'lucide-react'
import { createNotification, notifyAdminNewRequest } from '@/lib/notifications'

const DEPARTURE_CITIES = [
  'الشام', 'درعا', 'حلب', 'حمص', 'حماة', 'اللاذقية', 'طرطوس', 
  'دير الزور', 'الحسكة', 'الرقة', 'إدلب', 'السويداء', 'القنيطرة', 'أخرى'
]

const DEFAULT_PURPOSE = 'زيارات الاقارب ( سياحة )'

interface Person {
  id: string
  name: string
  passportImages: File[]
  passportPreviews: string[]
}

export default function JordanVisitForm() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const [accountName, setAccountName] = useState<string>('')
  const [requestId, setRequestId] = useState<string | null>(null)
  const [requestConfirmed, setRequestConfirmed] = useState(false)
  const [persons, setPersons] = useState<Person[]>([
    { id: '1', name: '', passportImages: [], passportPreviews: [] }
  ])

  const [formData, setFormData] = useState({
    jordanPhone: '',
    whatsappPhone: '',
    departureCity: '',
    otherCity: '',
  })

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/login')
          return
        }

        // قد تكون أعمدة jordan_phone/whatsapp_phone غير موجودة إذا لم يتم تنفيذ سكربت SQL بعد
        let profile: any = null
        let error: any = null

        ;({ data: profile, error } = await supabase
          .from('profiles')
          .select('full_name, phone, jordan_phone, whatsapp_phone')
          .eq('user_id', user.id)
          .maybeSingle())

        if (error?.code === '42703') {
          // fallback: الأعمدة غير موجودة
          console.warn('Profile contact columns not found yet; falling back to base fields.')
          ;({ data: profile, error } = await supabase
            .from('profiles')
            .select('full_name, phone')
            .eq('user_id', user.id)
            .maybeSingle())
        }

        if (error) {
          console.error('Error loading profile:', error)
        }

        const name = profile?.full_name || user.email?.split('@')[0] || ''
        setAccountName(name)

        // Prefill phones from profile (if available)
        // - jordanPhone: prefer jordan_phone, fallback to account phone (phone used at signup)
        // - whatsappPhone: optional field (Syrian WhatsApp/phone)
        setFormData(prev => ({
          ...prev,
          jordanPhone: prev.jordanPhone || profile?.jordan_phone || profile?.phone || '',
          whatsappPhone: prev.whatsappPhone || profile?.whatsapp_phone || '',
        }))
      } catch (e) {
        console.error('Error loading profile:', e)
      } finally {
        setProfileLoading(false)
      }
    }

    loadProfile()
  }, [router, supabase])


  const addPerson = () => {
    if (persons.length >= 10) {
      toast.error('الحد الأقصى 10 أشخاص')
      return
    }
    setPersons([...persons, { 
      id: Date.now().toString(), 
      name: '', 
      passportImages: [], 
      passportPreviews: [] 
    }])
  }

  const removePerson = (personId: string) => {
    if (persons.length === 1) {
      toast.error('يجب أن يكون هناك شخص واحد على الأقل')
      return
    }
    setPersons(persons.filter(p => p.id !== personId))
  }

  const updatePersonName = (personId: string, name: string) => {
    setPersons(persons.map(p => 
      p.id === personId ? { ...p, name } : p
    ))
  }

  const handleImageUpload = (personId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const person = persons.find(p => p.id === personId)
    if (!person) return

    const totalImages = person.passportImages.length + files.length
    if (totalImages > 10) {
      toast.error('الحد الأقصى 10 صور لكل شخص')
      return
    }

    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`صورة ${file.name} أكبر من 5 ميجابايت`)
        return false
      }
      return true
    })

    const newImages = [...person.passportImages, ...validFiles]
    const newPreviews = [...person.passportPreviews]

    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        newPreviews.push(reader.result as string)
        setPersons(persons.map(p => 
          p.id === personId 
            ? { ...p, passportImages: newImages, passportPreviews: newPreviews }
            : p
        ))
      }
      reader.readAsDataURL(file)
    })

    setPersons(persons.map(p => 
      p.id === personId 
        ? { ...p, passportImages: newImages }
        : p
    ))
  }

  const removeImage = (personId: string, imageIndex: number) => {
    setPersons(persons.map(p => {
      if (p.id === personId) {
        const newImages = p.passportImages.filter((_, i) => i !== imageIndex)
        const newPreviews = p.passportPreviews.filter((_, i) => i !== imageIndex)
        return { ...p, passportImages: newImages, passportPreviews: newPreviews }
      }
      return p
    }))
  }

  const uploadPassportImages = async (files: File[], userId: string): Promise<string[]> => {
    const uploadedUrls: string[] = []
    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${userId}/${Date.now()}_${Math.random()}.${fileExt}`
        const { data, error } = await supabase.storage
          .from('passports')
          .upload(fileName, file)
        if (error) throw error
        const { data: { publicUrl } } = supabase.storage
          .from('passports')
          .getPublicUrl(fileName)
        uploadedUrls.push(publicUrl)
      } catch (error) {
        console.error('Error uploading image:', error)
      }
    }
    return uploadedUrls
  }

  const handleSave = async () => {
    // التحقق من البيانات الأساسية فقط
    if (!formData.jordanPhone || !formData.departureCity) {
      toast.error('يرجى إدخال رقم الهاتف الأردني ومكان الانطلاق')
      return
    }

    if (formData.departureCity === 'أخرى' && !formData.otherCity) {
      toast.error('يرجى إدخال اسم المدينة')
      return
    }

    // التحقق من الأشخاص والصور
    for (const person of persons) {
      if (!person.name) {
        toast.error('يرجى إدخال اسم لكل شخص')
        return
      }
      if (person.passportImages.length === 0) {
        toast.error(`يرجى إضافة صورة جواز على الأقل لـ ${person.name || 'الشخص'}`)
        return
      }
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const finalDepartureCity = formData.departureCity === 'أخرى' 
        ? formData.otherCity 
        : formData.departureCity

      // حفظ أرقام التواصل في حساب المستخدم (إن أمكن)
      try {
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({
            jordan_phone: formData.jordanPhone,
            whatsapp_phone: formData.whatsappPhone || null,
          })
          .eq('user_id', user.id)
        if (updateErr?.code === '42703') {
          // الأعمدة غير موجودة بعد - تجاهل
          console.warn('Profile contact columns not found yet; skipping profile update.')
        } else if (updateErr) {
          console.warn('Could not update profile contact fields:', updateErr)
        }
      } catch (profileUpdateErr) {
        console.warn('Could not update profile contact fields (may require DB columns):', profileUpdateErr)
      }

      // رفع صور جميع الأشخاص
      const personsData = await Promise.all(
        persons.map(async (person) => {
          const imageUrls = await uploadPassportImages(person.passportImages, user.id)
          return {
            name: person.name,
            passportImages: imageUrls,
          }
        })
      )

      // حفظ الطلب مباشرة (بدون Draft)
      const primary = personsData[0]
      const primaryVisitorName = primary?.name || 'زائر'
      const companionsOnly = personsData.slice(1) // المرافقين فقط (بدون الزائر الرئيسي)

      const { data: requestData, error } = await supabase
        .from('visit_requests')
        .insert({
          user_id: user.id,
          visitor_name: primaryVisitorName,
          city: finalDepartureCity,
          passport_image_url: primary?.passportImages?.[0] || null,
          status: 'pending',
          visit_type: 'visit',
          travel_date: new Date().toISOString().split('T')[0],
          days_count: 30,
          nationality: 'سوري',
          passport_number: 'N/A',
          passport_expiry: new Date().toISOString().split('T')[0],
          companions_count: companionsOnly.length,
          companions_data: companionsOnly,
          admin_notes: `خدمة: زيارة الأردن لمدة شهر\nاسم الحساب: ${accountName || 'غير محدد'}\nالهاتف الأردني: ${formData.jordanPhone}\nواتساب سوري (اختياري): ${formData.whatsappPhone || 'غير مدخل'}\nالغرض: ${DEFAULT_PURPOSE}`,
        })
        .select()
        .single()

      if (error) throw error

      // تعيين تلقائي للمشرف المخصص لخدمة "زيارة الأردن"
      try {
        const { autoAssignSupervisorForService } = await import('@/lib/supervisor-auto-assign')
        await autoAssignSupervisorForService('visit', requestData.id)
      } catch (assignError) {
        console.error('Error auto-assigning supervisor:', assignError)
        // لا نرمي خطأ هنا، فقط نسجله
      }

      // إرسال إشعارات بشكل غير متزامن (لا ننتظرها)
      setTimeout(async () => {
        try {
          await notifyAdminNewRequest(
            requestData.id,
            primaryVisitorName,
            accountName || 'مستخدم',
            finalDepartureCity
          )
        } catch (notifyError) {
          console.error('Error sending admin notification:', notifyError)
        }

        try {
          await createNotification({
            userId: user.id,
            title: 'تم إرسال الطلب بنجاح',
            message: `تم إرسال طلب الزيارة لـ ${primaryVisitorName} بنجاح. يرجى التواصل مع الموظف المسؤول لدفع الرسوم.`,
            type: 'success',
            relatedType: 'request',
            relatedId: requestData.id,
          })
        } catch (notifyError) {
          console.error('Error sending user notification:', notifyError)
        }
      }, 100)

      toast.success('تم حفظ الطلب بنجاح! يرجى التواصل مع الموظف المسؤول لدفع الرسوم.')
      
      // حفظ requestId في state لإظهار زر واتساب (بعد التمرير للأعلى)
      setTimeout(() => {
        setRequestId(requestData.id)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }, 100)
    } catch (error: any) {
      console.error('Error saving request:', error)
      // تجاهل أخطاء AbortError (عادة تكون بسبب إلغاء الطلب)
      if (error?.name !== 'AbortError' && error?.message !== 'signal is aborted without reason') {
        toast.error(error.message || 'حدث خطأ أثناء حفظ الطلب')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmViaWhatsApp = async () => {
    if (!requestId || loading) return

    try {
      setLoading(true)
      
      // الحصول على بيانات المستخدم أولاً
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) {
        toast.error('يجب تسجيل الدخول أولاً')
        router.push('/auth/login')
        return
      }

      // جلب بيانات الطلب أولاً
      const { data: request, error: requestError } = await supabase
        .from('visit_requests')
        .select('visitor_name, city')
        .eq('id', requestId)
        .eq('user_id', user.id)
        .single()

      if (requestError) throw requestError
      if (!request) {
        toast.error('الطلب غير موجود')
        return
      }

      // تحديث الطلب - إزالة Draft وإرسال للإدمن
      const { error: updateError } = await supabase
        .from('visit_requests')
        .update({
          deposit_paid: true,
          deposit_amount: persons.length * 10,
          total_amount: persons.length * 10,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .eq('user_id', user.id)

      if (updateError) throw updateError

      // إنشاء رسالة واتساب
      const message = `مرحباً، أريد تأكيد طلب الزيارة رقم ${requestId}\nالزائر: ${request.visitor_name || ''}\nمكان الانطلاق: ${request.city || ''}\nعدد الأشخاص: ${persons.length}\nتم إرسال الطلب عبر المنصة.`
      
      const whatsappUrl = `https://wa.me/962798905595?text=${encodeURIComponent(message)}`
      window.open(whatsappUrl, '_blank')

      setRequestConfirmed(true)
      toast.success('تم فتح واتساب. يرجى إرسال الرسالة لتأكيد الطلب.')

      // إرسال إشعار للإدمن (بشكل غير متزامن)
      setTimeout(async () => {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', user.id)
            .maybeSingle()
          const userName = profile?.full_name || 'مستخدم'

          await notifyAdminNewRequest(
            requestId,
            request.visitor_name || 'زائر',
            userName,
            request.city || ''
          )
        } catch (notifyError) {
          console.error('Error sending admin notification:', notifyError)
          // لا نعرض خطأ للمستخدم هنا
        }
      }, 500)

      // الانتقال إلى لوحة التحكم بعد ثانيتين
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 2000)
    } catch (error: any) {
      console.error('Error confirming request:', error)
      // تجاهل أخطاء AbortError (عادة تكون بسبب إلغاء الطلب)
      if (error?.name !== 'AbortError' && error?.message !== 'signal is aborted without reason') {
        toast.error(error.message || 'حدث خطأ أثناء تأكيد الطلب')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="page-container">
        <div className="max-w-3xl mx-auto">
          <div className="card">
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2">خدمات الزيارات السورية للأردن</h1>
            <p className="text-sm sm:text-base text-gray-600">زيارة الأردن لمدة شهر - تنظيم جميع الإجراءات</p>
          </div>


          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4 sm:space-y-6">
            {/* البيانات الأساسية */}
            <div className="bg-gray-50 p-4 sm:p-5 rounded-lg">
              <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-4">البيانات الأساسية</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">اسم الحساب</label>
                  <div className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-lg bg-white flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="truncate text-gray-800">
                        {profileLoading ? 'جاري التحميل...' : (accountName || 'غير متوفر')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                      <Lock className="w-3.5 h-3.5" />
                      من الحساب
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    رقم الهاتف الأردني (يُحفظ في حسابك) *
                  </label>
                  <input 
                    type="tel" 
                    required 
                    value={formData.jordanPhone} 
                    onChange={(e) => setFormData({ ...formData, jordanPhone: e.target.value })} 
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                    placeholder="07XXXXXXXX" 
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    يتم تعبئته تلقائياً من رقم الحساب إذا كان موجوداً، ويمكنك تعديله.
                  </p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-gray-500" />
                    رقم الهاتف / واتساب السوري (اختياري) — يُحفظ في حسابك
                  </label>
                  <input 
                    type="tel" 
                    value={formData.whatsappPhone} 
                    onChange={(e) => setFormData({ ...formData, whatsappPhone: e.target.value })} 
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                    placeholder="09XXXXXXXX أو +963XXXXXXXX" 
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">مكان الانطلاق *</label>
                  <select 
                    required 
                    value={formData.departureCity} 
                    onChange={(e) => setFormData({ ...formData, departureCity: e.target.value, otherCity: '' })} 
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">اختر مكان الانطلاق</option>
                    {DEPARTURE_CITIES.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                {formData.departureCity === 'أخرى' && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">اسم المدينة *</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.otherCity} 
                      onChange={(e) => setFormData({ ...formData, otherCity: e.target.value })} 
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                      placeholder="أدخل اسم المدينة" 
                    />
                  </div>
                )}

              </div>
            </div>

            {/* الأشخاص والصور */}
            <div className="bg-gray-50 p-4 sm:p-5 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-lg font-bold text-gray-800">الأشخاص وصور الجوازات</h2>
                {persons.length < 10 && (
                  <button
                    type="button"
                    onClick={addPerson}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs sm:text-sm font-semibold"
                  >
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                    إضافة شخص
                  </button>
                )}
              </div>

              <div className="space-y-4 sm:space-y-6">
                {persons.map((person, personIndex) => (
                  <div key={person.id} className="bg-white p-4 sm:p-5 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <h3 className="text-sm sm:text-base font-bold text-gray-800">شخص {personIndex + 1}</h3>
                      {persons.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePerson(person.id)}
                          className="text-red-600 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">اسم الشخص *</label>
                        <input
                          type="text"
                          required
                          value={person.name}
                          onChange={(e) => updatePersonName(person.id, e.target.value)}
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="أدخل اسم الشخص"
                        />
                      </div>

                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                          صور الجواز * (حتى 10 صور)
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-4 text-center hover:border-blue-400 transition">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => handleImageUpload(person.id, e)}
                            className="hidden"
                            id={`passport-upload-${person.id}`}
                          />
                          <label
                            htmlFor={`passport-upload-${person.id}`}
                            className="cursor-pointer flex flex-col items-center"
                          >
                            <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 mb-2" />
                            <span className="text-xs sm:text-sm text-gray-600 mb-1">
                              {person.passportImages.length > 0 
                                ? `${person.passportImages.length} صورة` 
                                : 'اضغط لرفع صور الجواز'}
                            </span>
                            <span className="text-xs text-gray-500">الحجم الأقصى: 5 ميجابايت لكل صورة</span>
                          </label>
                        </div>

                        {/* معاينة الصور */}
                        {person.passportPreviews.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 mt-3 sm:mt-4">
                            {person.passportPreviews.map((preview, imgIndex) => (
                              <div key={imgIndex} className="relative group">
                                <img
                                  src={preview}
                                  alt={`صورة ${imgIndex + 1}`}
                                  className="w-full h-24 sm:h-32 object-cover rounded-lg border border-gray-300"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeImage(person.id, imgIndex)}
                                  className="absolute top-1 left-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-3 h-3 sm:w-4 sm:h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading || requestConfirmed}
              className="w-full py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm sm:text-base md:text-lg disabled:opacity-50 px-4 sm:px-6"
            >
              {loading ? (
                <span className="w-full text-center">جاري الحفظ...</span>
              ) : requestConfirmed ? (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  تم تأكيد الطلب
                </span>
              ) : (
                <span className="grid grid-cols-3 items-center">
                  <span />
                  <span className="text-center">حفظ الطلب</span>
                  <span className="inline-flex items-center justify-end gap-1 text-white/95">
                    التالي
                    <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  </span>
                </span>
              )}
            </button>
          </form>

          {/* زر واتساب بعد الحفظ */}
          {requestId && !requestConfirmed && (
            <div className="mt-6 p-4 sm:p-5 bg-green-50 border-2 border-green-200 rounded-lg">
              <p className="text-sm sm:text-base text-gray-700 mb-4 text-center">
                تم حفظ الطلب بنجاح. يرجى التواصل مع الموظف المسؤول عبر واتساب لإرسال الدفعة وتأكيد الطلب.
              </p>
              <button
                onClick={handleConfirmViaWhatsApp}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold text-sm sm:text-base disabled:opacity-50"
              >
                <MessageCircle className="w-5 h-5" />
                {loading ? 'جاري التأكيد...' : 'إرسال الدفعة وتأكيد الطلب عبر واتساب'}
              </button>
            </div>
          )}

          {requestConfirmed && (
            <div className="mt-6 p-4 sm:p-5 bg-green-50 border-2 border-green-200 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-sm sm:text-base font-semibold text-green-800">
                  تم تأكيد الطلب بنجاح
                </p>
              </div>
              <p className="text-xs sm:text-sm text-gray-700 text-center">
                سيتم توجيهك إلى لوحة التحكم قريباً...
              </p>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  )
}
