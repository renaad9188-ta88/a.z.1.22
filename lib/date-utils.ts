/**
 * تنسيق التاريخ الميلادي بالإنجليزية
 * @param date - التاريخ (Date object أو string)
 * @returns تاريخ منسق بالصيغة: MM/DD/YYYY
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
    
    // استخدام en-US للحصول على التاريخ الميلادي والأرقام الإنجليزية
    return dateObj.toLocaleDateString('en-US', {
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
 * @returns تاريخ ووقت منسق
 */
export const formatDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (isNaN(dateObj.getTime())) {
    return 'تاريخ غير صحيح'
  }
  
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

