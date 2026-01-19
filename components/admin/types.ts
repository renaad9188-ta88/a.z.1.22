export interface VisitRequest {
  id: string
  user_id: string
  visitor_name: string
  nationality?: string
  passport_number?: string
  passport_expiry?: string
  passport_image_url?: string | null
  visit_type: 'visit' | 'umrah' | 'tourism' | 'goethe' | 'embassy'
  travel_date: string
  days_count: number
  city: string
  destination?: string | null
  companions_count?: number
  companions_data?: any | null
  driver_name?: string | null
  driver_phone?: string | null
  vehicle_type?: string | null
  seats_count?: number | null
  route_id?: string | null
  assigned_driver_id?: string | null
  route_going?: string | null
  route_return?: string | null
  hotel_name?: string | null
  hotel_location?: string | null
  rooms_count?: number | null
  nights_count?: number | null
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'completed'
  rejection_reason?: string | null
  deposit_paid?: boolean
  deposit_amount?: number | null
  total_amount?: number | null
  remaining_amount?: number | null
  payment_verified?: boolean | null
  payment_verified_at?: string | null
  payment_verified_by?: string | null
  assigned_to?: string | null
  assigned_by?: string | null
  assigned_at?: string | null
  admin_notes?: string | null
  arrival_date?: string | null
  departure_date?: string | null
  trip_status?: 'pending_arrival' | 'scheduled_pending_approval' | 'arrived' | 'completed' | null
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id?: string
  user_id: string
  full_name: string | null
  phone: string | null
  jordan_phone?: string | null
  whatsapp_phone?: string | null
  created_at?: string
}

export interface AdminStats {
  total: number
  newRequests: number
  received: number
  underReview: number
  inProgress: number
  bookings: number
  approved: number
  rejected: number
  completed: number
}


