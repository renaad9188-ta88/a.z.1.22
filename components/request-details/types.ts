export interface VisitRequest {
  id: string
  visitor_name: string
  nationality: string
  passport_number: string
  passport_expiry: string
  passport_image_url: string | null
  visit_type: string
  travel_date: string
  days_count: number
  city: string
  destination: string | null
  companions_count: number
  companions_data: any
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
  arrival_date?: string | null
  departure_date?: string | null
  trip_status?: string | null
  payment_verified?: boolean | null
  status: string
  rejection_reason: string | null
  deposit_paid: boolean
  deposit_amount: number | null
  total_amount: number | null
  remaining_amount: number | null
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export interface AdminInfo {
  jordanPhone?: string
  syrianPhone?: string
  purpose?: string
  paymentImages?: string[]
  accountName?: string
  tourismCompany?: string
  transportCompany?: string
  note?: string
  // post-approval (visit requests)
  guaranteeMethod?: string
  remainingPaymentMethod?: string
}




