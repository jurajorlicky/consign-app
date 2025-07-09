import { useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  FaChartBar, 
  FaUsers, 
  FaShoppingBag, 
  FaEye, 
  FaChartLine, 
  FaCog, 
  FaSignOutAlt, 
  FaArrowLeft,
  FaUserShield,
  FaPlus,
  FaEuroSign,
  FaList,
  FaShoppingCart
} from 'react-icons/fa';

interface DashboardStats {
  totalUsers: number;
  totalProducts: number;
  totalListings: number;
  totalSales: number;
  totalRevenue: number;
  totalPayout: number;
  recentActivity: number;
}

export default function AdminDashboard() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalProducts: 0,
    totalListings: 0,
    totalSales: 0,
    totalRevenue: 0,
    totalPayout: 0,
    recentActivity: 0
  });
  const [error, setError] = useState<string | null>(null);

  const loadOverviewStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const promises = [
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('products').select('id', { count: 'exact' }),
        supabase.from('user_products').select('id, price, payout', { count: 'exact' }),
        supabase.from('user_sales').select('id, price, payout', { count: 'exact' })
      ];

      const results = await Promise.allSettled(promises);

      const [usersRes, productsRes, listingsRes, salesRes] = results;

      const totalUsers = usersRes.status === 'fulfilled' ? (usersRes.value.count || 0) : 0;
      const totalProducts = productsRes.status === 'fulfilled' ? (productsRes.value.count || 0) : 0;
      const totalListings = listingsRes.status === 'fulfilled' ? (listingsRes.value.count || 0) : 0;
      const totalSales = salesRes.status === 'fulfilled' ? (salesRes.value.count || 0) : 0;

      const totalRevenue = salesRes.status === 'fulfilled' && salesRes.value.data 
        ? salesRes.value.data.reduce((sum: number, sale: any) => sum + (sale.price || 0), 0) 
        : 0;
      const totalPayout = salesRes.status === 'fulfilled' && salesRes.value.data 
        ? salesRes.value.data.reduce((sum: number, sale: any) => sum + (sale.payout || 0), 0) 
        : 0;

      setStats({
        totalUsers,
        totalProducts,
        totalListings,
        totalSales,
        totalRevenue,
        totalPayout,
        recentActivity: Math.floor(Math.random() * 50) + 10
      });

    } catch (err: any) {
      console.error('Error loading stats:', err.message);
      setError('Chyba pri načítavaní štatistík: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (err: any) {
      console.error('Error signing out:', err.message);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  useEffect(() => {
    loadOverviewStats();
  }, [loadOverviewStats]);

  // Kratší loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-white">Načítava sa admin dashboard</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Enhanced Header */}
      <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 rounded-2xl shadow-lg">
                  <FaUserShield className="text-white text-xl" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-800 animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-slate-400">Správa systému a analýza dát</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Link
                to="/dashboard"
                className="inline-flex items-center px-4 py-2 bg-slate-700/50 text-slate-300 font-semibold rounded-xl hover:bg-slate-600/50 transition-all duration-200 border border-slate-600/50 backdrop-blur-sm"
              >
                <FaArrowLeft className="mr-2 text-sm" />
                Dashboard
              </Link>
              
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg transform hover:scale-105"
              >
                <FaSignOutAlt className="mr-2 text-sm" />
                Odhlásiť
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl mb-8 overflow-hidden">
          <div className="flex overflow-x-auto">
            {[
              { id: 'overview', label: 'Prehľad', icon: FaChartBar, color: 'from-blue-500 to-cyan-500', path: '/admin' },
              { id: 'products', label: 'Produkty', icon: FaShoppingBag, color: 'from-purple-500 to-violet-500', path: '/admin/products' },
              { id: 'listed-products', label: 'Ponuky', icon: FaList, color: 'from-orange-500 to-amber-500', path: '/admin/listed-products' },
              { id: 'sales', label: 'Predaje', icon: FaShoppingCart, color: 'from-green-500 to-emerald-500', path: '/admin/sales' },
              { id: 'users', label: 'Užívatelia', icon: FaUsers, color: 'from-indigo-500 to-blue-500', path: '/admin/users' },
              { id: 'settings', label: 'Nastavenia', icon: FaCog, color: 'from-gray-500 to-slate-500', path: '/admin/settings' },
            ].map((tab) => {
              const isActive = location.pathname === tab.path;
              return (
                <Link
                  key={tab.id}
                  to={tab.path}
                  className={`relative flex items-center px-6 py-4 font-semibold transition-all duration-300 min-w-max ${
                    isActive ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
                  }`}
                >
                  {isActive && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${tab.color} opacity-20 rounded-lg`}></div>
                  )}
                  <tab.icon className={`mr-2 text-sm ${isActive ? `text-transparent bg-gradient-to-r ${tab.color} bg-clip-text` : ''}`} />
                  <span className={isActive ? `bg-gradient-to-r ${tab.color} bg-clip-text text-transparent font-bold` : ''}>
                    {tab.label}
                  </span>
                  {isActive && (
                    <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${tab.color} rounded-full`}></div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Overview Dashboard */}
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { 
                title: 'Používatelia', 
                value: stats.totalUsers, 
                icon: FaUsers, 
                color: 'from-green-500 to-emerald-500'
              },
              { 
                title: 'Produkty', 
                value: stats.totalProducts, 
                icon: FaShoppingBag, 
                color: 'from-purple-500 to-violet-500'
              },
              { 
                title: 'Aktívne ponuky', 
                value: stats.totalListings, 
                icon: FaEye, 
                color: 'from-orange-500 to-amber-500'
              },
              { 
                title: 'Predaje', 
                value: stats.totalSales, 
                icon: FaChartLine, 
                color: 'from-blue-500 to-cyan-500'
              },
            ].map((stat, index) => (
              <div key={index} className="relative group">
                <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm font-medium">{stat.title}</p>
                      <p className="text-3xl font-bold text-white mt-2">{stat.value.toLocaleString()}</p>
                    </div>
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                      <stat.icon className="text-white text-2xl" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Revenue Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Celkové tržby</h3>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <FaEuroSign className="text-white text-lg" />
                </div>
              </div>
              <p className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                {formatCurrency(stats.totalRevenue)}
              </p>
              <p className="text-slate-400 text-sm mt-2">Celkové tržby zo všetkých predajov</p>
            </div>

            <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Celkové výplaty</h3>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <FaChartLine className="text-white text-lg" />
                </div>
              </div>
              <p className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {formatCurrency(stats.totalPayout)}
              </p>
              <p className="text-slate-400 text-sm mt-2">Celkové výplaty pre predajcov</p>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Nedávna aktivita</h3>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-slate-400">Live</span>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {[
                  { action: 'Nový používateľ sa zaregistroval', time: '2 min', icon: FaUsers, color: 'text-blue-400' },
                  { action: 'Produkt bol pridaný do ponuky', time: '5 min', icon: FaPlus, color: 'text-green-400' },
                  { action: 'Predaj bol dokončený', time: '12 min', icon: FaChartLine, color: 'text-purple-400' },
                  { action: 'Nový produkt v katalógu', time: '1 hod', icon: FaShoppingBag, color: 'text-orange-400' }
                ].map((activity, index) => (
                  <div key={index} className="flex items-center space-x-4 p-3 rounded-xl hover:bg-slate-700/30 transition-colors">
                    <div className={`w-10 h-10 rounded-xl bg-slate-700/50 flex items-center justify-center ${activity.color}`}>
                      <activity.icon className="text-sm" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{activity.action}</p>
                      <p className="text-slate-400 text-xs">pred {activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}