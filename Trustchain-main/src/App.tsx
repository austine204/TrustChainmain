import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthForm } from './components/AuthForm';
import { CustomerDashboard } from './components/customer/CustomerDashboard';
import { DriverDashboard } from './components/driver/DriverDashboard';
import { MerchantDashboard } from './components/merchant/MerchantDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';

function AppContent() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user || !profile) {
    return <AuthForm />;
  }

  if (profile.role === 'customer') {
    return <CustomerDashboard />;
  }

  if (profile.role === 'driver') {
    return <DriverDashboard />;
  }

  if (profile.role === 'merchant') {
    return <MerchantDashboard />;
  }

  if (profile.role === 'admin') {
    return <AdminDashboard />;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-white">Unknown user role</div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
