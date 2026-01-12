'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Calendar, Upload, Save, Edit, Trash2, X, Plus, Phone, MessageCircle } from 'lucide-react'

const DEPARTURE_CITIES = [
  'الشام', 'درعا', 'حلب', 'حمص', 'حماة', 'اللاذقية', 'طرطوس', 
  'دير الزور', 'الحسكة', 'الرقة', 'إدلب', 'السويداء', 'القنيطرة', 'أخرى'
]

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
  const [persons, setPersons] = useState<Person[]>([
    { id: '1', name: '', passportImages: [], passportPreviews: [] }
  ])

  const [formData, setFormData] = useState({
    fullName: '',
    jordanPhone: '',
    syrianPhone: '',
    departureCity: '',
    otherCity: '',
    purpose: '',
  })

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
    // التحقق من البيانات
    if (!formData.fullName || !formData.jordanPhone || !formData.syrianPhone || !formData.departureCity) {
      toast.error('يرجى إدخال جميع البيانات المطلوبة')
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

      // حفظ الطلب
      const { data: requestData, error } = await supabase
        .from('visit_requests')
        .insert({
          user_id: user.id,
          visitor_name: formData.fullName,
          city: finalDepartureCity,
          passport_image_url: personsData[0]?.passportImages[0] || null,
          status: 'pending',
          visit_type: 'visit',
          travel_date: new Date().toISOString().split('T')[0],
          days_count: 30,
          nationality: 'سوري',
          passport_number: 'N/A',
          passport_expiry: new Date().toISOString().split('T')[0],
          companions_count: persons.length,
          companions_data: personsData,
          admin_notes: `خدمة: زيارة الأردن لمدة شهر\nالهاتف الأردني: ${formData.jordanPhone}\nالهاتف السوري/واتساب: ${formData.syrianPhone}\nالغرض: ${formData.purpose || 'غير محدد'}`,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('تم حفظ الطلب بنجاح!')
      router.push(`/services/jordan-visit/payment/${requestData.id}`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء حفظ الطلب')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-4 sm:py-6 md:py-8 px-3 sm:px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8">
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
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">الاسم الكامل *</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.fullName} 
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} 
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                    placeholder="أدخل اسمك الكامل" 
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">رقم الهاتف الأردني *</label>
                  <input 
                    type="tel" 
                    required 
                    value={formData.jordanPhone} 
                    onChange={(e) => setFormData({ ...formData, jordanPhone: e.target.value })} 
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                    placeholder="07XXXXXXXX" 
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">رقم الهاتف السوري / واتساب *</label>
                  <input 
                    type="tel" 
                    required 
                    value={formData.syrianPhone} 
                    onChange={(e) => setFormData({ ...formData, syrianPhone: e.target.value })} 
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
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">الغرض من الزيارة (اختياري)</label>
                  <textarea 
                    value={formData.purpose} 
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })} 
                    rows={3} 
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none" 
                    placeholder="اذكر الغرض من الزيارة..." 
                  />
                </div>
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
              disabled={loading}
              className="w-full py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm sm:text-base md:text-lg disabled:opacity-50"
            >
              {loading ? 'جاري الحفظ...' : 'حفظ والمتابعة للدفع'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
