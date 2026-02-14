import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import type { Driver } from '../types'

export function useDriverManagement(onReload: () => void) {
  const supabase = createSupabaseBrowserClient()
  const [driverSearch, setDriverSearch] = useState('')

  const normalizePhoneForWhatsApp = (raw: string) => {
    const digits = (raw || '').replace(/[^\d]/g, '')
    return digits.length >= 10 ? digits : ''
  }

  const normalizePhoneForTel = (raw: string) => (raw || '').replace(/[^\d+]/g, '')

  const getAccountForDriver = (d: Driver, driverAccounts: any[]) => {
    if (!d.user_id) return null
    return driverAccounts.find((a) => a.user_id === d.user_id) || null
  }

  const getAssignedRoutesCount = (driverId: string, routeDrivers: any[]) => {
    return routeDrivers.filter((rd) => rd.driver_id === driverId && rd.is_active !== false).length
  }

  const toggleDriverActive = async (driverId: string, nextActive: boolean) => {
    try {
      const { error } = await supabase.from('drivers').update({ is_active: nextActive }).eq('id', driverId)
      if (error) throw error
      toast.success(nextActive ? 'تم تفعيل السائق' : 'تم تعطيل السائق')
      onReload()
    } catch (e: any) {
      console.error('toggleDriverActive error:', e)
      toast.error(e?.message || 'تعذر تحديث حالة السائق')
    }
  }

  const deleteDriver = async (driverId: string, drivers: Driver[]) => {
    // ✅ تحسين رسالة التأكيد: التحقق من وجود رحلات مرتبطة
    try {
      const { data: linkedTrips, error: checkErr } = await supabase
        .from('route_trip_drivers')
        .select('trip_id, route_trips(id, trip_date, start_location_name, end_location_name)')
        .eq('driver_id', driverId)
        .eq('is_active', true)
        .limit(5)
      
      if (checkErr) throw checkErr
      
      const driver = drivers.find((d) => d.id === driverId)
      const driverName = driver?.name || 'هذا السائق'
      
      let confirmMessage = `⚠️ تحذير: هل أنت متأكد من حذف السائق "${driverName}"؟\n\n`
      
      if (linkedTrips && linkedTrips.length > 0) {
        const count = linkedTrips.length
        const tripsList = linkedTrips.slice(0, 3)
          .map((lt: any) => {
            const trip = lt.route_trips
            return trip ? `${trip.start_location_name} → ${trip.end_location_name} (${trip.trip_date})` : ''
          })
          .filter(Boolean)
          .join('\n- ')
        const moreText = count > 3 ? `\nو ${count - 3} رحلة أخرى` : ''
        
        confirmMessage += `هذا السائق مرتبط بـ ${count} رحلة/رحلات:\n- ${tripsList}${moreText}\n\n`
        confirmMessage += `سيتم إزالة ربطه بالخطوط وإلغاء تعيينه من جميع الرحلات.\n\n`
      } else {
        confirmMessage += `سيتم إزالة ربطه بالخطوط.\n\n`
      }
      
      confirmMessage += `هل أنت متأكد من المتابعة؟`
      
      if (!confirm(confirmMessage)) return
    } catch (checkErr: any) {
      console.error('Error checking linked trips:', checkErr)
      if (!confirm('هل أنت متأكد من حذف السائق؟ سيتم إزالة ربطه بالخطوط وإلغاء تعيينه من الرحلات.')) return
    }
    
    try {
      const { error } = await supabase.from('drivers').delete().eq('id', driverId)
      if (error) throw error
      toast.success('تم حذف السائق')
      onReload()
    } catch (e: any) {
      console.error('deleteDriver error:', e)
      toast.error(e?.message || 'تعذر حذف السائق')
    }
  }

  const handleAddDriver = async (formData: FormData) => {
    try {
      const userIdRaw = String(formData.get('user_id') || '').trim()
      const userId = userIdRaw ? userIdRaw : null
      const driverName = String(formData.get('name') || '').trim()
      const driverPhone = String(formData.get('phone') || '').trim()
      const vehicleType = String(formData.get('vehicle_type') || '').trim()
      const seatsCount = parseInt(String(formData.get('seats_count') || '0'), 10)

      if (!driverName || !driverPhone || !vehicleType || !Number.isFinite(seatsCount) || seatsCount <= 0) {
        throw new Error('يرجى تعبئة بيانات السائق بشكل صحيح')
      }

      let driverId: string | null = null
      if (userId) {
        const { data: existingDriver, error: findErr } = await supabase
          .from('drivers')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle()
        if (findErr) throw findErr

        if (existingDriver?.id) {
          driverId = existingDriver.id
          const { error: updErr } = await supabase
            .from('drivers')
            .update({
              name: driverName,
              phone: driverPhone,
              vehicle_type: vehicleType,
              seats_count: seatsCount,
              is_active: true,
            })
            .eq('id', driverId)
          if (updErr) throw updErr
        } else {
          const { data: inserted, error } = await supabase
            .from('drivers')
            .insert({
              name: driverName,
              phone: driverPhone,
              vehicle_type: vehicleType,
              seats_count: seatsCount,
              is_active: true,
              user_id: userId,
            })
            .select('id,user_id')
            .maybeSingle()
          if (error) throw error
          driverId = inserted?.id || null
        }
      } else {
        const { data: inserted, error } = await supabase
          .from('drivers')
          .insert({
            name: driverName,
            phone: driverPhone,
            vehicle_type: vehicleType,
            seats_count: seatsCount,
            is_active: true,
          })
          .select('id')
          .maybeSingle()
        if (error) throw error
        driverId = inserted?.id || null
      }

      if (userId) {
        const { error: profileErr } = await supabase
          .from('profiles')
          .upsert(
            { user_id: userId, role: 'driver', full_name: driverName || null, phone: driverPhone || null } as any,
            { onConflict: 'user_id' }
          )

        if (profileErr) {
          console.warn('Could not update profile role to driver:', profileErr)
          toast.error(
            'تم إضافة السائق لكن لم نتمكن من تعيين دوره كسائق بسبب صلاحيات قاعدة البيانات (RLS). نفّذ ملف: supabase/ALLOW_ADMIN_MANAGE_PROFILES.sql',
            { duration: 8000 }
          )
        }
      }

      toast.success(userId ? 'تم حفظ السائق وربطه بالحساب بنجاح' : 'تم إضافة السائق بنجاح')
      onReload()
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء إضافة السائق')
    }
  }

  return {
    driverSearch,
    setDriverSearch,
    normalizePhoneForWhatsApp,
    normalizePhoneForTel,
    getAccountForDriver,
    getAssignedRoutesCount,
    toggleDriverActive,
    deleteDriver,
    handleAddDriver,
  }
}


