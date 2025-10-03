import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useGeolocation } from '../../hooks/useGeolocation';
import {
  MapPin,
  Navigation,
  CheckCircle,
  Package as PackageIcon,
  User,
  Key,
} from 'lucide-react';
import type { Database } from '../../lib/database.types';

type Delivery = Database['public']['Tables']['deliveries']['Row'] & {
  orders: Database['public']['Tables']['orders']['Row'];
};

interface ActiveDeliveryCardProps {
  delivery: Delivery;
  onUpdate: () => void;
}

export function ActiveDeliveryCard({ delivery, onUpdate }: ActiveDeliveryCardProps) {
  const { user } = useAuth();
  const [otpInput, setOtpInput] = useState('');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const { latitude, longitude } = useGeolocation(true);

  const order = delivery.orders;

  useEffect(() => {
    if (latitude && longitude && order.status === 'in_transit') {
      updateLocation(latitude, longitude);
    }
  }, [latitude, longitude, order.status]);

  async function updateLocation(lat: number, lng: number) {
    try {
      await supabase
        .from('deliveries')
        .update({
          current_lat: lat,
          current_lng: lng,
          last_location_update: new Date().toISOString(),
        })
        .eq('id', delivery.id);
    } catch (error) {
      console.error('Error updating location:', error);
    }
  }

  async function updateStatus(newStatus: 'assigned' | 'in_transit' | 'delivered') {
    setUpdating(true);
    setError('');

    try {
      if (newStatus === 'delivered') {
        if (otpInput !== order.delivery_otp) {
          setError('Invalid OTP code. Please check and try again.');
          setUpdating(false);
          return;
        }

        const { error: deliveryError } = await supabase
          .from('deliveries')
          .update({
            otp_verified: true,
            delivered_at: new Date().toISOString(),
          })
          .eq('id', delivery.id);

        if (deliveryError) throw deliveryError;
      } else if (newStatus === 'in_transit' && !delivery.picked_up_at) {
        const { error: deliveryError } = await supabase
          .from('deliveries')
          .update({
            picked_up_at: new Date().toISOString(),
          })
          .eq('id', delivery.id);

        if (deliveryError) throw deliveryError;
      }

      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', order.id);

      if (orderError) throw orderError;

      await supabase.from('activity_logs').insert({
        order_id: order.id,
        user_id: user!.id,
        action: `order_${newStatus}`,
        details: {
          tracking_id: order.tracking_id,
        },
      });

      if (newStatus === 'delivered') {
        const { error: profileError } = await supabase.rpc('increment', {
          table_name: 'profiles',
          row_id: user!.id,
          column_name: 'total_deliveries',
        });

        if (profileError) console.error('Error updating delivery count:', profileError);

        const { error: paymentError } = await supabase
          .from('payments')
          .update({
            status: 'released',
            released_at: new Date().toISOString(),
          })
          .eq('order_id', order.id);

        if (paymentError) console.error('Error releasing payment:', paymentError);
      }

      onUpdate();
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'assigned':
        return 'bg-blue-900/20 text-blue-400 border-blue-800';
      case 'in_transit':
        return 'bg-cyan-900/20 text-cyan-400 border-cyan-800';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  }

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-white font-semibold">#{order.tracking_id}</span>
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                order.status
              )}`}
            >
              {order.status === 'assigned' && <PackageIcon className="w-3 h-3" />}
              {order.status === 'in_transit' && <Navigation className="w-3 h-3" />}
              {order.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <p className="text-slate-400 text-sm">
            Assigned {new Date(delivery.assigned_at).toLocaleDateString()}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">KES {order.amount.toFixed(2)}</div>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-xs text-slate-500 mb-1">Pickup</div>
            <div className="text-sm text-slate-300">{order.pickup_address}</div>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-red-400 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-xs text-slate-500 mb-1">Delivery</div>
            <div className="text-sm text-slate-300">{order.delivery_address}</div>
          </div>
        </div>
      </div>

      {order.notes && (
        <div className="mb-4 p-3 bg-slate-900 rounded-lg border border-slate-700">
          <div className="text-xs text-slate-500 mb-1">
            <User className="w-3 h-3 inline mr-1" />
            Customer Notes
          </div>
          <div className="text-sm text-slate-300">{order.notes}</div>
        </div>
      )}

      {order.status === 'assigned' && (
        <button
          onClick={() => updateStatus('in_transit')}
          disabled={updating}
          className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Navigation className="w-4 h-4" />
          {updating ? 'Starting...' : 'Start Delivery'}
        </button>
      )}

      {order.status === 'in_transit' && (
        <div className="space-y-3">
          <div className="p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-blue-400 mb-2">
              <Key className="w-4 h-4" />
              Enter Customer OTP to Complete
            </div>
            <input
              type="text"
              maxLength={4}
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
              placeholder="0000"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-center text-2xl font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={() => updateStatus('delivered')}
            disabled={updating || otpInput.length !== 4}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            {updating ? 'Completing...' : 'Complete Delivery'}
          </button>
        </div>
      )}
    </div>
  );
}
