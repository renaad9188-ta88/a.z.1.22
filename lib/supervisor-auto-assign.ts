import { createSupabaseBrowserClient } from './supabase'

/**
 * تعيين تلقائي للمشرف بناءً على نوع الخدمة
 * @param visitType - نوع الخدمة ('visit', 'umrah', 'tourism', 'goethe', 'embassy', 'visa')
 * @param requestId - معرف الطلب (اختياري، إذا كان الطلب موجود بالفعل)
 * @returns معرف المشرف المعين أو null
 */
export async function autoAssignSupervisorForService(
  visitType: 'visit' | 'umrah' | 'tourism' | 'goethe' | 'embassy' | 'visa',
  requestId?: string
): Promise<string | null> {
  try {
    const supabase = createSupabaseBrowserClient()
    
    // البحث عن المشرف المخصص لهذه الخدمة (نشط فقط)
    const { data: servicePerms, error: serviceError } = await supabase
      .from('supervisor_service_permissions')
      .select('supervisor_id')
      .eq('service_type', visitType)
      .limit(1)
      .maybeSingle()

    if (serviceError && serviceError.code !== 'PGRST116') {
      console.error('Error finding supervisor for service:', serviceError)
      return null
    }

    if (!servicePerms || !servicePerms.supervisor_id) {
      return null
    }

    // التحقق من أن المشرف نشط
    const { data: permissions, error: permError } = await supabase
      .from('supervisor_permissions')
      .select('is_active')
      .eq('supervisor_id', servicePerms.supervisor_id)
      .maybeSingle()

    if (permError && permError.code !== 'PGRST116') {
      console.error('Error checking supervisor permissions:', permError)
      return null
    }

    if (!permissions || permissions.is_active === false) {
      return null
    }

    const supervisorId = servicePerms.supervisor_id

    // إذا كان هناك requestId، قم بتعيين المشرف للطلب
    if (requestId) {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error: assignError } = await supabase
        .from('visit_requests')
        .update({
          assigned_to: supervisorId,
          assigned_at: new Date().toISOString(),
          assigned_by: user?.id || null,
        })
        .eq('id', requestId)

      if (assignError) {
        console.error('Error assigning supervisor to request:', assignError)
        return null
      }
    }

    return supervisorId
  } catch (error) {
    console.error('Error in autoAssignSupervisorForService:', error)
    return null
  }
}

