import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import type { StopPoint } from '../types'
import { MAX_STOP_POINTS } from '../types'

export function useTripStops(
  editTripId?: string | null,
  copyTripData?: any,
  useRouteDefaultStops: boolean = true
) {
  const supabase = createSupabaseBrowserClient()
  const [stopPoints, setStopPoints] = useState<StopPoint[]>([])
  const [useRouteDefaultStops, setUseRouteDefaultStops] = useState(useRouteDefaultStops)

  useEffect(() => {
    const loadTripStops = async () => {
      const tripIdToLoad = editTripId || (copyTripData ? copyTripData.id : null)
      if (!tripIdToLoad) return
      const { data: stops, error } = await supabase
        .from('route_trip_stop_points')
        .select('name,lat,lng')
        .eq('trip_id', tripIdToLoad)
        .order('order_index', { ascending: true })
      if (!error && stops) {
        setStopPoints((stops as any[]).map((s: any) => ({ name: s.name, lat: s.lat, lng: s.lng })))
        if ((stops as any[]).length > 0) setUseRouteDefaultStops(false)
      }
    }

    loadTripStops()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTripId, copyTripData?.id])

  const addStopPoint = (stop: StopPoint) => {
    if (stopPoints.length >= MAX_STOP_POINTS) {
      return false
    }
    setStopPoints((prev) => [...prev, stop])
    return true
  }

  const removeStopPoint = (index: number) => {
    setStopPoints((prev) => prev.filter((_, i) => i !== index))
  }

  const editStopPointName = (index: number, name: string) => {
    setStopPoints((prev) => prev.map((x, i) => (i === index ? { ...x, name } : x)))
  }

  const moveStopPoint = (index: number, dir: -1 | 1) => {
    const list = stopPoints
    const other = list[index + dir]
    if (!other) return
    const next = [...list]
    ;[next[index], next[index + dir]] = [next[index + dir], next[index]]
    setStopPoints(next)
  }

  return {
    stopPoints,
    setStopPoints,
    useRouteDefaultStops,
    setUseRouteDefaultStops,
    addStopPoint,
    removeStopPoint,
    editStopPointName,
    moveStopPoint,
  }
}

