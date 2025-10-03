import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Activity, TrendingUp, Clock } from 'lucide-react';

export function SystemStatsPanel() {
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentActivity();
  }, []);

  async function loadRecentActivity() {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentActivity(data || []);
    } catch (error) {
      console.error('Error loading activity:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-blue-400" />
        Recent Activity
      </h3>

      {loading ? (
        <div className="text-center py-8 text-slate-400">Loading activity...</div>
      ) : recentActivity.length === 0 ? (
        <div className="text-center py-8 text-slate-400">No recent activity</div>
      ) : (
        <div className="space-y-3">
          {recentActivity.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-3 p-3 bg-slate-900 rounded-lg border border-slate-700"
            >
              <div className="mt-1">
                {log.action.includes('created') && (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                )}
                {log.action.includes('delivered') && (
                  <Clock className="w-4 h-4 text-blue-400" />
                )}
                {!log.action.includes('created') && !log.action.includes('delivered') && (
                  <Activity className="w-4 h-4 text-slate-400" />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-medium capitalize">
                    {log.action.replace('_', ' ')}
                  </span>
                  {log.details && (
                    <span className="text-xs text-slate-500">
                      {log.details.tracking_id && `#${log.details.tracking_id}`}
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-500">
                  {new Date(log.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
