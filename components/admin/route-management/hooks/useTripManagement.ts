import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import type { Route } from '../types'

export function useTripManagement(routes: Route[]) {
  const supabase = createSupabaseBrowserClient()
  const [showCreateTrip, setShowCreateTrip] = useState(false)
  const [createTripType, setCreateTripType] = useState<'arrival' | 'departure'>('arrival')
  const [selectedRouteForTrip, setSelectedRouteForTrip] = useState<Route | null>(null)
  const [editTripData, setEditTripData] = useState<any>(null)
  const [copyTripData, setCopyTripData] = useState<any>(null)

  const handleEditTrip = async (tripId: string, routeId: string) => {
    try {
      const { data: tripData, error } = await supabase
        .from('route_trips')
        .select('*')
        .eq('id', tripId)
        .single()
      
      if (error) throw error
      
      const route = routes.find(r => r.id === routeId)
      if (!route) {
        toast.error('لم يتم العثور على الخط')
        return
      }
      
      setEditTripData(tripData)
      setSelectedRouteForTrip(route)
      setCreateTripType((tripData.trip_type as any) || 'arrival')
      setShowCreateTrip(true)
    } catch (e: any) {
      console.error('handleEditTrip error:', e)
      toast.error(e?.message || 'تعذر تحميل بيانات الرحلة')
    }
  }

  const handleCopyTrip = async (tripId: string, routeId: string) => {
    try {
      const { data: tripData, error } = await supabase
        .from('route_trips')
        .select('*')
        .eq('id', tripId)
        .single()
      
      if (error) throw error
      
      const route = routes.find(r => r.id === routeId)
      if (!route) {
        toast.error('لم يتم العثور على الخط')
        return
      }
      
      setCopyTripData(tripData)
      setEditTripData(null)
      setSelectedRouteForTrip(route)
      setCreateTripType((tripData.trip_type as any) || 'arrival')
      setShowCreateTrip(true)
    } catch (e: any) {
      console.error('handleCopyTrip error:', e)
      toast.error(e?.message || 'تعذر تحميل بيانات الرحلة')
    }
  }

  const handleCancelTrip = async (tripId: string) => {
    try {
      const { error } = await supabase
        .from('route_trips')
        .update({ is_active: false })
        .eq('id', tripId)
      
      if (error) throw error
      toast.success('تم إلغاء الرحلة')
      return true
    } catch (e: any) {
      console.error('handleCancelTrip error:', e)
      toast.error(e?.message || 'تعذر إلغاء الرحلة')
      return false
    }
  }

  const handleDeleteTrip = async (tripId: string) => {
    try {
      // Check if there are any bookings
      const { data: bookings, error: checkErr } = await supabase
        .from('visit_requests')
        .select('id')
        .eq('trip_id', tripId)
        .limit(1)
      
      if (checkErr) throw checkErr
      
      if (bookings && bookings.length > 0) {
        toast.error('لا يمكن حذف الرحلة لأن هناك حجوزات مرتبطة بها. يمكنك إلغاء الرحلة بدلاً من ذلك.')
        return false
      }
      
      const { error } = await supabase
        .from('route_trips')
        .delete()
        .eq('id', tripId)
      
      if (error) throw error
      toast.success('تم حذف الرحلة')
      return true
    } catch (e: any) {
      console.error('handleDeleteTrip error:', e)
      toast.error(e?.message || 'تعذر حذف الرحلة')
      return false
    }
  }

  const closeTripModal = () => {
    setShowCreateTrip(false)
    setEditTripData(null)
    setCopyTripData(null)
    setSelectedRouteForTrip(null)
  }

  return {
    showCreateTrip,
    createTripType,
    selectedRouteForTrip,
    editTripData,
    copyTripData,
    setShowCreateTrip,
    setCreateTripType,
    setSelectedRouteForTrip,
    handleEditTrip,
    handleCopyTrip,
    handleCancelTrip,
    handleDeleteTrip,
    closeTripModal,
  }
}


