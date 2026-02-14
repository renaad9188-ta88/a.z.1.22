import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import type { Driver } from '../types'

export function useDriverManagement(onReload: () => void | Promise<void>) {
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
      // إعادة تحميل البيانات فوراً
      await onReload()
    } catch (e: any) {
      console.error('toggleDriverActive error:', e)
      toast.error(e?.message || 'تعذر تحديث حالة السائق')
    }
  }

  const normalizePhoneForSearch = (phone: string) => {
    // إزالة جميع الأحرف غير الرقمية
    let digits = phone.replace(/[^\d]/g, '')
    // إزالة الأصفار من البداية
    digits = digits.replace(/^0+/, '')
    // إذا كان يبدأ بـ 962، أبقيه كما هو، وإلا أضف 962
    if (!digits.startsWith('962')) {
      digits = '962' + digits
    }
    return digits
  }

  const linkDriverToAccount = async (driverId: string, driverPhone: string) => {
    try {
      // تطبيع رقم الهاتف للبحث
      const normalizedPhone = normalizePhoneForSearch(driverPhone)
      
      // جلب جميع الحسابات مع role = 'driver'
      const { data: profiles, error: findErr } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone, role')
        .eq('role', 'driver')

      if (findErr) throw findErr

      // البحث عن حساب يطابق رقم الهاتف (بأي تنسيق)
      const profile = (profiles || []).find((p) => {
        if (!p.phone) return false
        const profilePhoneNormalized = normalizePhoneForSearch(p.phone)
        return profilePhoneNormalized === normalizedPhone
      })

      if (!profile || !profile.user_id) {
        toast.error('لم يتم العثور على حساب برقم الهاتف هذا مع دور "سائق".\n\nتأكد من:\n1. تعيين المستخدم كسائق من لوحة "العملاء / المنتسبين"\n2. تطابق رقم الهاتف في جدول profiles مع رقم السائق', { duration: 6000 })
        return false
      }

      // التحقق من أن الحساب غير مربوط بسائق آخر
      const { data: existingDriver, error: checkErr } = await supabase
        .from('drivers')
        .select('id, name')
        .eq('user_id', profile.user_id)
        .neq('id', driverId)
        .maybeSingle()

      if (checkErr) throw checkErr

      if (existingDriver) {
        toast.error(`هذا الحساب مربوط بالفعل بسائق آخر: "${existingDriver.name}"`, { duration: 5000 })
        return false
      }

      // ربط السائق بالحساب
      const { error: updateErr } = await supabase
        .from('drivers')
        .update({ user_id: profile.user_id })
        .eq('id', driverId)

      if (updateErr) throw updateErr

      toast.success(`تم ربط السائق بالحساب بنجاح!\nالحساب: ${profile.full_name || profile.phone}`, { duration: 4000 })
      // إعادة تحميل البيانات فوراً
      await onReload()
      return true
    } catch (e: any) {
      console.error('linkDriverToAccount error:', e)
      toast.error(e?.message || 'تعذر ربط السائق بالحساب')
      return false
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
      toast.success('تم حذف السائق بنجاح')
      // إعادة تحميل البيانات فوراً
      await onReload()
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
      // إعادة تحميل البيانات فوراً
      await onReload()
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
    linkDriverToAccount,
  }
}


