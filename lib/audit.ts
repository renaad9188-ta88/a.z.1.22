/**
 * Audit Logging Utility
 * وظائف مساعدة لتسجيل التغييرات المهمة في النظام
 */

import { createSupabaseBrowserClient } from './supabase'

export interface AuditLogParams {
  actionType: string
  entityType: 'trip' | 'request' | 'driver' | 'route' | 'user' | 'booking'
  entityId: string
  oldValues?: Record<string, any> | null
  newValues?: Record<string, any> | null
  description?: string | null
}

/**
 * تسجيل تغيير في النظام
 * @param params - معاملات السجل
 * @returns Promise<string | null> - معرف السجل أو null في حالة الفشل
 */
export async function logAudit(params: AuditLogParams): Promise<string | null> {
  try {
    const supabase = createSupabaseBrowserClient()
    
    // استدعاء دالة SQL لتسجيل التغيير
    const { data, error } = await supabase.rpc('log_audit', {
      p_action_type: params.actionType,
      p_entity_type: params.entityType,
      p_entity_id: params.entityId,
      p_old_values: params.oldValues || null,
      p_new_values: params.newValues || null,
      p_description: params.description || null,
    })
    
    if (error) {
      console.error('Error logging audit:', error)
      // لا نرمي خطأ - فقط نسجل في console
      return null
    }
    
    return data || null
  } catch (error) {
    console.error('Exception in logAudit:', error)
    return null
  }
}

/**
 * تسجيل إنشاء رحلة جديدة
 */
export async function logTripCreated(tripId: string, tripData: Record<string, any>): Promise<void> {
  await logAudit({
    actionType: 'trip_created',
    entityType: 'trip',
    entityId: tripId,
    newValues: tripData,
    description: `تم إنشاء رحلة جديدة: ${tripData.start_location_name} → ${tripData.end_location_name}`,
  })
}

/**
 * تسجيل تحديث رحلة
 */
export async function logTripUpdated(
  tripId: string,
  oldValues: Record<string, any>,
  newValues: Record<string, any>
): Promise<void> {
  await logAudit({
    actionType: 'trip_updated',
    entityType: 'trip',
    entityId: tripId,
    oldValues,
    newValues,
    description: `تم تحديث رحلة: ${newValues.start_location_name || oldValues.start_location_name} → ${newValues.end_location_name || oldValues.end_location_name}`,
  })
}

/**
 * تسجيل حذف رحلة
 */
export async function logTripDeleted(tripId: string, tripData: Record<string, any>): Promise<void> {
  await logAudit({
    actionType: 'trip_deleted',
    entityType: 'trip',
    entityId: tripId,
    oldValues: tripData,
    description: `تم حذف رحلة: ${tripData.start_location_name} → ${tripData.end_location_name}`,
  })
}

/**
 * تسجيل حجز رحلة
 */
export async function logBookingCreated(requestId: string, tripId: string, bookingData: Record<string, any>): Promise<void> {
  await logAudit({
    actionType: 'booking_created',
    entityType: 'booking',
    entityId: requestId,
    newValues: { trip_id: tripId, ...bookingData },
    description: `تم حجز رحلة للمستخدم: ${bookingData.visitor_name || 'غير معروف'}`,
  })
}

/**
 * تسجيل تحديث حالة طلب
 */
export async function logRequestStatusChanged(
  requestId: string,
  oldStatus: string,
  newStatus: string,
  visitorName?: string
): Promise<void> {
  await logAudit({
    actionType: 'status_changed',
    entityType: 'request',
    entityId: requestId,
    oldValues: { status: oldStatus },
    newValues: { status: newStatus },
    description: `تم تغيير حالة الطلب من "${oldStatus}" إلى "${newStatus}"${visitorName ? ` للمستخدم: ${visitorName}` : ''}`,
  })
}

/**
 * تسجيل تعيين سائق
 */
export async function logDriverAssigned(tripId: string, driverId: string, driverName: string): Promise<void> {
  await logAudit({
    actionType: 'driver_assigned',
    entityType: 'trip',
    entityId: tripId,
    newValues: { assigned_driver_id: driverId },
    description: `تم تعيين السائق "${driverName}" للرحلة`,
  })
}

/**
 * تسجيل إلغاء تعيين سائق
 */
export async function logDriverUnassigned(tripId: string, driverId: string, driverName: string): Promise<void> {
  await logAudit({
    actionType: 'driver_unassigned',
    entityType: 'trip',
    entityId: tripId,
    oldValues: { assigned_driver_id: driverId },
    description: `تم إلغاء تعيين السائق "${driverName}" من الرحلة`,
  })
}

