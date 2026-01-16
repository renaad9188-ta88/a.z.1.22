import { createSupabaseBrowserClient } from './supabase'

export interface CreateNotificationParams {
  userId: string
  title: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error'
  relatedType?: string
  relatedId?: string
}

/**
 * إنشاء إشعار جديد للمستخدم
 */
export async function createNotification(params: CreateNotificationParams): Promise<string | null> {
  try {
    console.log('🔔 [CREATE NOTIFICATION] Creating notification for user:', params.userId, 'Title:', params.title)
    
    const supabase = createSupabaseBrowserClient()
    
    // محاولة استخدام الدالة أولاً
    const { data: rpcData, error: rpcError } = await supabase.rpc('create_notification', {
      p_user_id: params.userId,
      p_title: params.title,
      p_message: params.message,
      p_type: params.type || 'info',
      p_related_type: params.relatedType || null,
      p_related_id: params.relatedId || null,
    })

    if (!rpcError && rpcData) {
      console.log('✅ [CREATE NOTIFICATION] Notification created via RPC:', rpcData)
      return rpcData || null
    }

    // إذا فشلت الدالة، جرب الإدراج المباشر
    console.log('⚠️ [CREATE NOTIFICATION] RPC failed, trying direct insert. Error:', rpcError)
    
    const { data: insertData, error: insertError } = await supabase
      .from('notifications')
      .insert({
        user_id: params.userId,
        title: params.title,
        message: params.message,
        type: params.type || 'info',
        related_type: params.relatedType || null,
        related_id: params.relatedId || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ [CREATE NOTIFICATION] Error inserting notification directly:', insertError)
      return null
    }

    console.log('✅ [CREATE NOTIFICATION] Notification created via direct insert:', insertData?.id)
    return insertData?.id || null
  } catch (error) {
    console.error('❌ [CREATE NOTIFICATION] Error in createNotification:', error)
    return null
  }
}

/**
 * إنشاء إشعار عند موافقة على طلب
 */
export async function notifyRequestApproved(userId: string, requestId: string, visitorName: string) {
  return createNotification({
    userId,
    title: 'تم قبول طلبك',
    message: `تم قبول طلب الزيارة لـ ${visitorName}. يمكنك الآن حجز موعد الرحلة.`,
    type: 'success',
    relatedType: 'request',
    relatedId: requestId,
  })
}

/**
 * إنشاء إشعار عند رفض طلب
 */
export async function notifyRequestRejected(userId: string, requestId: string, visitorName: string, reason?: string) {
  return createNotification({
    userId,
    title: 'تم رفض طلبك',
    message: `تم رفض طلب الزيارة لـ ${visitorName}.${reason ? ` السبب: ${reason}` : ''}`,
    type: 'error',
    relatedType: 'request',
    relatedId: requestId,
  })
}

/**
 * إشعار للمستخدم: تم إكمال الطلب
 */
export async function notifyRequestCompleted(userId: string, requestId: string, visitorName: string) {
  return createNotification({
    userId,
    title: 'تم إكمال طلبك',
    message: `تم إكمال طلب ${visitorName}. شكراً لاستخدامك منصتنا.`,
    type: 'success',
    relatedType: 'request',
    relatedId: requestId,
  })
}

/**
 * إنشاء إشعار عند وجود رد من الإدارة
 */
export async function notifyAdminResponse(userId: string, requestId: string) {
  return createNotification({
    userId,
    title: 'رد من الإدارة',
    message: 'لديك رد جديد من الإدارة على طلبك. يرجى مراجعة التفاصيل.',
    type: 'info',
    relatedType: 'request',
    relatedId: requestId,
  })
}

/**
 * إنشاء إشعار عند موافقة على حجز الموعد
 */
export async function notifyTripApproved(userId: string, requestId: string, arrivalDate: string) {
  try {
    console.log('🔔 [NOTIFICATION] Sending trip approval notification to user:', { userId, requestId, arrivalDate })
    
    // استيراد formatDate بشكل ديناميكي
    let formattedDate = arrivalDate
    try {
      const { formatDate } = await import('@/lib/date-utils')
      formattedDate = formatDate(arrivalDate)
    } catch (formatError) {
      console.warn('Could not format date, using raw date:', formatError)
      formattedDate = arrivalDate
    }
    
    const message = `تم الموافقة على حجز موعد القدوم في ${formattedDate}. يرجى الاستعداد للرحلة.`
    
    console.log('🔔 [NOTIFICATION] Message:', message)
    
    const result = await createNotification({
      userId,
      title: 'تم الموافقة على حجز الموعد',
      message: message,
      type: 'success',
      relatedType: 'trip',
      relatedId: requestId,
    })
    
    console.log('✅ [NOTIFICATION] Trip approval notification sent successfully:', result)
    return result
  } catch (error) {
    console.error('❌ [NOTIFICATION] Error in notifyTripApproved:', error)
    // لا نرمي الخطأ، فقط نسجله
    return null
  }
}

/**
 * إنشاء إشعار عند رفض حجز الموعد
 */
export async function notifyTripRejected(userId: string, requestId: string) {
  return createNotification({
    userId,
    title: 'تم رفض حجز الموعد',
    message: 'تم رفض حجز الموعد المطلوب. يرجى اختيار موعد آخر.',
    type: 'warning',
    relatedType: 'trip',
    relatedId: requestId,
  })
}

/**
 * إنشاء إشعار تذكير قبل موعد القدوم
 */
export async function notifyTripReminder(userId: string, requestId: string, arrivalDate: string, daysBefore: number) {
  return createNotification({
    userId,
    title: `تذكير: موعد القدوم بعد ${daysBefore} يوم`,
    message: `موعد القدوم في ${arrivalDate}. يرجى الاستعداد للرحلة.`,
    type: 'info',
    relatedType: 'trip',
    relatedId: requestId,
  })
}

/**
 * الحصول على جميع الإدمن
 */
async function getAllAdmins(): Promise<string[]> {
  try {
    console.log('🔍 [GET ADMINS] Starting to fetch admin users...')
    
    const supabase = createSupabaseBrowserClient()
    
    // محاولة استخدام RPC function أولاً إذا كانت موجودة
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_all_admins')
      
      if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
        const adminIds = rpcData.map((admin: any) => {
          // إذا كان admin كائن، استخرج user_id، وإلا استخدم القيمة مباشرة
          return typeof admin === 'object' && admin.user_id ? admin.user_id : admin
        }).filter((id: any) => id !== null && id !== undefined)
        
        console.log(`✅ [GET ADMINS] Found ${adminIds.length} admin(s) via RPC function:`, adminIds)
        return adminIds
      } else if (rpcError) {
        console.log('⚠️ [GET ADMINS] RPC function error:', rpcError)
      }
    } catch (rpcErr) {
      console.log('⚠️ [GET ADMINS] RPC function not available, trying direct query:', rpcErr)
    }
    
    // محاولة الحصول على الإدمن من profiles مباشرة
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('role', 'admin')

    if (error) {
      console.error('❌ [GET ADMINS] Error getting admins from profiles:', error)
      console.error('❌ [GET ADMINS] Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      
      // محاولة بديلة: استخدام auth.users مباشرة (إذا كان متاحاً)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // التحقق من أن المستخدم الحالي إدمن
          const { data: currentProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', user.id)
            .single()
          
          if (currentProfile?.role === 'admin') {
            console.log('✅ [GET ADMINS] Current user is admin, returning their ID')
            return [user.id]
          }
        }
      } catch (authErr) {
        console.error('❌ [GET ADMINS] Error checking current user:', authErr)
      }
      
      return []
    }

    const adminIds = (data || []).map(profile => profile.user_id)
    
    if (adminIds.length === 0) {
      console.warn('⚠️ [GET ADMINS] No admins found in profiles table')
      console.warn('⚠️ [GET ADMINS] Make sure you have set role = "admin" in profiles table')
    } else {
      console.log(`✅ [GET ADMINS] Found ${adminIds.length} admin(s) to notify:`, adminIds)
    }

    return adminIds
  } catch (error) {
    console.error('❌ [GET ADMINS] Error in getAllAdmins:', error)
    return []
  }
}

/**
 * إنشاء إشعار لجميع الإدمن
 */
export async function notifyAllAdmins(params: Omit<CreateNotificationParams, 'userId'>): Promise<void> {
  try {
    console.log('🔔 [NOTIFICATION] notifyAllAdmins called with:', params)
    
    const adminIds = await getAllAdmins()
    
    if (adminIds.length === 0) {
      console.warn('⚠️ [NOTIFICATION] No admins found to notify')
      return
    }
    
    console.log(`🔔 [NOTIFICATION] Notifying ${adminIds.length} admin(s):`, adminIds)
    
    // إنشاء إشعار لكل إدمن
    const results = await Promise.allSettled(
      adminIds.map(async (adminId) => {
        console.log(`🔔 [NOTIFICATION] Creating notification for admin: ${adminId}`)
        const result = await createNotification({
          ...params,
          userId: adminId,
        })
        console.log(`✅ [NOTIFICATION] Notification created for admin ${adminId}:`, result)
        return result
      })
    )
    
    // تسجيل النتائج
    let successCount = 0
    let failCount = 0
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successCount++
        console.log(`✅ [NOTIFICATION] Successfully notified admin ${adminIds[index]}`)
      } else {
        failCount++
        console.error(`❌ [NOTIFICATION] Failed to notify admin ${adminIds[index]}:`, result.reason)
      }
    })
    
    console.log(`📊 [NOTIFICATION] Summary: ${successCount} succeeded, ${failCount} failed out of ${adminIds.length} admins`)
  } catch (error) {
    console.error('❌ [NOTIFICATION] Error in notifyAllAdmins:', error)
  }
}

/**
 * إشعار للإدمن: طلب جديد تم تقديمه
 */
export async function notifyAdminNewRequest(requestId: string, visitorName: string, userName: string, city: string) {
  try {
    console.log('🔔 [NOTIFICATION] notifyAdminNewRequest called with:', { requestId, visitorName, userName, city })
    
    await notifyAllAdmins({
      title: 'طلب جديد تم تقديمه',
      message: `تم تقديم طلب جديد من ${userName} لـ ${visitorName} من ${city}. يرجى مراجعته.`,
      type: 'info',
      relatedType: 'request',
      relatedId: requestId,
    })
    
    console.log('✅ [NOTIFICATION] notifyAdminNewRequest completed successfully')
  } catch (error) {
    console.error('❌ [NOTIFICATION] Error in notifyAdminNewRequest:', error)
    // لا نرمي الخطأ، فقط نسجله
  }
}

/**
 * إشعار للإدمن: طلب حجز موعد جديد
 */
export async function notifyAdminTripRequest(requestId: string, visitorName: string, userName: string, arrivalDate: string) {
  try {
    console.log('🔔 [NOTIFICATION] Sending trip request notification to admins:', { requestId, visitorName, userName, arrivalDate })
    
    // استيراد formatDate بشكل ديناميكي
    let formattedDate = arrivalDate
    try {
      const { formatDate } = await import('@/lib/date-utils')
      formattedDate = formatDate(arrivalDate)
    } catch (formatError) {
      console.warn('Could not format date, using raw date:', formatError)
      // استخدام التاريخ الخام إذا فشل التنسيق
      formattedDate = arrivalDate
    }
    
    const message = `طلب ${userName} حجز موعد قدوم لـ ${visitorName} في ${formattedDate}. يرجى مراجعته والموافقة.`
    
    console.log('🔔 [NOTIFICATION] Message:', message)
    
    await notifyAllAdmins({
      title: 'طلب حجز موعد جديد',
      message: message,
      type: 'warning',
      relatedType: 'trip',
      relatedId: requestId,
    })
    
    console.log('✅ [NOTIFICATION] Trip request notification sent successfully')
  } catch (error) {
    console.error('❌ [NOTIFICATION] Error in notifyAdminTripRequest:', error)
    // لا نرمي الخطأ، فقط نسجله
  }
}

/**
 * إشعار للإدمن: تحديث على طلب موجود
 */
export async function notifyAdminRequestUpdate(requestId: string, visitorName: string, userName: string) {
  await notifyAllAdmins({
    title: 'تحديث على طلب',
    message: `تم تحديث طلب ${visitorName} من قبل ${userName}. يرجى مراجعة التغييرات.`,
    type: 'info',
    relatedType: 'request',
    relatedId: requestId,
  })
}

/**
 * إشعار للمستخدم: تم استلام الطلب (قيد المراجعة)
 */
export async function notifyRequestUnderReview(userId: string, requestId: string, visitorName: string) {
  return createNotification({
    userId,
    title: 'تم استلام الطلب',
    message: `تم استلام طلب الزيارة لـ ${visitorName} وهو الآن قيد المراجعة. سيتم إشعارك عند تحديث الحالة.`,
    type: 'info',
    relatedType: 'request',
    relatedId: requestId,
  })
}

/**
 * إشعار للإدمن: تم رفع صور جديدة
 */
export async function notifyAdminImagesUploaded(requestId: string, visitorName: string, userName: string, imageType: 'passport' | 'payment') {
  const imageTypeText = imageType === 'passport' ? 'صور الجواز' : 'صور الدفعة'
  await notifyAllAdmins({
    title: 'تم رفع صور جديدة',
    message: `تم رفع ${imageTypeText} لطلب ${visitorName} من قبل ${userName}. يرجى مراجعتها.`,
    type: 'warning',
    relatedType: 'request',
    relatedId: requestId,
  })
}

/**
 * إشعار للمستخدم: رسالة مخصصة من الإدارة
 */
export async function notifyCustomMessage(userId: string, requestId: string, message: string) {
  return createNotification({
    userId,
    title: 'رسالة من الإدارة',
    message: message,
    type: 'info',
    relatedType: 'request',
    relatedId: requestId,
  })
}

