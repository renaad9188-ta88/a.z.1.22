// Types for HomeTransportMap and related components

export type LatLng = { lat: number; lng: number }

export type PublicTripMapRow = {
  id?: string
  route_id?: string
  trip_id: string | null
  trip_type: 'arrivals' | 'departures' | string | null
  trip_date: string | null
  meeting_time: string | null
  departure_time: string | null
  start_location_name: string | null
  start_lat: number | null
  start_lng: number | null
  end_location_name: string | null
  end_lat: number | null
  end_lng: number | null
  stops: Array<{ name: string; lat: number; lng: number; order_index: number }> | any
  is_demo: boolean | null
}

export type UserHint = {
  request_id: string
  visitor_name: string
  trip_id: string | null
  trip_date: string | null
  arrival_date: string | null
  companions_count?: number
  city?: string
  start_location_name?: string
  end_location_name?: string
  meeting_time?: string | null
  departure_time?: string | null
}

export type PassengerInfo = {
  id: string
  visitor_name: string
  selected_dropoff_stop_id?: string | null
  selected_pickup_stop_id?: string | null
  dropoff_stop_name?: string | null
  pickup_stop_name?: string | null
  eta?: { durationText: string; distanceText?: string } | null
}

