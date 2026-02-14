// Types for AdminRequestFollow and RequestFollow components

export type Role = 'admin' | 'supervisor'

export type ContactProfile = {
  full_name: string | null
  phone: string | null
  jordan_phone?: string | null
  whatsapp_phone?: string | null
}

export type ReqRow = {
  id: string
  user_id: string
  visitor_name: string
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'completed'
  admin_notes: string | null
  rejection_reason: string | null
  payment_verified: boolean | null
  remaining_amount: number | null
  arrival_date: string | null
  departure_date: string | null
  trip_status: string | null
  trip_id?: string | null
  assigned_to: string | null
  selected_dropoff_stop_id?: string | null
  selected_pickup_stop_id?: string | null
  deposit_paid?: boolean | null
  deposit_amount?: number | null
  companions_count?: number | null
  created_at: string
  updated_at: string
}

export type TripLite = {
  id: string
  trip_date: string
  meeting_time: string | null
  departure_time: string | null
  start_location_name: string
  end_location_name: string
  trip_type?: string | null
}

export type AssignedDriver = {
  id: string
  name: string
  phone: string | null
  vehicle_type: string | null
}

export type AdminResponse = {
  body: string
  dateText?: string
}

export type TripModification = {
  oldTripId?: string
  newTripId?: string
  tripInfo?: string
  stopInfo?: string
  dateText?: string
}

