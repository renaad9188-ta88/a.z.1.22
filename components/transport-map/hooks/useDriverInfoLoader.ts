import { createSupabaseBrowserClient } from '@/lib/supabase'
import type { UserHint } from '../types'

interface DriverInfo {
  name: string
  phone: string
  company_phone: string | null
}

interface UseDriverInfoLoaderProps {
  userHint: UserHint | null
  setDriverInfo: (info: DriverInfo) => void
}

export function useDriverInfoLoader({ userHint, setDriverInfo }: UseDriverInfoLoaderProps) {
  const supabase = createSupabaseBrowserClient()

  const loadDriverInfo = async () => {
    if (!userHint) return

    try {
      let assignedDriverId: string | null = null
      let routeId: string | null = null

      if (userHint.request_id) {
        const { data: requestData } = await supabase
          .from('visit_requests')
          .select('assigned_driver_id, route_id')
          .eq('id', userHint.request_id)
          .maybeSingle()
        
        assignedDriverId = (requestData as any)?.assigned_driver_id || null
        routeId = (requestData as any)?.route_id || null
      }

      if (!assignedDriverId && userHint.trip_id) {
        const { data: tripDriverData } = await supabase
          .from('route_trip_drivers')
          .select('driver_id')
          .eq('trip_id', userHint.trip_id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()
        
        if (tripDriverData) {
          assignedDriverId = (tripDriverData as any)?.driver_id || null
        }

        if (!routeId) {
          const { data: tripData } = await supabase
            .from('route_trips')
            .select('route_id')
            .eq('id', userHint.trip_id)
            .maybeSingle()
          
          routeId = (tripData as any)?.route_id || null
        }
      }

      if (assignedDriverId) {
        const { data: driverData } = await supabase
          .from('drivers')
          .select('id, name, phone')
          .eq('id', assignedDriverId)
          .maybeSingle()

        let companyPhone: string | null = null
        if (routeId) {
          const { data: routeData } = await supabase
            .from('routes')
            .select('company_phone, contact_phone')
            .eq('id', routeId)
            .maybeSingle()
          
          companyPhone = (routeData as any)?.company_phone || (routeData as any)?.contact_phone || null
        }

        if (driverData) {
          setDriverInfo({
            name: driverData.name || 'السائق',
            phone: driverData.phone || '',
            company_phone: companyPhone,
          })
        } else {
          setDriverInfo({
            name: 'غير محدد',
            phone: 'غير متاح',
            company_phone: null,
          })
        }
      } else {
        setDriverInfo({
          name: 'غير محدد',
          phone: 'غير متاح',
          company_phone: null,
        })
      }
    } catch (e) {
      console.error('Error loading driver info:', e)
      setDriverInfo({
        name: 'خطأ في التحميل',
        phone: 'غير متاح',
        company_phone: null,
      })
    }
  }

  return {
    loadDriverInfo,
  }
}

