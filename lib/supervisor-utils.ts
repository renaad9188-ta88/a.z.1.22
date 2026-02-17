import { createSupabaseBrowserClient } from './supabase'

export interface SupervisorContact {
  supervisor_id: string
  supervisor_name: string
  office_name: string | null
  display_type: 'office' | 'supervisor'
  contact_phone: string | null
  whatsapp_phone: string | null
}

/**
 * الحصول على معلومات التواصل للمشرف المخصص للمنتسب
 * @param customerUserId - معرف المستخدم (المنتسب)
 * @returns معلومات التواصل للمشرف أو null إذا لم يكن هناك مشرف
 */
export async function getSupervisorContactForCustomer(
  customerUserId: string
): Promise<SupervisorContact | null> {
  try {
    const supabase = createSupabaseBrowserClient()
    
    // البحث عن المشرف المخصص لهذا المنتسب
    const { data: customerData, error: customerError } = await supabase
      .from('supervisor_customers')
      .select(`
        supervisor_id,
        supervisor_permissions:supervisor_id (
          contact_phone,
          whatsapp_phone,
          is_active,
          office_name,
          display_type
        ),
        profiles:supervisor_id (
          user_id,
          full_name
        )
      `)
      .eq('customer_id', customerUserId)
      .limit(1)
      .maybeSingle()

    if (customerError && customerError.code !== 'PGRST116') {
      console.error('Error fetching supervisor for customer:', customerError)
      return null
    }

    if (!customerData || !customerData.supervisor_id) {
      return null
    }

    const permissions = customerData.supervisor_permissions as any
    const profile = customerData.profiles as any

    // التحقق من أن المشرف نشط
    if (permissions && permissions.is_active === false) {
      return null
    }

    // إذا كان هناك رقم تواصل، إرجاعه
    if (permissions && (permissions.contact_phone || permissions.whatsapp_phone)) {
      return {
        supervisor_id: customerData.supervisor_id,
        supervisor_name: profile?.full_name || 'مشرف',
        office_name: permissions.office_name || null,
        display_type: permissions.display_type || 'supervisor',
        contact_phone: permissions.contact_phone || null,
        whatsapp_phone: permissions.whatsapp_phone || null,
      }
    }

    return null
  } catch (error) {
    console.error('Error in getSupervisorContactForCustomer:', error)
    return null
  }
}

/**
 * الحصول على رقم الواتساب للمشرف المخصص (مع معالجة التنسيق)
 */
export function getSupervisorWhatsAppNumber(supervisorContact: SupervisorContact | null): string {
  if (!supervisorContact?.whatsapp_phone) return ''
  
  let digits = supervisorContact.whatsapp_phone.replace(/[^\d]/g, '')
  // إزالة الأصفار في البداية
  digits = digits.replace(/^0+/, '')
  // إذا لم يبدأ بـ 962، أضفه
  if (!digits.startsWith('962') && digits.length > 0) {
    digits = '962' + digits
  }
  return digits
}

/**
 * الحصول على رقم الاتصال للمشرف المخصص (مع معالجة التنسيق)
 */
export function getSupervisorCallNumber(supervisorContact: SupervisorContact | null): string {
  if (!supervisorContact?.contact_phone) return ''
  
  return supervisorContact.contact_phone.replace(/[^\d+]/g, '')
}

/**
 * الحصول على معلومات التواصل للمشرف المخصص لخدمة معينة
 * @param serviceType - نوع الخدمة ('visit', 'umrah', 'tourism', 'goethe', 'embassy', 'visa', 'other')
 * @returns معلومات التواصل للمشرف أو null إذا لم يكن هناك مشرف
 */
export async function getSupervisorForService(
  serviceType: 'visit' | 'umrah' | 'tourism' | 'goethe' | 'embassy' | 'visa' | 'other'
): Promise<SupervisorContact | null> {
  try {
    const supabase = createSupabaseBrowserClient()
    
    // البحث عن المشرف المخصص لهذه الخدمة (نشط فقط)
    const { data: servicePerms, error: serviceError } = await supabase
      .from('supervisor_service_permissions')
      .select(`
        supervisor_id,
        supervisor_permissions:supervisor_id (
          contact_phone,
          whatsapp_phone,
          is_active,
          office_name,
          display_type
        ),
        profiles:supervisor_id (
          user_id,
          full_name
        )
      `)
      .eq('service_type', serviceType)
      .limit(1)
      .maybeSingle()

    if (serviceError && serviceError.code !== 'PGRST116') {
      console.error('Error fetching supervisor for service:', serviceError)
      return null
    }

    if (!servicePerms || !servicePerms.supervisor_id) {
      return null
    }

    const permissions = servicePerms.supervisor_permissions as any
    const profile = servicePerms.profiles as any

    // التحقق من أن المشرف نشط
    if (permissions && permissions.is_active === false) {
      return null
    }

    // إذا كان هناك رقم تواصل، إرجاعه
    if (permissions && (permissions.contact_phone || permissions.whatsapp_phone)) {
      return {
        supervisor_id: servicePerms.supervisor_id,
        supervisor_name: profile?.full_name || 'مشرف',
        office_name: permissions.office_name || null,
        display_type: permissions.display_type || 'supervisor',
        contact_phone: permissions.contact_phone || null,
        whatsapp_phone: permissions.whatsapp_phone || null,
      }
    }

    return null
  } catch (error) {
    console.error('Error in getSupervisorForService:', error)
    return null
  }
}

/**
 * البحث عن مشرف له صلاحيات كاملة (can_view_all_requests = true)
 * يستخدم عندما لا يكون للمستخدم مشرف مخصص
 * @returns معلومات التواصل للمشرف بصلاحيات كاملة أو null
 */
export async function getSupervisorWithFullPermissions(): Promise<SupervisorContact | null> {
  try {
    const supabase = createSupabaseBrowserClient()
    
    // البحث عن مشرف نشط له صلاحيات كاملة
    const { data: permissionsData, error: permError } = await supabase
      .from('supervisor_permissions')
      .select(`
        supervisor_id,
        contact_phone,
        whatsapp_phone,
        is_active,
        office_name,
        display_type,
        can_view_all_requests,
        profiles:supervisor_id (
          user_id,
          full_name
        )
      `)
      .eq('is_active', true)
      .eq('can_view_all_requests', true)
      .limit(1)
      .maybeSingle()

    if (permError && permError.code !== 'PGRST116') {
      console.error('Error fetching supervisor with full permissions:', permError)
      return null
    }

    if (!permissionsData || !permissionsData.supervisor_id) {
      return null
    }

    const profile = permissionsData.profiles as any

    // إذا كان هناك رقم تواصل، إرجاعه
    if (permissionsData.contact_phone || permissionsData.whatsapp_phone) {
      return {
        supervisor_id: permissionsData.supervisor_id,
        supervisor_name: profile?.full_name || 'مشرف',
        office_name: permissionsData.office_name || null,
        display_type: permissionsData.display_type || 'supervisor',
        contact_phone: permissionsData.contact_phone || null,
        whatsapp_phone: permissionsData.whatsapp_phone || null,
      }
    }

    return null
  } catch (error) {
    console.error('Error in getSupervisorWithFullPermissions:', error)
    return null
  }
}

