-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  seats_count INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create visit_requests table
CREATE TABLE IF NOT EXISTS visit_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Visitor data
  visitor_name TEXT NOT NULL,
  nationality TEXT NOT NULL,
  passport_number TEXT NOT NULL,
  passport_expiry DATE NOT NULL,
  passport_image_url TEXT,
  
  -- Trip data
  visit_type TEXT NOT NULL CHECK (visit_type IN ('visit', 'umrah', 'tourism')),
  travel_date DATE NOT NULL,
  days_count INTEGER NOT NULL,
  city TEXT NOT NULL,
  destination TEXT,
  
  -- Companions data
  companions_count INTEGER DEFAULT 0,
  companions_data JSONB,
  
  -- Driver and transport data
  driver_name TEXT,
  driver_phone TEXT,
  vehicle_type TEXT,
  seats_count INTEGER,
  route_going TEXT,
  route_return TEXT,
  
  -- Accommodation data
  hotel_name TEXT,
  hotel_location TEXT,
  rooms_count INTEGER,
  nights_count INTEGER,
  
  -- Status and payment
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  rejection_reason TEXT,
  deposit_paid BOOLEAN DEFAULT false,
  deposit_amount DECIMAL(10, 2),
  total_amount DECIMAL(10, 2),
  remaining_amount DECIMAL(10, 2),
  admin_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES visit_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_visit_requests_user_id ON visit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_visit_requests_status ON visit_requests(status);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_request_id ON bookings(request_id);
CREATE INDEX IF NOT EXISTS idx_drivers_is_active ON drivers(is_active);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visit_requests_updated_at BEFORE UPDATE ON visit_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for visit_requests
CREATE POLICY "Users can view their own requests"
  ON visit_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own requests"
  ON visit_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own requests"
  ON visit_requests FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for bookings
CREATE POLICY "Users can view their own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for drivers (public read, admin write)
CREATE POLICY "Anyone can view active drivers"
  ON drivers FOR SELECT
  USING (is_active = true);

-- Create storage bucket for passports
INSERT INTO storage.buckets (id, name, public)
VALUES ('passports', 'passports', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for passports bucket
CREATE POLICY "Users can upload their own passport images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'passports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own passport images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'passports' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Insert sample drivers
INSERT INTO drivers (name, phone, vehicle_type, seats_count, is_active) VALUES
  ('أحمد محمد', '+966501234567', 'سيارة سيدان', 4, true),
  ('خالد علي', '+966502345678', 'فان', 8, true),
  ('محمد حسن', '+966503456789', 'باص', 20, true)
ON CONFLICT DO NOTHING;

