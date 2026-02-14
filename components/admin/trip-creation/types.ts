export type StopKind = 'pickup' | 'dropoff' | 'both'

export type StopPoint = {
  name: string
  lat: number
  lng: number
}

export type RouteStopRow = {
  id: string
  route_id: string
  name: string
  lat: number
  lng: number
  order_index: number
  is_active: boolean
  stop_kind?: StopKind | null
}

export type LocationPoint = {
  name: string
  lat: number
  lng: number
}

export type CreateMode = 'single' | 'span' | 'pick'

export const MAX_STOP_POINTS = 7

