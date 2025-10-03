import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { X, MapPin, DollarSign } from 'lucide-react';

interface CreateOrderModalProps {
  onClose: () => void;
  onOrderCreated: () => void;
}

export function CreateOrderModal({ onClose, onOrderCreated }: CreateOrderModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    pickup_address: '',
    delivery_address: '',
    amount: '',
    payment_method: 'prepay' as 'prepay' | 'postpay' | 'cheque',
    notes: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: trackingData, error: trackingError } = await supabase.rpc(
        'generate_tracking_id'
      );
      if (trackingError) throw trackingError;

      const { data: otpData, error: otpError } = await supabase.rpc('generate_delivery_otp');
      if (otpError) throw otpError;

      const { error: insertError } = await supabase.from('orders').insert({
        customer_id: user!.id,
        tracking_id: trackingData,
        delivery_otp: otpData,
        pickup_address: formData.pickup_address,
        delivery_address: formData.delivery_address,
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        notes: formData.notes || null,
      });

      if (insertError) throw insertError;

      await supabase.from('activity_logs').insert({
        user_id: user!.id,
        action: 'order_created',
        details: {
          tracking_id: trackingData,
          amount: formData.amount,
        },
      });

      onOrderCreated();
    } catch (err) {
      console.error('Error creating order:', err);
      setError(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Create New Order</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <MapPin className="w-4 h-4 inline mr-2 text-green-400" />
              Pickup Address
            </label>
            <textarea
              value={formData.pickup_address}
              onChange={(e) => setFormData({ ...formData, pickup_address: e.target.value })}
              required
              rows={2}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter pickup location"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <MapPin className="w-4 h-4 inline mr-2 text-red-400" />
              Delivery Address
            </label>
            <textarea
              value={formData.delivery_address}
              onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
              required
              rows={2}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter delivery destination"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <DollarSign className="w-4 h-4 inline mr-2 text-blue-400" />
              Delivery Amount (KES)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Payment Method
            </label>
            <select
              value={formData.payment_method}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  payment_method: e.target.value as 'prepay' | 'postpay' | 'cheque',
                })
              }
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="prepay">Pre-pay (Escrow)</option>
              <option value="postpay">Post-pay (After Delivery)</option>
              <option value="cheque">Cheque/Contract</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any special instructions..."
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors"
            >
              {loading ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
