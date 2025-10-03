import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Package, Plus, MapPin, Clock, CheckCircle, XCircle, LogOut, Star, Shield } from 'lucide-react';
import { CreateOrderModal } from './CreateOrderModal';
import { OrderTrackingModal } from './OrderTrackingModal';
import { RatingModal } from '../shared/RatingModal';
import { InsuranceModal } from '../shared/InsuranceModal';
import { NotificationCenter } from '../shared/NotificationCenter';
import type { Database } from '../../lib/database.types';

type Order = Database['public']['Tables']['orders']['Row'];

export function CustomerDashboard() {
  const { profile, signOut } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [ratingOrder, setRatingOrder] = useState<{
    order: Order;
    driverId: string | null;
    merchantId: string | null;
  } | null>(null);
  const [insuranceOrder, setInsuranceOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: Order['status']) {
    switch (status) {
      case 'pending':
        return 'bg-yellow-900/20 text-yellow-400 border-yellow-800';
      case 'assigned':
        return 'bg-blue-900/20 text-blue-400 border-blue-800';
      case 'in_transit':
        return 'bg-cyan-900/20 text-cyan-400 border-cyan-800';
      case 'delivered':
        return 'bg-green-900/20 text-green-400 border-green-800';
      case 'cancelled':
        return 'bg-red-900/20 text-red-400 border-red-800';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  }

  function getStatusIcon(status: Order['status']) {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'assigned':
      case 'in_transit':
        return <MapPin className="w-4 h-4" />;
      case 'delivered':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Customer Dashboard</h1>
            <p className="text-slate-400">Welcome back, {profile?.full_name}</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationCenter />
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Total Orders</span>
              <Package className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-white">{orders.length}</div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">In Transit</span>
              <MapPin className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="text-3xl font-bold text-white">
              {orders.filter((o) => o.status === 'in_transit').length}
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Delivered</span>
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-3xl font-bold text-white">
              {orders.filter((o) => o.status === 'delivered').length}
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Pending</span>
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="text-3xl font-bold text-white">
              {orders.filter((o) => o.status === 'pending').length}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Your Orders</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Order
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 bg-slate-800 rounded-xl border border-slate-700">
            <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-4">No orders yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Create Your First Order
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-white font-semibold">#{order.tracking_id}</span>
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {getStatusIcon(order.status)}
                        {order.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">KES {order.amount.toFixed(2)}</div>
                    <div className="text-xs text-slate-400 capitalize">{order.payment_method}</div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
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

                <div className="flex gap-2">
                  {(order.status === 'pending' || order.status === 'assigned') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setInsuranceOrder(order);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      <Shield className="w-4 h-4" />
                      Insure Shipment
                    </button>
                  )}

                  {order.status === 'delivered' && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const { data: delivery } = await supabase
                          .from('deliveries')
                          .select('driver_id')
                          .eq('order_id', order.id)
                          .maybeSingle();

                        setRatingOrder({
                          order,
                          driverId: delivery?.driver_id || null,
                          merchantId: order.merchant_id,
                        });
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <Star className="w-4 h-4" />
                      Rate This Delivery
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateOrderModal
          onClose={() => setShowCreateModal(false)}
          onOrderCreated={() => {
            setShowCreateModal(false);
            loadOrders();
          }}
        />
      )}

      {selectedOrder && (
        <OrderTrackingModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}

      {ratingOrder && (
        <RatingModal
          order={ratingOrder.order}
          driverId={ratingOrder.driverId}
          merchantId={ratingOrder.merchantId}
          onClose={() => setRatingOrder(null)}
          onSubmitted={() => loadOrders()}
        />
      )}

      {insuranceOrder && (
        <InsuranceModal
          order={insuranceOrder}
          onClose={() => setInsuranceOrder(null)}
          onInsured={() => loadOrders()}
        />
      )}
    </div>
  );
}
