import { useState, useMemo } from 'react'
import { dateRangeDays } from '../utils'
import type { CreateMode } from '../types'

export function useDateSelection(editTripId?: string | null) {
  const [createMode, setCreateMode] = useState<CreateMode>(editTripId ? 'single' : 'span')
  const [tripDate, setTripDate] = useState('')
  const [spanDays, setSpanDays] = useState(7)
  const [pickStart, setPickStart] = useState('')
  const [pickEnd, setPickEnd] = useState('')
  const [pickedMap, setPickedMap] = useState<Record<string, boolean>>({})

  const pickDatesList = useMemo(() => dateRangeDays(pickStart, pickEnd), [pickStart, pickEnd])

  const selectedDates = useMemo(() => {
    if (editTripId) {
      return tripDate ? [tripDate] : []
    }
    if (createMode === 'single') {
      return tripDate ? [tripDate] : []
    }
    if (createMode === 'span') {
      if (!tripDate) return []
      const dates: string[] = []
      const start = new Date(tripDate + 'T00:00:00')
      for (let i = 0; i < spanDays; i++) {
        const d = new Date(start)
        d.setDate(d.getDate() + i)
        dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
      }
      return dates
    }
    // createMode === 'pick'
    return pickDatesList.filter((d) => pickedMap[d])
  }, [createMode, tripDate, spanDays, pickDatesList, pickedMap, editTripId])

  return {
    createMode,
    setCreateMode,
    tripDate,
    setTripDate,
    spanDays,
    setSpanDays,
    pickStart,
    setPickStart,
    pickEnd,
    setPickEnd,
    pickedMap,
    setPickedMap,
    pickDatesList,
    selectedDates,
  }
}

