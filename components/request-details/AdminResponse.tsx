'use client'

import { MessageSquare, Calendar } from 'lucide-react'
import { formatDate } from '@/lib/date-utils'

interface AdminResponseProps {
  adminNotes: string | null
}

// دالة لإزالة الروابط من النص
const removeUrls = (text: string): string => {
  // إزالة روابط HTTP/HTTPS (بما في ذلك الروابط التي تنتهي بعلامات ترقيم)
  const urlRegex = /https?:\/\/[^\s\)\]\}]+/gi
  return text.replace(urlRegex, '')
}

// دالة لتحويل الأرقام العربية إلى إنجليزية
const arabicToEnglish = (str: string): string => {
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩'
  return str.replace(/[٠-٩]/g, (char) => arabicDigits.indexOf(char).toString())
}

// دالة لتحويل التاريخ الهجري إلى ميلادي
const convertHijriToGregorian = (hijriText: string): string => {
  // البحث عن التواريخ الهجرية بصيغ مختلفة
  // مثال: "٧‏/٨‏/١٤٤٧ هـ" أو "7/8/1447 هـ" أو "تاريخ: ٧/٨/١٤٤٧"
  const hijriDateRegex = /(\d{1,2}|[٠-٩]{1,2})[‏\/\s]+(\d{1,2}|[٠-٩]{1,2})[‏\/\s]+(\d{4}|[٠-٩]{4})\s*هـ?/g
  
  return hijriText.replace(hijriDateRegex, (match, day, month, year) => {
    try {
      // تحويل الأرقام العربية إلى إنجليزية
      const dayStr = arabicToEnglish(day)
      const monthStr = arabicToEnglish(month)
      const yearStr = arabicToEnglish(year)
      
      const dayNum = parseInt(dayStr)
      const monthNum = parseInt(monthStr)
      const yearNum = parseInt(yearStr)
      
      if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum) || 
          dayNum < 1 || dayNum > 30 || monthNum < 1 || monthNum > 12) {
        return match
      }
      
      // تحويل التاريخ الهجري إلى ميلادي
      // بداية التقويم الهجري: 16 يوليو 622 ميلادي
      const hijriEpoch = new Date(622, 6, 16) // 16 يوليو 622
      
      // حساب عدد الأيام من بداية التقويم الهجري
      // السنة الهجرية = 354 أو 355 يوم (متوسط 354.37)
      // الشهر الهجري = 29 أو 30 يوم (متوسط 29.5)
      const daysInHijriYear = 354.37
      const daysInHijriMonth = 29.5
      
      // حساب إجمالي الأيام
      const totalHijriDays = (yearNum - 1) * daysInHijriYear + 
                            (monthNum - 1) * daysInHijriMonth + 
                            (dayNum - 1)
      
      // تحويل إلى أيام ميلادية (1 يوم هجري ≈ 0.9702 يوم ميلادي)
      const gregorianDays = totalHijriDays * 0.9702
      
      // حساب التاريخ الميلادي
      const gregorianDate = new Date(hijriEpoch.getTime() + gregorianDays * 24 * 60 * 60 * 1000)
      
      // التحقق من صحة التاريخ
      if (isNaN(gregorianDate.getTime())) {
        return match
      }
      
      // تنسيق التاريخ الميلادي
      return formatDate(gregorianDate)
    } catch (error) {
      // في حالة الفشل، نعيد النص الأصلي
      return match
    }
  })
}

// دالة لتحسين تنسيق النص
const cleanText = (text: string): string => {
  // إزالة الروابط
  let cleaned = removeUrls(text)
  
  // تحويل التواريخ الهجرية إلى ميلادية
  cleaned = convertHijriToGregorian(cleaned)
  
  // إزالة المسافات الزائدة بين الكلمات (لكن نحافظ على الأسطر)
  cleaned = cleaned.replace(/[ \t]+/g, ' ')
  
  // إزالة المسافات في بداية ونهاية كل سطر
  cleaned = cleaned.split('\n').map(line => line.trim()).join('\n')
  
  // إزالة الأسطر الفارغة المتعددة (نحافظ على سطر فارغ واحد كحد أقصى)
  cleaned = cleaned.replace(/\n\s*\n\s*\n+/g, '\n\n')
  
  return cleaned.trim()
}

// دالة لتحويل التاريخ إلى ميلادي
const formatResponseDate = (dateStr: string): string => {
  if (!dateStr) return ''
  
  try {
    // إذا كان التاريخ بصيغة ISO (مثل 2024-01-15T10:30:00.000Z) أو صيغة أخرى
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      // استخدام formatDate للحصول على التاريخ الميلادي بصيغة MM/DD/YYYY
      return formatDate(date)
    }
    // إذا فشل التحليل، إرجاع النص الأصلي
    return dateStr
  } catch {
    return dateStr
  }
}

export default function AdminResponse({ adminNotes }: AdminResponseProps) {
  if (!adminNotes) return null

  // استخراج الرد من admin_notes
  const responseIndex = adminNotes.indexOf('=== رد الإدارة ===')
  if (responseIndex === -1) return null

  const responseSection = adminNotes.substring(responseIndex)
  const lines = responseSection.split('\n')
  
  // استخراج الرد (كل شيء بعد العنوان)
  const responseLines: string[] = []
  let foundResponse = false
  let responseDate = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.includes('=== رد الإدارة ===')) {
      foundResponse = true
      continue
    }
    if (foundResponse) {
      if (line.includes('تاريخ الرد:')) {
        const datePart = line.replace('تاريخ الرد:', '').trim()
        responseDate = formatResponseDate(datePart)
        continue
      }
      if (line) {
        responseLines.push(line)
      }
    }
  }

  const responseText = cleanText(responseLines.join('\n').trim())

  if (!responseText) return null

  return (
    <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-6 border border-blue-200 shadow-md">
      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
        <div className="bg-blue-600 p-2 sm:p-2.5 rounded-lg">
          <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-800">رد الإدارة</h3>
          {responseDate && (
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-600 mt-1">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{responseDate}</span>
            </div>
          )}
        </div>
      </div>
      <div className="bg-white rounded-lg p-4 sm:p-5 border border-blue-100">
        <p className="text-sm sm:text-base text-gray-800 whitespace-pre-wrap leading-relaxed">
          {responseText}
        </p>
      </div>
    </div>
  )
}





