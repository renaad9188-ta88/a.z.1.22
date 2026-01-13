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
    if (line.includes('الهاتف الأردني:')) {
      info.jordanPhone = line.split('الهاتف الأردني:')[1]?.trim().split('\n')[0].split(' ')[0]
    }
    if (line.includes('الهاتف السوري / واتساب')) {
      const parts = line.split('الهاتف السوري / واتساب')
      if (parts[1]) {
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

export const getSignedImageUrl = async (
  publicUrl: string,
  supabase: any
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
        .createSignedUrl(filePath, 3600) // صلاحية ساعة واحدة
      
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



