import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Package, MapPin, DollarSign } from 'lucide-react';
import type { Database } from '../../lib/database.types';

type Order = Database['public']['Tables']['orders']['Row'];

interface AvailableOrdersListProps {
  onOrderAccepted: () => void;
}

export function AvailableOrdersList({ onOrderAccepted }: AvailableOrdersListProps) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  useEffect(() => {
    loadAvailableOrders();

    const channel = supabase
      .channel('available-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: 'status=eq.pending',
        },
        () => {
          loadAvailableOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadAvailableOrders() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  }

  async function acceptOrder(orderId: string) {
    if (!user) return;

    setAccepting(orderId);
    try {
      const { error: deliveryError } = await supabase.from('deliveries').insert({
        order_id: orderId,
        driver_id: user.id,
      });

      if (deliveryError) throw deliveryError;

      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'assigned' })
        .eq('id', orderId);

      if (orderError) throw orderError;

      await supabase.from('activity_logs').insert({
        order_id: orderId,
        user_id: user.id,
        action: 'order_accepted',
      });

      onOrderAccepted();
    } catch (error) {
      console.error('Error accepting order:', error);
      alert('Failed to accept order. Please try again.');
    } finally {
      setAccepting(null);
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-slate-400">Loading available orders...</div>;
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-4">Available Orders</h2>

      {orders.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-8 text-center border border-slate-700">
          <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No available orders at the moment</p>
          <p className="text-slate-500 text-sm mt-2">New orders will appear here automatically</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="text-lg font-semibold text-white mb-1">
                    #{order.tracking_id}
                  </div>
                  <div className="text-sm text-slate-400">
                    {new Date(order.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-green-400 text-xl font-bold">
                    <DollarSign className="w-5 h-5" />
                    {order.amount.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-400 capitalize">{order.payment_method}</div>
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
                  <div className="text-xs text-slate-500 mb-1">Special Instructions</div>
                  <div className="text-sm text-slate-300">{order.notes}</div>
                </div>
              )}

              <button
                onClick={() => acceptOrder(order.id)}
                disabled={accepting === order.id}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors"
              >
                {accepting === order.id ? 'Accepting...' : 'Accept Delivery'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
