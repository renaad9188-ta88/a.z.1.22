export type ReqRow = {
  id: string
  user_id: string
  visitor_name: string
  visit_type?: string | null
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'completed'
  arrival_date: string | null
  departure_date: string | null
  payment_verified: boolean | null
  remaining_amount: number | null
  trip_status: string | null
  admin_notes: string | null
  trip_id: string | null
  selected_dropoff_stop_id?: string | null
  selected_pickup_stop_id?: string | null
  deposit_paid?: boolean | null
  deposit_amount?: number | null
  city?: string | null
  created_at: string
  updated_at: string
}

export type ActionLogItem = {
  kind: 'admin_response' | 'admin_booking' | 'admin_created' | 'user_booking_change'
  title: string
  body: string
  dateText?: string
}

export type TripLite = {
  id: string
  trip_date: string
  meeting_time?: string | null
  departure_time?: string | null
  start_location_name?: string | null
  end_location_name?: string | null
  start_lat?: number | null
  start_lng?: number | null
  end_lat?: number | null
  end_lng?: number | null
  route_id?: string | null
  trip_type?: 'arrival' | 'departure' | null
}

export type StopPoint = {
  id: string
  name: string
  order_index: number
  lat?: number | null
  lng?: number | null
  stop_kind?: string | null
}


