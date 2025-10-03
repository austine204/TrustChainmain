import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X, Shield, DollarSign, Calendar } from 'lucide-react';
import type { Database } from '../../lib/database.types';

type Order = Database['public']['Tables']['orders']['Row'];

interface InsuranceModalProps {
  order: Order;
  onClose: () => void;
  onInsured: () => void;
}

export function InsuranceModal({ order, onClose, onInsured }: InsuranceModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    provider: 'TrustChain Insurance',
    coverageAmount: order.amount.toString(),
    premiumPercentage: '5',
    durationDays: '30',
  });

  const premiumAmount =
    (parseFloat(formData.coverageAmount) * parseFloat(formData.premiumPercentage)) / 100;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(formData.durationDays));

      const policyNumber = `POL${Date.now()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      const { error } = await supabase.from('insurance_policies').insert({
        order_id: order.id,
        provider: formData.provider,
        policy_number: policyNumber,
        coverage_amount: parseFloat(formData.coverageAmount),
        premium_amount: premiumAmount,
        expires_at: expiresAt.toISOString(),
      });

      if (error) throw error;

      await supabase.from('activity_logs').insert({
        order_id: order.id,
        user_id: user!.id,
        action: 'insurance_purchased',
        details: {
          policy_number: policyNumber,
          coverage: formData.coverageAmount,
          premium: premiumAmount,
        },
      });

      onInsured();
      onClose();
    } catch (error) {
      console.error('Error purchasing insurance:', error);
      alert('Failed to purchase insurance');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl">
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-400" />
            Purchase Shipment Insurance
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-4">
            <h3 className="text-blue-400 font-semibold mb-2">Why Insure Your Shipment?</h3>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>Protection against loss, damage, or theft</li>
              <li>Fast claim processing in case of incidents</li>
              <li>Peace of mind for valuable deliveries</li>
            </ul>
          </div>

          <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
            <div className="text-sm text-slate-400 mb-1">Order</div>
            <div className="text-white font-semibold">#{order.tracking_id}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Insurance Provider
            </label>
            <input
              type="text"
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              required
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Coverage Amount (KES)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.coverageAmount}
                onChange={(e) => setFormData({ ...formData, coverageAmount: e.target.value })}
                required
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Premium Rate (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="20"
                value={formData.premiumPercentage}
                onChange={(e) => setFormData({ ...formData, premiumPercentage: e.target.value })}
                required
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Coverage Duration (Days)
            </label>
            <select
              value={formData.durationDays}
              onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7">7 Days</option>
              <option value="14">14 Days</option>
              <option value="30">30 Days</option>
              <option value="60">60 Days</option>
              <option value="90">90 Days</option>
            </select>
          </div>

          <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400">Premium Amount</span>
              <span className="text-2xl font-bold text-white">KES {premiumAmount.toFixed(2)}</span>
            </div>
            <div className="text-xs text-slate-500">
              {formData.premiumPercentage}% of KES {formData.coverageAmount}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
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
              {loading ? 'Processing...' : `Purchase for KES ${premiumAmount.toFixed(2)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
