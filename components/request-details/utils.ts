import { AdminInfo } from './types'

export const getVisitTypeText = (type: string): string => {
  const types: Record<string, string> = {
    visit: 'زيارة',
    umrah: 'عمرة',
    tourism: 'سياحة',
  }
  return types[type] || type
}

export const parseAdminNotes = (notes: string): AdminInfo | null => {
  if (!notes) return null
  
  const info: AdminInfo = {}
  const lines = notes.split('\n')
  
  // استخراج جميع URLs من admin_notes
  const allUrls = notes.match(/https?:\/\/[^\s,\n]+/g) || []
  const paymentUrls = allUrls.filter((url: string) => url.includes('/payments/'))
  
  if (paymentUrls.length > 0) {
    info.paymentImages = paymentUrls
  }
  
  lines.forEach(line => {
    const trimmed = line.trim()
    if (!trimmed) return

    if (trimmed.startsWith('اسم الحساب:')) {
      info.accountName = trimmed.split('اسم الحساب:')[1]?.trim()
    }
    if (line.includes('الهاتف الأردني:')) {
      info.jordanPhone = line.split('الهاتف الأردني:')[1]?.trim().split('\n')[0].split(' ')[0]
    }
    // صيغ مختلفة للهاتف السوري/الواتساب
    if (trimmed.includes('الهاتف السوري / واتساب')) {
      const parts = trimmed.split('الهاتف السوري / واتساب')
      if (parts[1]) info.syrianPhone = parts[1].replace(':', '').trim()
    }
    if (trimmed.startsWith('واتساب سوري (اختياري):')) {
      const v = trimmed.split('واتساب سوري (اختياري):')[1]?.trim()
      if (v && v !== 'غير مدخل') info.syrianPhone = v
    }
    if (trimmed.startsWith('واتساب/هاتف:')) {
      const v = trimmed.split('واتساب/هاتف:')[1]?.trim()
      if (v && v !== 'غير مدخل') info.syrianPhone = v
    }

    // اختيارات الشركات (خدمة الأردن)
    if (trimmed.startsWith('الشركة المقدّم لها:')) {
      info.tourismCompany = trimmed.split('الشركة المقدّم لها:')[1]?.trim()
    }
    // صيغة أحدث مستخدمة في JordanVisitForm
    if (trimmed.startsWith('الشركات (طلب زيارة):')) {
      info.tourismCompany = trimmed.split('الشركات (طلب زيارة):')[1]?.trim()
    }
    if (trimmed.startsWith('شركة النقل:')) {
      info.transportCompany = trimmed.split('شركة النقل:')[1]?.trim()
    }
    if (trimmed.startsWith('ملاحظة:')) {
      info.note = trimmed.split('ملاحظة:')[1]?.trim()
    }

    if (line.includes('الغرض:')) {
      const purposePart = line.split('الغرض:')[1]?.trim()
      if (purposePart && !purposePart.startsWith('http')) {
        // احتفظ بالنص كاملاً (كان سابقاً يأخذ أول كلمة فقط)
        info.purpose = purposePart.trim()
      } else {
        info.purpose = 'غير محدد'
      }
    }
  })
  
  return info
}

export const getSignedImageUrl = async (
  publicUrl: string,
  supabase: any,
  expiresInSeconds: number = 3600
): Promise<string> => {
  try {
    if (!publicUrl || !publicUrl.trim()) {
      return publicUrl
    }

    // إذا كان الرابط يحتوي على signed URL بالفعل، ارجعه كما هو
    if (publicUrl.includes('?token=') || publicUrl.includes('&token=')) {
      return publicUrl
    }

    let filePath = ''

    // محاولة استخراج مسار الملف من أنواع مختلفة من الروابط
    // النوع 1: https://project.supabase.co/storage/v1/object/public/passports/user_id/filename
    if (publicUrl.includes('/storage/v1/object/public/passports/')) {
      filePath = publicUrl.split('/storage/v1/object/public/passports/')[1]
    }
    // النوع 2: https://project.supabase.co/storage/v1/object/sign/passports/user_id/filename
    else if (publicUrl.includes('/storage/v1/object/sign/passports/')) {
      filePath = publicUrl.split('/storage/v1/object/sign/passports/')[1].split('?')[0]
    }
    // النوع 3: رابط مباشر يحتوي على user_id/filename فقط
    else if (publicUrl.includes('/passports/')) {
      filePath = publicUrl.split('/passports/')[1].split('?')[0]
    }
    // النوع 4: مسار مباشر بدون domain
    else if (!publicUrl.startsWith('http')) {
      filePath = publicUrl.split('?')[0]
    }
    // إذا لم نجد مسار واضح، ارجع الرابط الأصلي
    else {
      // محاولة استخدام الرابط الأصلي مباشرة (قد يعمل إذا كان bucket public)
      return publicUrl
    }

    // تنظيف مسار الملف من أي query parameters
    filePath = filePath.split('?')[0].split('#')[0]

    if (!filePath || !filePath.trim()) {
      // إذا لم نجد مسار، ارجع الرابط الأصلي
      return publicUrl
    }

    // محاولة إنشاء signed URL
    try {
      const { data, error } = await supabase.storage
        .from('passports')
        .createSignedUrl(filePath, expiresInSeconds)
      
      if (error) {
        // إذا كان الخطأ "Object not found"، ارجع الرابط الأصلي
        if (error.message?.includes('not found') || error.message?.includes('Object not found')) {
          console.warn(`Image not found in storage: ${filePath}, using original URL`)
          return publicUrl
        }
        console.error('Error creating signed URL:', error)
        return publicUrl
      }
      
      if (data && data.signedUrl) {
        return data.signedUrl
      }
    } catch (signError: any) {
      // إذا فشل إنشاء signed URL، ارجع الرابط الأصلي
      console.warn('Failed to create signed URL, using original:', signError.message)
      return publicUrl
    }
    
    return publicUrl
  } catch (error) {
    console.error('Error in getSignedImageUrl:', error)
    // في حالة أي خطأ، ارجع الرابط الأصلي
    return publicUrl
  }
}



