// Types shared across RouteManagement and related components

export type Route = {
  id: string
  name: string
  description: string | null
  start_location_name: string
  start_lat: number
  start_lng: number
  end_location_name: string
  end_lat: number
  end_lng: number
  is_active: boolean
}

export type Driver = {
  id: string
  name: string
  phone: string
  vehicle_type: string
  seats_count: number
  is_active: boolean
  user_id?: string | null
}

export type RouteDriver = {
  id: string
  route_id: string
  driver_id: string
  is_active?: boolean
  driver?: Driver
}

export type DriverAccount = {
  user_id: string
  full_name: string | null
  phone: string | null
  role: string | null
}

export type DriverLocationLite = {
  lat: number
  lng: number
  updated_at: string
  request_id: string | null
  is_available?: boolean // للتمييز بين driver_live_status و trip_driver_locations
}

export type DriverLiveLite = {
  driver_id: string
  is_available: boolean
  updated_at: string
}

export type RouteTripLite = {
  id: string
  visitor_name: string
  city: string
  companions_count: number | null
  arrival_date: string | null
  trip_status: string | null
  created_at: string
  meeting_time?: string | null
  departure_time?: string | null
  start_location_name?: string
  end_location_name?: string
  start_lat?: number
  start_lng?: number
  end_lat?: number
  end_lng?: number
  trip_type?: 'arrival' | 'departure'
}

export type Passenger = {
  id: string
  visitor_name: string
  companions_count: number
  phone: string | null
  full_name: string | null
  whatsapp_phone?: string | null
  jordan_phone?: string | null
}

export type TripListFilter = 'upcoming' | 'ended' | 'all'

export type ActiveSection = 'arrivals' | 'departures' | 'drivers'


