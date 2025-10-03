import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X, Star } from 'lucide-react';
import type { Database } from '../../lib/database.types';

type Order = Database['public']['Tables']['orders']['Row'];

interface RatingModalProps {
  order: Order;
  driverId: string | null;
  merchantId: string | null;
  onClose: () => void;
  onSubmitted: () => void;
}

export function RatingModal({
  order,
  driverId,
  merchantId,
  onClose,
  onSubmitted,
}: RatingModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [driverRating, setDriverRating] = useState(0);
  const [merchantRating, setMerchantRating] = useState(0);
  const [driverReview, setDriverReview] = useState('');
  const [merchantReview, setMerchantReview] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('ratings_reviews').insert({
        order_id: order.id,
        customer_id: user!.id,
        driver_id: driverId,
        merchant_id: merchantId,
        driver_rating: driverId ? driverRating : null,
        merchant_rating: merchantId ? merchantRating : null,
        driver_review: driverReview || null,
        merchant_review: merchantReview || null,
      });

      if (error) throw error;

      await supabase.from('activity_logs').insert({
        order_id: order.id,
        user_id: user!.id,
        action: 'rating_submitted',
        details: {
          driver_rating: driverRating,
          merchant_rating: merchantRating,
        },
      });

      onSubmitted();
      onClose();
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Failed to submit rating');
    } finally {
      setLoading(false);
    }
  }

  function renderStars(rating: number, setRating: (rating: number) => void) {
    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`w-8 h-8 ${
                star <= rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-slate-700 text-slate-600'
              }`}
            />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl">
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Rate Your Experience</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
            <div className="text-sm text-slate-400 mb-1">Order</div>
            <div className="text-white font-semibold">#{order.tracking_id}</div>
          </div>

          {driverId && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Rate Your Driver</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">Rating</label>
                {renderStars(driverRating, setDriverRating)}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Review (Optional)
                </label>
                <textarea
                  value={driverReview}
                  onChange={(e) => setDriverReview(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Share your experience with the driver..."
                />
              </div>
            </div>
          )}

          {merchantId && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Rate The Merchant</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">Rating</label>
                {renderStars(merchantRating, setMerchantRating)}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Review (Optional)
                </label>
                <textarea
                  value={merchantReview}
                  onChange={(e) => setMerchantReview(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Share your experience with the merchant..."
                />
              </div>
            </div>
          )}

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
              disabled={
                loading ||
                (driverId && driverRating === 0) ||
                (merchantId && merchantRating === 0)
              }
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors"
            >
              {loading ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
