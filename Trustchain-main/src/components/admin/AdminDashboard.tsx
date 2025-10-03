import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  Shield,
  AlertTriangle,
  TrendingUp,
  Users,
  Package,
  LogOut,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { FraudAlertsList } from './FraudAlertsList';
import { SystemStatsPanel } from './SystemStatsPanel';
import { NotificationCenter } from '../shared/NotificationCenter';
import type { Database } from '../../lib/database.types';

type FraudAlert = Database['public']['Tables']['fraud_alerts']['Row'];

export function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrders: 0,
    activeDeliveries: 0,
    unresolvedAlerts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('admin-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fraud_alerts',
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadData() {
    try {
      const [alertsResult, usersResult, ordersResult, deliveriesResult] = await Promise.all([
        supabase
          .from('fraud_alerts')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase
          .from('deliveries')
          .select('id', { count: 'exact', head: true })
          .is('delivered_at', null),
      ]);

      if (alertsResult.error) throw alertsResult.error;

      setAlerts(alertsResult.data || []);
      setStats({
        totalUsers: usersResult.count || 0,
        totalOrders: ordersResult.count || 0,
        activeDeliveries: deliveriesResult.count || 0,
        unresolvedAlerts: (alertsResult.data || []).filter((a) => !a.resolved).length,
      });
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function resolveAlert(alertId: string) {
    try {
      const { error } = await supabase
        .from('fraud_alerts')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error resolving alert:', error);
      alert('Failed to resolve alert');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Shield className="w-8 h-8 text-red-400" />
              Admin Dashboard
            </h1>
            <p className="text-slate-400">System monitoring and fraud prevention</p>
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
              <span className="text-slate-400 text-sm">Total Users</span>
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-white">{stats.totalUsers}</div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Total Orders</span>
              <Package className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-3xl font-bold text-white">{stats.totalOrders}</div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Active Deliveries</span>
              <TrendingUp className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="text-3xl font-bold text-white">{stats.activeDeliveries}</div>
          </div>

          <div
            className={`rounded-xl p-6 border ${
              stats.unresolvedAlerts > 0
                ? 'bg-red-900/20 border-red-800'
                : 'bg-slate-800 border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`text-sm ${
                  stats.unresolvedAlerts > 0 ? 'text-red-400' : 'text-slate-400'
                }`}
              >
                Fraud Alerts
              </span>
              <AlertTriangle
                className={`w-5 h-5 ${
                  stats.unresolvedAlerts > 0 ? 'text-red-400' : 'text-yellow-400'
                }`}
              />
            </div>
            <div
              className={`text-3xl font-bold ${
                stats.unresolvedAlerts > 0 ? 'text-red-400' : 'text-white'
              }`}
            >
              {stats.unresolvedAlerts}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading...</div>
        ) : (
          <>
            <SystemStatsPanel />

            <div className="mt-8">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Fraud Alerts
              </h2>

              {alerts.length === 0 ? (
                <div className="bg-slate-800 rounded-xl p-8 text-center border border-slate-700">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-slate-400">No fraud alerts</p>
                  <p className="text-slate-500 text-sm mt-2">System is operating normally</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`rounded-xl p-6 border ${
                        alert.resolved
                          ? 'bg-slate-800 border-slate-700'
                          : alert.severity === 'critical'
                          ? 'bg-red-900/20 border-red-800'
                          : alert.severity === 'high'
                          ? 'bg-orange-900/20 border-orange-800'
                          : 'bg-yellow-900/20 border-yellow-800'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium border ${
                                alert.severity === 'critical'
                                  ? 'bg-red-900/30 text-red-400 border-red-700'
                                  : alert.severity === 'high'
                                  ? 'bg-orange-900/30 text-orange-400 border-orange-700'
                                  : alert.severity === 'medium'
                                  ? 'bg-yellow-900/30 text-yellow-400 border-yellow-700'
                                  : 'bg-blue-900/30 text-blue-400 border-blue-700'
                              }`}
                            >
                              {alert.severity.toUpperCase()}
                            </span>
                            <span className="text-white font-semibold">{alert.alert_type}</span>
                            {alert.resolved && (
                              <span className="px-3 py-1 bg-green-900/20 text-green-400 border border-green-800 rounded-full text-xs font-medium flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Resolved
                              </span>
                            )}
                          </div>

                          <p className="text-slate-300 mb-2">
                            {JSON.stringify(alert.details, null, 2)}
                          </p>

                          <div className="text-xs text-slate-500">
                            {new Date(alert.created_at).toLocaleString()}
                            {alert.resolved_at &&
                              ` • Resolved ${new Date(alert.resolved_at).toLocaleString()}`}
                          </div>
                        </div>

                        {!alert.resolved && (
                          <button
                            onClick={() => resolveAlert(alert.id)}
                            className="ml-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Resolve
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
