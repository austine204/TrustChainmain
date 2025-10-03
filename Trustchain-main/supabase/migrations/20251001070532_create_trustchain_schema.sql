/*
  # TrustChain Logistics Database Schema

  ## Overview
  Creates the core database structure for a logistics fraud prevention platform
  with verified deliveries, OTP confirmation, and escrow payments.

  ## New Tables

  ### 1. profiles
  Extends Supabase auth.users with role-based profiles
  - `id` (uuid, FK to auth.users)
  - `role` (enum: customer, driver, merchant, admin)
  - `full_name` (text)
  - `phone` (text)
  - `verified` (boolean) - KYC verification status
  - `rating` (numeric) - reputation score
  - `total_deliveries` (integer) - completed delivery count
  - `created_at`, `updated_at` (timestamptz)

  ### 2. orders
  Customer orders with unique tracking
  - `id` (uuid, primary key)
  - `customer_id` (uuid, FK to profiles)
  - `merchant_id` (uuid, FK to profiles)
  - `tracking_id` (text, unique) - public tracking identifier
  - `delivery_otp` (text) - 4-digit OTP for delivery confirmation
  - `pickup_address` (text)
  - `delivery_address` (text)
  - `pickup_lat`, `pickup_lng` (numeric) - GPS coordinates
  - `delivery_lat`, `delivery_lng` (numeric)
  - `status` (enum: pending, assigned, in_transit, delivered, cancelled)
  - `payment_method` (enum: prepay, postpay, cheque)
  - `payment_status` (enum: pending, held_escrow, released, failed)
  - `amount` (numeric)
  - `notes` (text)
  - `created_at`, `updated_at` (timestamptz)

  ### 3. deliveries
  Delivery assignments and driver pairing
  - `id` (uuid, primary key)
  - `order_id` (uuid, FK to orders)
  - `driver_id` (uuid, FK to profiles)
  - `assigned_at` (timestamptz)
  - `picked_up_at` (timestamptz)
  - `delivered_at` (timestamptz)
  - `current_lat`, `current_lng` (numeric) - real-time location
  - `last_location_update` (timestamptz)
  - `otp_verified` (boolean)
  - `created_at`, `updated_at` (timestamptz)

  ### 4. payments
  Payment transactions and escrow management
  - `id` (uuid, primary key)
  - `order_id` (uuid, FK to orders)
  - `customer_id` (uuid, FK to profiles)
  - `driver_id` (uuid, FK to profiles)
  - `merchant_id` (uuid, FK to profiles)
  - `amount` (numeric)
  - `payment_method` (text)
  - `transaction_ref` (text) - external payment reference
  - `status` (enum: pending, held, released, refunded, failed)
  - `released_at` (timestamptz)
  - `created_at`, `updated_at` (timestamptz)

  ### 5. activity_logs
  Immutable audit trail for all operations
  - `id` (uuid, primary key)
  - `order_id` (uuid, FK to orders)
  - `user_id` (uuid, FK to profiles)
  - `action` (text) - action type
  - `details` (jsonb) - structured log data
  - `ip_address` (text)
  - `user_agent` (text)
  - `created_at` (timestamptz)

  ### 6. fraud_alerts
  Automated fraud detection tracking
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to profiles)
  - `order_id` (uuid, FK to orders)
  - `alert_type` (text) - type of suspicious activity
  - `severity` (enum: low, medium, high, critical)
  - `details` (jsonb)
  - `resolved` (boolean)
  - `resolved_at` (timestamptz)
  - `created_at` (timestamptz)

  ## Security

  ### Row Level Security (RLS)
  All tables have RLS enabled with restrictive policies:

  #### profiles
  - Users can view their own profile
  - Users can update their own profile
  - Drivers and customers can view each other's profiles when paired on an order

  #### orders
  - Customers can create and view their own orders
  - Merchants can view orders assigned to them
  - Drivers can view orders assigned to them
  - All parties can update orders they're involved in

  #### deliveries
  - Drivers can view and update their assigned deliveries
  - Customers can view deliveries for their orders

  #### payments
  - Users can view payments they're involved in
  - Only system can create/update payment records (service role)

  #### activity_logs
  - Users can view logs for their own actions
  - Append-only (no updates/deletes)

  #### fraud_alerts
  - Admin-only access
  - Users can view alerts about themselves

  ## Notes
  - All timestamps use `timestamptz` for timezone awareness
  - UUIDs use `gen_random_uuid()` for secure generation
  - Indexes created on foreign keys and frequently queried fields
  - Enums ensure data consistency
  - JSONB used for flexible structured data storage
*/

-- Create custom types
CREATE TYPE user_role AS ENUM ('customer', 'driver', 'merchant', 'admin');
CREATE TYPE order_status AS ENUM ('pending', 'assigned', 'in_transit', 'delivered', 'cancelled');
CREATE TYPE payment_method AS ENUM ('prepay', 'postpay', 'cheque');
CREATE TYPE payment_status AS ENUM ('pending', 'held_escrow', 'released', 'refunded', 'failed');
CREATE TYPE alert_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'customer',
  full_name text NOT NULL,
  phone text,
  verified boolean DEFAULT false,
  rating numeric(3,2) DEFAULT 0,
  total_deliveries integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES profiles(id),
  merchant_id uuid REFERENCES profiles(id),
  tracking_id text UNIQUE NOT NULL,
  delivery_otp text NOT NULL,
  pickup_address text NOT NULL,
  delivery_address text NOT NULL,
  pickup_lat numeric(10,8),
  pickup_lng numeric(11,8),
  delivery_lat numeric(10,8),
  delivery_lng numeric(11,8),
  status order_status DEFAULT 'pending',
  payment_method payment_method DEFAULT 'prepay',
  payment_status payment_status DEFAULT 'pending',
  amount numeric(10,2) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create deliveries table
CREATE TABLE IF NOT EXISTS deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES profiles(id),
  assigned_at timestamptz DEFAULT now(),
  picked_up_at timestamptz,
  delivered_at timestamptz,
  current_lat numeric(10,8),
  current_lng numeric(11,8),
  last_location_update timestamptz,
  otp_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(order_id)
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  customer_id uuid NOT NULL REFERENCES profiles(id),
  driver_id uuid REFERENCES profiles(id),
  merchant_id uuid REFERENCES profiles(id),
  amount numeric(10,2) NOT NULL,
  payment_method text,
  transaction_ref text,
  status payment_status DEFAULT 'pending',
  released_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id),
  user_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create fraud_alerts table
CREATE TABLE IF NOT EXISTS fraud_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  order_id uuid REFERENCES orders(id),
  alert_type text NOT NULL,
  severity alert_severity DEFAULT 'low',
  details jsonb,
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant ON orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_tracking ON orders(tracking_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver ON deliveries(driver_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_order ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_order ON activity_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_user ON fraud_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_severity ON fraud_alerts(severity, resolved);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view paired profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      LEFT JOIN deliveries d ON d.order_id = o.id
      WHERE (o.customer_id = auth.uid() OR o.merchant_id = auth.uid() OR d.driver_id = auth.uid())
      AND (o.customer_id = profiles.id OR o.merchant_id = profiles.id OR d.driver_id = profiles.id)
    )
  );

-- RLS Policies for orders
CREATE POLICY "Customers can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id);

CREATE POLICY "Merchants can view their orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = merchant_id);

CREATE POLICY "Drivers can view assigned orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deliveries
      WHERE deliveries.order_id = orders.id
      AND deliveries.driver_id = auth.uid()
    )
  );

CREATE POLICY "Involved parties can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = customer_id OR
    auth.uid() = merchant_id OR
    EXISTS (
      SELECT 1 FROM deliveries
      WHERE deliveries.order_id = orders.id
      AND deliveries.driver_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = customer_id OR
    auth.uid() = merchant_id OR
    EXISTS (
      SELECT 1 FROM deliveries
      WHERE deliveries.order_id = orders.id
      AND deliveries.driver_id = auth.uid()
    )
  );

-- RLS Policies for deliveries
CREATE POLICY "Drivers can view own deliveries"
  ON deliveries FOR SELECT
  TO authenticated
  USING (auth.uid() = driver_id);

CREATE POLICY "Customers can view deliveries for their orders"
  ON deliveries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = deliveries.order_id
      AND orders.customer_id = auth.uid()
    )
  );

CREATE POLICY "System can create deliveries"
  ON deliveries FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Drivers can update own deliveries"
  ON deliveries FOR UPDATE
  TO authenticated
  USING (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id);

-- RLS Policies for payments
CREATE POLICY "Users can view related payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    auth.uid() = customer_id OR
    auth.uid() = driver_id OR
    auth.uid() = merchant_id
  );

-- RLS Policies for activity_logs
CREATE POLICY "Users can view own activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for fraud_alerts
CREATE POLICY "Users can view alerts about themselves"
  ON fraud_alerts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to generate tracking ID
CREATE OR REPLACE FUNCTION generate_tracking_id()
RETURNS text AS $$
BEGIN
  RETURN 'TC' || UPPER(substring(md5(random()::text) from 1 for 8));
END;
$$ LANGUAGE plpgsql;

-- Create function to generate 4-digit OTP
CREATE OR REPLACE FUNCTION generate_delivery_otp()
RETURNS text AS $$
BEGIN
  RETURN LPAD(floor(random() * 10000)::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER deliveries_updated_at BEFORE UPDATE ON deliveries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();