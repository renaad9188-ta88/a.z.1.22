export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      visit_requests: {
        Row: {
          id: string
          user_id: string
          visitor_name: string
          nationality: string
          passport_number: string
          passport_expiry: string
          passport_image_url: string | null
          visit_type: 'visit' | 'umrah' | 'tourism'
          travel_date: string
          days_count: number
          city: string
          destination: string | null
          companions_count: number
          companions_data: any | null
          driver_name: string | null
          driver_phone: string | null
          vehicle_type: string | null
          seats_count: number | null
          route_going: string | null
          route_return: string | null
          hotel_name: string | null
          hotel_location: string | null
          rooms_count: number | null
          nights_count: number | null
          status: 'pending' | 'under_review' | 'approved' | 'rejected'
          rejection_reason: string | null
          deposit_paid: boolean
          deposit_amount: number | null
          total_amount: number | null
          remaining_amount: number | null
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          visitor_name: string
          nationality: string
          passport_number: string
          passport_expiry: string
          passport_image_url?: string | null
          visit_type: 'visit' | 'umrah' | 'tourism'
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
          route_going?: string | null
          route_return?: string | null
          hotel_name?: string | null
          hotel_location?: string | null
          rooms_count?: number | null
          nights_count?: number | null
          status?: 'pending' | 'under_review' | 'approved' | 'rejected'
          rejection_reason?: string | null
          deposit_paid?: boolean
          deposit_amount?: number | null
          total_amount?: number | null
          remaining_amount?: number | null
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          visitor_name?: string
          nationality?: string
          passport_number?: string
          passport_expiry?: string
          passport_image_url?: string | null
          visit_type?: 'visit' | 'umrah' | 'tourism'
          travel_date?: string
          days_count?: number
          city?: string
          destination?: string | null
          companions_count?: number
          companions_data?: any | null
          driver_name?: string | null
          driver_phone?: string | null
          vehicle_type?: string | null
          seats_count?: number | null
          route_going?: string | null
          route_return?: string | null
          hotel_name?: string | null
          hotel_location?: string | null
          rooms_count?: number | null
          nights_count?: number | null
          status?: 'pending' | 'under_review' | 'approved' | 'rejected'
          rejection_reason?: string | null
          deposit_paid?: boolean
          deposit_amount?: number | null
          total_amount?: number | null
          remaining_amount?: number | null
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      drivers: {
        Row: {
          id: string
          name: string
          phone: string
          vehicle_type: string
          seats_count: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          phone: string
          vehicle_type: string
          seats_count: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string
          vehicle_type?: string
          seats_count?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          request_id: string
          user_id: string
          status: 'confirmed' | 'cancelled' | 'completed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          request_id: string
          user_id: string
          status?: 'confirmed' | 'cancelled' | 'completed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          user_id?: string
          status?: 'confirmed' | 'cancelled' | 'completed'
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

