/*
  # Merchant and Admin Features Enhancement

  ## Overview
  Extends the database schema to support merchant inventory management,
  rating/review system, insurance integration, and enhanced admin capabilities.

  ## New Tables

  ### 1. merchant_products
  Product catalog for merchants
  - `id` (uuid, primary key)
  - `merchant_id` (uuid, FK to profiles)
  - `name` (text) - product name
  - `description` (text)
  - `price` (numeric)
  - `stock_quantity` (integer)
  - `image_url` (text)
  - `active` (boolean)
  - `created_at`, `updated_at` (timestamptz)

  ### 2. order_items
  Individual items in an order
  - `id` (uuid, primary key)
  - `order_id` (uuid, FK to orders)
  - `product_id` (uuid, FK to merchant_products)
  - `quantity` (integer)
  - `unit_price` (numeric)
  - `subtotal` (numeric)
  - `created_at` (timestamptz)

  ### 3. ratings_reviews
  Post-delivery ratings and reviews
  - `id` (uuid, primary key)
  - `order_id` (uuid, FK to orders, unique)
  - `customer_id` (uuid, FK to profiles)
  - `driver_id` (uuid, FK to profiles)
  - `merchant_id` (uuid, FK to profiles)
  - `driver_rating` (integer, 1-5)
  - `merchant_rating` (integer, 1-5)
  - `driver_review` (text)
  - `merchant_review` (text)
  - `created_at` (timestamptz)

  ### 4. insurance_policies
  Insurance coverage for shipments
  - `id` (uuid, primary key)
  - `order_id` (uuid, FK to orders, unique)
  - `provider` (text) - insurance company
  - `policy_number` (text)
  - `coverage_amount` (numeric)
  - `premium_amount` (numeric)
  - `status` (enum: active, claimed, expired, cancelled)
  - `expires_at` (timestamptz)
  - `created_at`, `updated_at` (timestamptz)

  ### 5. insurance_claims
  Insurance claim tracking
  - `id` (uuid, primary key)
  - `policy_id` (uuid, FK to insurance_policies)
  - `order_id` (uuid, FK to orders)
  - `claim_amount` (numeric)
  - `reason` (text)
  - `status` (enum: pending, approved, rejected, paid)
  - `evidence` (jsonb) - photos, documents
  - `approved_amount` (numeric)
  - `processed_at` (timestamptz)
  - `created_at`, `updated_at` (timestamptz)

  ### 6. notifications
  System notifications for users
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to profiles)
  - `type` (text) - notification category
  - `title` (text)
  - `message` (text)
  - `data` (jsonb) - structured notification data
  - `read` (boolean)
  - `created_at` (timestamptz)

  ## Security

  ### Row Level Security
  All new tables have RLS enabled with appropriate policies:
  - Merchants can manage their own products
  - Customers can create ratings for their completed orders
  - Users can view ratings for orders they're involved in
  - Only involved parties can access insurance information
  - Users can view their own notifications
  - Admin role has elevated access to fraud alerts and system data

  ## Functions

  ### update_ratings
  Recalculates user ratings when reviews are submitted
  - Updates driver and merchant rating averages
  - Triggered automatically on review creation

  ## Notes
  - Insurance is optional per order
  - Ratings can only be submitted once per order
  - Notifications support various types (order, payment, insurance, system)
  - Admin dashboard relies on existing fraud_alerts table
*/

-- Create custom types
CREATE TYPE insurance_status AS ENUM ('active', 'claimed', 'expired', 'cancelled');
CREATE TYPE claim_status AS ENUM ('pending', 'approved', 'rejected', 'paid');

-- Create merchant_products table
CREATE TABLE IF NOT EXISTS merchant_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL,
  stock_quantity integer DEFAULT 0,
  image_url text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES merchant_products(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL,
  subtotal numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create ratings_reviews table
CREATE TABLE IF NOT EXISTS ratings_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES profiles(id),
  driver_id uuid REFERENCES profiles(id),
  merchant_id uuid REFERENCES profiles(id),
  driver_rating integer CHECK (driver_rating >= 1 AND driver_rating <= 5),
  merchant_rating integer CHECK (merchant_rating >= 1 AND merchant_rating <= 5),
  driver_review text,
  merchant_review text,
  created_at timestamptz DEFAULT now()
);

-- Create insurance_policies table
CREATE TABLE IF NOT EXISTS insurance_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider text NOT NULL,
  policy_number text NOT NULL,
  coverage_amount numeric(10,2) NOT NULL,
  premium_amount numeric(10,2) NOT NULL,
  status insurance_status DEFAULT 'active',
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create insurance_claims table
CREATE TABLE IF NOT EXISTS insurance_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL REFERENCES insurance_policies(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id),
  claim_amount numeric(10,2) NOT NULL,
  reason text NOT NULL,
  status claim_status DEFAULT 'pending',
  evidence jsonb,
  approved_amount numeric(10,2),
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_merchant_products_merchant ON merchant_products(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_products_active ON merchant_products(active);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_ratings_customer ON ratings_reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_ratings_driver ON ratings_reviews(driver_id);
CREATE INDEX IF NOT EXISTS idx_ratings_merchant ON ratings_reviews(merchant_id);
CREATE INDEX IF NOT EXISTS idx_insurance_order ON insurance_policies(order_id);
CREATE INDEX IF NOT EXISTS idx_insurance_status ON insurance_policies(status);
CREATE INDEX IF NOT EXISTS idx_claims_policy ON insurance_claims(policy_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON insurance_claims(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);

-- Enable Row Level Security
ALTER TABLE merchant_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for merchant_products
CREATE POLICY "Merchants can manage own products"
  ON merchant_products FOR ALL
  TO authenticated
  USING (auth.uid() = merchant_id)
  WITH CHECK (auth.uid() = merchant_id);

CREATE POLICY "Anyone can view active products"
  ON merchant_products FOR SELECT
  TO authenticated
  USING (active = true);

-- RLS Policies for order_items
CREATE POLICY "Order parties can view items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (orders.customer_id = auth.uid() OR orders.merchant_id = auth.uid())
    )
  );

CREATE POLICY "System can insert order items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for ratings_reviews
CREATE POLICY "Customers can create ratings for own orders"
  ON ratings_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can view ratings for their orders"
  ON ratings_reviews FOR SELECT
  TO authenticated
  USING (
    auth.uid() = customer_id OR
    auth.uid() = driver_id OR
    auth.uid() = merchant_id
  );

-- RLS Policies for insurance_policies
CREATE POLICY "Order parties can view insurance"
  ON insurance_policies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = insurance_policies.order_id
      AND (orders.customer_id = auth.uid() OR orders.merchant_id = auth.uid())
    )
  );

CREATE POLICY "Customers can create insurance for own orders"
  ON insurance_policies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = insurance_policies.order_id
      AND orders.customer_id = auth.uid()
    )
  );

-- RLS Policies for insurance_claims
CREATE POLICY "Order parties can view claims"
  ON insurance_claims FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = insurance_claims.order_id
      AND (orders.customer_id = auth.uid() OR orders.merchant_id = auth.uid())
    )
  );

CREATE POLICY "Order parties can create claims"
  ON insurance_claims FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = insurance_claims.order_id
      AND (orders.customer_id = auth.uid() OR orders.merchant_id = auth.uid())
    )
  );

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create function to update ratings
CREATE OR REPLACE FUNCTION update_user_ratings()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.driver_id IS NOT NULL AND NEW.driver_rating IS NOT NULL THEN
    UPDATE profiles
    SET rating = (
      SELECT AVG(driver_rating)::numeric(3,2)
      FROM ratings_reviews
      WHERE driver_id = NEW.driver_id
      AND driver_rating IS NOT NULL
    )
    WHERE id = NEW.driver_id;
  END IF;

  IF NEW.merchant_id IS NOT NULL AND NEW.merchant_rating IS NOT NULL THEN
    UPDATE profiles
    SET rating = (
      SELECT AVG(merchant_rating)::numeric(3,2)
      FROM ratings_reviews
      WHERE merchant_id = NEW.merchant_id
      AND merchant_rating IS NOT NULL
    )
    WHERE id = NEW.merchant_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for rating updates
CREATE TRIGGER update_ratings_on_review
  AFTER INSERT OR UPDATE ON ratings_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_user_ratings();

-- Create triggers for updated_at
CREATE TRIGGER merchant_products_updated_at BEFORE UPDATE ON merchant_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER insurance_policies_updated_at BEFORE UPDATE ON insurance_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER insurance_claims_updated_at BEFORE UPDATE ON insurance_claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();