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
    const urlParts = publicUrl.split('/storage/v1/object/public/passports/')
    if (urlParts.length < 2) return publicUrl
    
    const filePath = urlParts[1]
    
    const { data, error } = await supabase.storage
      .from('passports')
      .createSignedUrl(filePath, 3600)
    
    if (error || !data) {
      console.error('Error creating signed URL:', error)
      return publicUrl
    }
    
    return data.signedUrl
  } catch (error) {
    console.error('Error in getSignedImageUrl:', error)
    return publicUrl
  }
}



