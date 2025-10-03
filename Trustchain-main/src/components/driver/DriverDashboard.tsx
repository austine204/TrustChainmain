import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  Package,
  MapPin,
  CheckCircle,
  Clock,
  Navigation,
  LogOut,
  Star,
  Award,
} from 'lucide-react';
import { AvailableOrdersList } from './AvailableOrdersList';
import { ActiveDeliveryCard } from './ActiveDeliveryCard';
import type { Database } from '../../lib/database.types';

type Delivery = Database['public']['Tables']['deliveries']['Row'] & {
  orders: Database['public']['Tables']['orders']['Row'];
};

export function DriverDashboard() {
  const { profile, signOut } = useAuth();
  const [activeDeliveries, setActiveDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveDeliveries();

    const channel = supabase
      .channel('driver-deliveries')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deliveries',
          filter: `driver_id=eq.${profile?.id}`,
        },
        () => {
          loadActiveDeliveries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  async function loadActiveDeliveries() {
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*, orders(*)')
        .neq('orders.status', 'delivered')
        .neq('orders.status', 'cancelled')
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      setActiveDeliveries(data || []);
    } catch (error) {
      console.error('Error loading deliveries:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Driver Dashboard</h1>
            <p className="text-slate-400">Welcome back, {profile?.full_name}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-100 text-sm">Your Rating</span>
              <Star className="w-5 h-5 text-yellow-300" />
            </div>
            <div className="text-3xl font-bold">{profile?.rating.toFixed(1)}</div>
            <div className="text-blue-100 text-sm">out of 5.0</div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Total Deliveries</span>
              <Award className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-3xl font-bold text-white">{profile?.total_deliveries || 0}</div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Active Deliveries</span>
              <Navigation className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="text-3xl font-bold text-white">{activeDeliveries.length}</div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Status</span>
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-lg font-bold text-green-400">
              {profile?.verified ? 'Verified' : 'Pending'}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading deliveries...</div>
        ) : (
          <>
            {activeDeliveries.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">Active Deliveries</h2>
                <div className="space-y-4">
                  {activeDeliveries.map((delivery) => (
                    <ActiveDeliveryCard
                      key={delivery.id}
                      delivery={delivery}
                      onUpdate={loadActiveDeliveries}
                    />
                  ))}
                </div>
              </div>
            )}

            <AvailableOrdersList onOrderAccepted={loadActiveDeliveries} />
          </>
        )}
      </div>
    </div>
  );
}
