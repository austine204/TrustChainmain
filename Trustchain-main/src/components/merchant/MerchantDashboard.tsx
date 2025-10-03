import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Package, TrendingUp, DollarSign, ShoppingBag, LogOut, Plus } from 'lucide-react';
import { ProductsList } from './ProductsList';
import { MerchantOrdersList } from './MerchantOrdersList';
import type { Database } from '../../lib/database.types';

type Order = Database['public']['Tables']['orders']['Row'];
type Product = Database['public']['Tables']['merchant_products']['Row'];

export function MerchantDashboard() {
  const { profile, signOut } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'products'>('orders');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [ordersResult, productsResult] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .eq('merchant_id', profile?.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('merchant_products')
          .select('*')
          .eq('merchant_id', profile?.id)
          .order('created_at', { ascending: false }),
      ]);

      if (ordersResult.error) throw ordersResult.error;
      if (productsResult.error) throw productsResult.error;

      setOrders(ordersResult.data || []);
      setProducts(productsResult.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  const totalRevenue = orders
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => sum + Number(o.amount), 0);

  const pendingOrders = orders.filter((o) => o.status === 'pending' || o.status === 'assigned')
    .length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Merchant Dashboard</h1>
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
          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-100 text-sm">Total Revenue</span>
              <DollarSign className="w-5 h-5 text-green-200" />
            </div>
            <div className="text-3xl font-bold">KES {totalRevenue.toFixed(2)}</div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Total Orders</span>
              <Package className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-white">{orders.length}</div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Pending Orders</span>
              <TrendingUp className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="text-3xl font-bold text-white">{pendingOrders}</div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Products</span>
              <ShoppingBag className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-white">{products.length}</div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden mb-6">
          <div className="flex border-b border-slate-700">
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === 'orders'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Orders
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === 'products'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Products
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading...</div>
        ) : activeTab === 'orders' ? (
          <MerchantOrdersList orders={orders} onUpdate={loadData} />
        ) : (
          <ProductsList products={products} onUpdate={loadData} />
        )}
      </div>
    </div>
  );
}
