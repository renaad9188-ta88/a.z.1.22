/**
 * تنسيق التاريخ الميلادي بالإنجليزية
 * @param date - التاريخ (Date object أو string)
 * @returns تاريخ منسق بالصيغة: DD/MM/YYYY
 */
export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) {
    return 'تاريخ غير متوفر'
  }
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    if (isNaN(dateObj.getTime())) {
      return 'تاريخ غير صحيح'
    }
    
    // استخدام en-GB للحصول على التاريخ الميلادي بصيغة DD/MM/YYYY
    return dateObj.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'تاريخ غير صحيح'
  }
}

/**
 * تنسيق التاريخ مع الوقت
 * @param date - التاريخ (Date object أو string)
 * @returns تاريخ ووقت منسق بصيغة DD/MM/YYYY HH:MM
 */
export const formatDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (isNaN(dateObj.getTime())) {
    return 'تاريخ غير صحيح'
  }
  
  // استخدام en-GB للحصول على التاريخ بصيغة DD/MM/YYYY
  const dateStr = dateObj.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  
  const timeStr = dateObj.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
  
  return `${dateStr} ${timeStr}`
}

