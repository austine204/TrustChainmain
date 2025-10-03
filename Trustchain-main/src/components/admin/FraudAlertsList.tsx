import { AlertTriangle } from 'lucide-react';
import type { Database } from '../../lib/database.types';

type FraudAlert = Database['public']['Tables']['fraud_alerts']['Row'];

interface FraudAlertsListProps {
  alerts: FraudAlert[];
  onResolve: (alertId: string) => void;
}

export function FraudAlertsList({ alerts, onResolve }: FraudAlertsListProps) {
  if (alerts.length === 0) {
    return (
      <div className="text-center py-8 bg-slate-800 rounded-xl border border-slate-700">
        <AlertTriangle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400">No fraud alerts</p>
      </div>
    );
  }

  return (
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
              </div>

              <p className="text-slate-300 mb-2">{JSON.stringify(alert.details)}</p>

              <div className="text-xs text-slate-500">
                {new Date(alert.created_at).toLocaleString()}
              </div>
            </div>

            {!alert.resolved && (
              <button
                onClick={() => onResolve(alert.id)}
                className="ml-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Resolve
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
