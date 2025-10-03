export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'customer' | 'driver' | 'merchant' | 'admin'
          full_name: string
          phone: string | null
          verified: boolean
          rating: number
          total_deliveries: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: 'customer' | 'driver' | 'merchant' | 'admin'
          full_name: string
          phone?: string | null
          verified?: boolean
          rating?: number
          total_deliveries?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: 'customer' | 'driver' | 'merchant' | 'admin'
          full_name?: string
          phone?: string | null
          verified?: boolean
          rating?: number
          total_deliveries?: number
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          customer_id: string
          merchant_id: string | null
          tracking_id: string
          delivery_otp: string
          pickup_address: string
          delivery_address: string
          pickup_lat: number | null
          pickup_lng: number | null
          delivery_lat: number | null
          delivery_lng: number | null
          status: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled'
          payment_method: 'prepay' | 'postpay' | 'cheque'
          payment_status: 'pending' | 'held_escrow' | 'released' | 'refunded' | 'failed'
          amount: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          merchant_id?: string | null
          tracking_id: string
          delivery_otp: string
          pickup_address: string
          delivery_address: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          status?: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled'
          payment_method?: 'prepay' | 'postpay' | 'cheque'
          payment_status?: 'pending' | 'held_escrow' | 'released' | 'refunded' | 'failed'
          amount: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          merchant_id?: string | null
          tracking_id?: string
          delivery_otp?: string
          pickup_address?: string
          delivery_address?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          status?: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled'
          payment_method?: 'prepay' | 'postpay' | 'cheque'
          payment_status?: 'pending' | 'held_escrow' | 'released' | 'refunded' | 'failed'
          amount?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      deliveries: {
        Row: {
          id: string
          order_id: string
          driver_id: string
          assigned_at: string
          picked_up_at: string | null
          delivered_at: string | null
          current_lat: number | null
          current_lng: number | null
          last_location_update: string | null
          otp_verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          driver_id: string
          assigned_at?: string
          picked_up_at?: string | null
          delivered_at?: string | null
          current_lat?: number | null
          current_lng?: number | null
          last_location_update?: string | null
          otp_verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          driver_id?: string
          assigned_at?: string
          picked_up_at?: string | null
          delivered_at?: string | null
          current_lat?: number | null
          current_lng?: number | null
          last_location_update?: string | null
          otp_verified?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          order_id: string
          customer_id: string
          driver_id: string | null
          merchant_id: string | null
          amount: number
          payment_method: string | null
          transaction_ref: string | null
          status: 'pending' | 'held_escrow' | 'released' | 'refunded' | 'failed'
          released_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          customer_id: string
          driver_id?: string | null
          merchant_id?: string | null
          amount: number
          payment_method?: string | null
          transaction_ref?: string | null
          status?: 'pending' | 'held_escrow' | 'released' | 'refunded' | 'failed'
          released_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          customer_id?: string
          driver_id?: string | null
          merchant_id?: string | null
          amount?: number
          payment_method?: string | null
          transaction_ref?: string | null
          status?: 'pending' | 'held_escrow' | 'released' | 'refunded' | 'failed'
          released_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      activity_logs: {
        Row: {
          id: string
          order_id: string | null
          user_id: string | null
          action: string
          details: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id?: string | null
          user_id?: string | null
          action: string
          details?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string | null
          user_id?: string | null
          action?: string
          details?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      fraud_alerts: {
        Row: {
          id: string
          user_id: string | null
          order_id: string | null
          alert_type: string
          severity: 'low' | 'medium' | 'high' | 'critical'
          details: Json | null
          resolved: boolean
          resolved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          order_id?: string | null
          alert_type: string
          severity?: 'low' | 'medium' | 'high' | 'critical'
          details?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          order_id?: string | null
          alert_type?: string
          severity?: 'low' | 'medium' | 'high' | 'critical'
          details?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          created_at?: string
        }
      }
      merchant_products: {
        Row: {
          id: string
          merchant_id: string
          name: string
          description: string | null
          price: number
          stock_quantity: number
          image_url: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          merchant_id: string
          name: string
          description?: string | null
          price: number
          stock_quantity?: number
          image_url?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          merchant_id?: string
          name?: string
          description?: string | null
          price?: number
          stock_quantity?: number
          image_url?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          quantity: number
          unit_price: number
          subtotal: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          quantity?: number
          unit_price: number
          subtotal: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          unit_price?: number
          subtotal?: number
          created_at?: string
        }
      }
      ratings_reviews: {
        Row: {
          id: string
          order_id: string
          customer_id: string
          driver_id: string | null
          merchant_id: string | null
          driver_rating: number | null
          merchant_rating: number | null
          driver_review: string | null
          merchant_review: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          customer_id: string
          driver_id?: string | null
          merchant_id?: string | null
          driver_rating?: number | null
          merchant_rating?: number | null
          driver_review?: string | null
          merchant_review?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          customer_id?: string
          driver_id?: string | null
          merchant_id?: string | null
          driver_rating?: number | null
          merchant_rating?: number | null
          driver_review?: string | null
          merchant_review?: string | null
          created_at?: string
        }
      }
      insurance_policies: {
        Row: {
          id: string
          order_id: string
          provider: string
          policy_number: string
          coverage_amount: number
          premium_amount: number
          status: 'active' | 'claimed' | 'expired' | 'cancelled'
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          provider: string
          policy_number: string
          coverage_amount: number
          premium_amount: number
          status?: 'active' | 'claimed' | 'expired' | 'cancelled'
          expires_at: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          provider?: string
          policy_number?: string
          coverage_amount?: number
          premium_amount?: number
          status?: 'active' | 'claimed' | 'expired' | 'cancelled'
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      insurance_claims: {
        Row: {
          id: string
          policy_id: string
          order_id: string
          claim_amount: number
          reason: string
          status: 'pending' | 'approved' | 'rejected' | 'paid'
          evidence: Json | null
          approved_amount: number | null
          processed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          policy_id: string
          order_id: string
          claim_amount: number
          reason: string
          status?: 'pending' | 'approved' | 'rejected' | 'paid'
          evidence?: Json | null
          approved_amount?: number | null
          processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          policy_id?: string
          order_id?: string
          claim_amount?: number
          reason?: string
          status?: 'pending' | 'approved' | 'rejected' | 'paid'
          evidence?: Json | null
          approved_amount?: number | null
          processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          data: Json | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message: string
          data?: Json | null
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string
          data?: Json | null
          read?: boolean
          created_at?: string
        }
      }
    }
    Functions: {
      generate_tracking_id: {
        Args: Record<string, never>
        Returns: string
      }
      generate_delivery_otp: {
        Args: Record<string, never>
        Returns: string
      }
      increment: {
        Args: {
          table_name: string
          row_id: string
          column_name: string
          increment_by?: number
        }
        Returns: void
      }
    }
  }
}
