import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, MapPin, User, Clock, CheckCircle, Phone, Star, Key } from 'lucide-react';
import { DeliveryMap } from '../shared/DeliveryMap';
import type { Database } from '../../lib/database.types';

type Order = Database['public']['Tables']['orders']['Row'];
type Delivery = Database['public']['Tables']['deliveries']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface OrderTrackingModalProps {
  order: Order;
  onClose: () => void;
}

export function OrderTrackingModal({ order, onClose }: OrderTrackingModalProps) {
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [driver, setDriver] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeliveryDetails();

    const channel = supabase
      .channel(`order-${order.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deliveries',
          filter: `order_id=eq.${order.id}`,
        },
        () => {
          loadDeliveryDetails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order.id]);

  async function loadDeliveryDetails() {
    try {
      const { data: deliveryData, error: deliveryError } = await supabase
        .from('deliveries')
        .select('*')
        .eq('order_id', order.id)
        .maybeSingle();

      if (deliveryError) throw deliveryError;
      setDelivery(deliveryData);

      if (deliveryData) {
        const { data: driverData, error: driverError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', deliveryData.driver_id)
          .single();

        if (driverError) throw driverError;
        setDriver(driverData);
      }
    } catch (error) {
      console.error('Error loading delivery details:', error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusSteps() {
    const steps = [
      { label: 'Order Placed', status: 'pending', completed: true },
      { label: 'Driver Assigned', status: 'assigned', completed: order.status !== 'pending' },
      {
        label: 'In Transit',
        status: 'in_transit',
        completed: order.status === 'in_transit' || order.status === 'delivered',
      },
      { label: 'Delivered', status: 'delivered', completed: order.status === 'delivered' },
    ];

    return steps;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Order Tracking</h2>
            <p className="text-sm text-slate-400">#{order.tracking_id}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-sm text-slate-400 mb-1">Delivery Amount</div>
                <div className="text-3xl font-bold text-white">KES {order.amount.toFixed(2)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-400 mb-1">Payment Method</div>
                <div className="text-lg font-semibold text-blue-400 capitalize">
                  {order.payment_method}
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="flex items-center justify-between">
                {getStatusSteps().map((step, index) => (
                  <div key={step.status} className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                        step.completed
                          ? 'bg-blue-600 border-blue-600'
                          : 'bg-slate-700 border-slate-600'
                      }`}
                    >
                      {step.completed ? (
                        <CheckCircle className="w-5 h-5 text-white" />
                      ) : (
                        <Clock className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div
                      className={`text-xs mt-2 text-center ${
                        step.completed ? 'text-white' : 'text-slate-500'
                      }`}
                    >
                      {step.label}
                    </div>
                    {index < getStatusSteps().length - 1 && (
                      <div
                        className={`absolute top-5 w-full h-0.5 ${
                          step.completed ? 'bg-blue-600' : 'bg-slate-700'
                        }`}
                        style={{
                          left: `${(index * 100) / (getStatusSteps().length - 1) + 12.5}%`,
                          width: `${75 / (getStatusSteps().length - 1)}%`,
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DeliveryMap
            pickupLat={order.pickup_lat}
            pickupLng={order.pickup_lng}
            deliveryLat={order.delivery_lat}
            deliveryLng={order.delivery_lng}
            currentLat={delivery?.current_lat}
            currentLng={delivery?.current_lng}
            pickupAddress={order.pickup_address}
            deliveryAddress={order.delivery_address}
          />

          {driver && delivery && (
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Driver Information</h3>

              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-8 h-8 text-white" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg font-semibold text-white">{driver.full_name}</span>
                    {driver.verified && (
                      <span className="px-2 py-1 bg-green-900/20 text-green-400 text-xs rounded-full border border-green-800">
                        Verified
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-1 text-slate-400 text-sm mb-1">
                        <Star className="w-4 h-4 text-yellow-400" />
                        Rating
                      </div>
                      <div className="text-white font-semibold">
                        {driver.rating.toFixed(1)} / 5.0
                      </div>
                    </div>

                    <div>
                      <div className="text-slate-400 text-sm mb-1">Deliveries</div>
                      <div className="text-white font-semibold">{driver.total_deliveries}</div>
                    </div>
                  </div>

                  {driver.phone && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <Phone className="w-4 h-4 text-blue-400" />
                      {driver.phone}
                    </div>
                  )}
                </div>
              </div>

              {order.status !== 'delivered' && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                    <Key className="w-4 h-4" />
                    Delivery OTP Code
                  </div>
                  <div className="text-3xl font-bold text-white tracking-wider">
                    {order.delivery_otp}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Provide this code to the driver upon delivery
                  </p>
                </div>
              )}
            </div>
          )}

          {!delivery && order.status === 'pending' && (
            <div className="bg-yellow-900/20 border border-yellow-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-yellow-400">
                <Clock className="w-5 h-5" />
                <span className="font-medium">Waiting for driver assignment</span>
              </div>
              <p className="text-yellow-400/80 text-sm mt-2">
                Your order is being matched with an available driver
              </p>
            </div>
          )}

          {order.notes && (
            <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
              <div className="text-sm font-medium text-slate-300 mb-2">Special Instructions</div>
              <p className="text-white">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
