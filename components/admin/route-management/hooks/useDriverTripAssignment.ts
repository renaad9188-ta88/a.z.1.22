import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import type { Driver } from '../types'

export function useDriverTripAssignment(
  setTripAssignedDrivers: React.Dispatch<React.SetStateAction<Record<string, Driver[]>>>
) {
  const supabase = createSupabaseBrowserClient()

  const handleAssignDriverToTrip = async (tripId: string, driverId: string, routeId: string) => {
    try {
      const { error } = await supabase
        .from('route_trip_drivers')
        .upsert(
          { trip_id: tripId, driver_id: driverId, is_active: true },
          { onConflict: 'trip_id,driver_id' }
        )
      if (error) throw error
      
      // إعادة تحميل السائقين من قاعدة البيانات
      const { data: assignments, error: assignErr } = await supabase
        .from('route_trip_drivers')
        .select('trip_id, driver_id, drivers(id, name, vehicle_type, phone)')
        .eq('trip_id', tripId)
        .eq('is_active', true)
      
      if (!assignErr && assignments) {
        const drivers = assignments
          .filter((a: any) => a.drivers)
          .map((a: any) => a.drivers as Driver)
        
        setTripAssignedDrivers((p) => ({
          ...p,
          [tripId]: drivers,
        }))
        
        // ✅ Logging: تسجيل تعيين السائق
        const assignedDriver = drivers.find((d: Driver) => d.id === driverId)
        if (assignedDriver) {
          try {
            const { logDriverAssigned } = await import('@/lib/audit')
            await logDriverAssigned(tripId, driverId, assignedDriver.name)
          } catch (logErr) {
            console.error('Error logging driver assignment:', logErr)
          }
        }
      }
      
      toast.success('تم ربط السائق بالرحلة بنجاح')
    } catch (e: any) {
      console.error('Assign driver to trip error:', e)
      toast.error(e?.message || 'تعذر ربط السائق بالرحلة')
    }
  }

  const handleUnassignDriverFromTrip = async (
    tripId: string,
    driverId: string,
    routeId: string
  ) => {
    try {
      // ✅ Logging: تسجيل إلغاء تعيين السائق (نقرأ من state باستخدام callback)
      let driverToUnassign: Driver | undefined
      setTripAssignedDrivers((p) => {
        driverToUnassign = p[tripId]?.find((d: Driver) => d.id === driverId)
        return p
      })
      
      const { error } = await supabase
        .from('route_trip_drivers')
        .update({ is_active: false })
        .eq('trip_id', tripId)
        .eq('driver_id', driverId)
      
      if (error) throw error
      
      if (driverToUnassign) {
        try {
          const { logDriverUnassigned } = await import('@/lib/audit')
          await logDriverUnassigned(tripId, driverId, driverToUnassign.name)
        } catch (logErr) {
          console.error('Error logging driver unassignment:', logErr)
        }
      }
      
      // إعادة تحميل السائقين من قاعدة البيانات
      const { data: assignments, error: assignErr } = await supabase
        .from('route_trip_drivers')
        .select('trip_id, driver_id, drivers(id, name, vehicle_type, phone)')
        .eq('trip_id', tripId)
        .eq('is_active', true)
      
      if (!assignErr && assignments) {
        const drivers = assignments
          .filter((a: any) => a.drivers)
          .map((a: any) => a.drivers as Driver)
        
        setTripAssignedDrivers((p) => ({
          ...p,
          [tripId]: drivers,
        }))
      }
      
      toast.success('تم إزالة السائق من الرحلة')
    } catch (e: any) {
      console.error('Unassign driver from trip error:', e)
      toast.error(e?.message || 'تعذر إزالة السائق من الرحلة')
    }
  }

  const handleAssignDriver = async (routeId: string, driverId: string, onReload: () => void) => {
    try {
      const { error } = await supabase.from('route_drivers').upsert({
        route_id: routeId,
        driver_id: driverId,
        is_active: true,
      }, { onConflict: 'route_id,driver_id' })

      if (error) throw error
      toast.success('تم ربط السائق بالخط بنجاح')
      onReload()
    } catch (error: any) {
      toast.error('حدث خطأ أثناء ربط السائق')
    }
  }

  return {
    handleAssignDriverToTrip,
    handleUnassignDriverFromTrip,
    handleAssignDriver,
  }
}


