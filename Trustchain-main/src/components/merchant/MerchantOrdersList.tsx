import { MapPin, Package, CheckCircle, Clock, XCircle } from 'lucide-react';
import type { Database } from '../../lib/database.types';

type Order = Database['public']['Tables']['orders']['Row'];

interface MerchantOrdersListProps {
  orders: Order[];
  onUpdate: () => void;
}

export function MerchantOrdersList({ orders }: MerchantOrdersListProps) {
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

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-800 rounded-xl border border-slate-700">
        <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400">No orders yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div
          key={order.id}
          className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-colors"
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

          <div className="space-y-2">
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
            <div className="mt-4 p-3 bg-slate-900 rounded-lg border border-slate-700">
              <div className="text-xs text-slate-500 mb-1">Notes</div>
              <div className="text-sm text-slate-300">{order.notes}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
