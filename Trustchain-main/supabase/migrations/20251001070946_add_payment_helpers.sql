/*
  # Payment and Profile Helpers

  ## Overview
  Adds helper functions for payment processing and profile updates.

  ## New Functions

  ### 1. increment
  Generic function to increment numeric columns safely
  - Used for incrementing delivery counts, ratings, etc.
  - Prevents race conditions with atomic updates

  ### 2. create_payment_on_order
  Automatically creates payment record when order is created
  - Triggered on order insertion
  - Creates escrow payment for prepay orders
  - Links payment to customer and merchant

  ## Changes
  - Adds trigger to auto-create payments
  - Adds RPC function for safe increments

  ## Notes
  - Payments are created in 'held_escrow' status for prepay
  - Payment release happens on delivery confirmation
*/

-- Create increment function for safe numeric updates
CREATE OR REPLACE FUNCTION increment(
  table_name text,
  row_id uuid,
  column_name text,
  increment_by integer DEFAULT 1
)
RETURNS void AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET %I = COALESCE(%I, 0) + %L WHERE id = %L',
    table_name,
    column_name,
    column_name,
    increment_by,
    row_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to auto-create payment on order
CREATE OR REPLACE FUNCTION create_payment_on_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_method = 'prepay' THEN
    INSERT INTO payments (
      order_id,
      customer_id,
      merchant_id,
      amount,
      payment_method,
      status
    ) VALUES (
      NEW.id,
      NEW.customer_id,
      NEW.merchant_id,
      NEW.amount,
      NEW.payment_method,
      'held_escrow'
    );

    UPDATE orders
    SET payment_status = 'held_escrow'
    WHERE id = NEW.id;
  ELSE
    INSERT INTO payments (
      order_id,
      customer_id,
      merchant_id,
      amount,
      payment_method,
      status
    ) VALUES (
      NEW.id,
      NEW.customer_id,
      NEW.merchant_id,
      NEW.amount,
      NEW.payment_method,
      'pending'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for payment creation
DROP TRIGGER IF EXISTS create_payment_on_order_insert ON orders;
CREATE TRIGGER create_payment_on_order_insert
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION create_payment_on_order();
