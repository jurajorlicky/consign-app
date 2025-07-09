import { useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import SalesStatusBadge from '../components/SalesStatusBadge';
import { 
  FaSignOutAlt, 
  FaSearch, 
  FaInfoCircle, 
  FaSync, 
  FaList, 
  FaShoppingBag, 
  FaUsers, 
  FaCog, 
  FaChartBar, 
  FaShoppingCart, 
  FaExclamationTriangle,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaBuilding,
  FaCreditCard,
  FaEuroSign,
  FaCalendarAlt,
  FaTimes,
  FaChartLine,
  FaBox
} from 'react-icons/fa';

interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  profile_type?: string;
  vat_type?: string;
  company_name?: string;
  vat_number?: string;
  address?: string;
  popisne_cislo?: string;
  psc?: string;
  mesto?: string;
  krajina?: string;
  email: string;
  telephone?: string;
  iban?: string;
  ico?: string;
}

interface UserSale {
  id: string;
  product_id: string;
  name: string;
  size: string;
  price: number;
  payout: number;
  created_at: string;
  status: string;
  image_url?: string;
  sku?: string;
  external_id?: string;
}

interface UserProduct {
  id: string;
  product_id: string;
  name: string;
  size: string;
  price: number;
  payout: number;
  created_at: string;
  image_url?: string;
  sku?: string;
}

interface UserStats {
  totalSales: number;
  totalRevenue: number;
  totalPayout: number;
  totalProducts: number;
  completedSales: number;
  pendingSales: number;
}

export default function UsersPage() {
  const location = useLocation();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userSales, setUserSales] = useState<UserSale[]>([]);
  const [userProducts, setUserProducts] = useState<UserProduct[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingUserData, setLoadingUserData] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'sales' | 'products'>('info');

  const loadUsers = useCallback(async () => {
    try {
      setError(null);
      if (!refreshing) setLoading(true);

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, first_name, last_name, profile_type, vat_type, company_name, vat_number, 
          address, popisne_cislo, psc, mesto, krajina, email, telephone, iban, ico
        `)
        .limit(100);

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      console.error('Error loading users:', err.message);
      setError('Chyba pri načítavaní užívateľov: ' + err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  const loadUserDetails = async (userId: string) => {
    try {
      setLoadingUserData(true);
      
      // Load user sales
      const { data: salesData, error: salesError } = await supabase
        .from('user_sales')
        .select('id, product_id, name, size, price, payout, created_at, status, image_url, sku, external_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (salesError) throw salesError;
      setUserSales(salesData || []);

      // Load user products
      const { data: productsData, error: productsError } = await supabase
        .from('user_products')
        .select('id, product_id, name, size, price, payout, created_at, image_url, sku')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;
      setUserProducts(productsData || []);

      // Calculate stats
      const sales = salesData || [];
      const products = productsData || [];
      
      const stats: UserStats = {
        totalSales: sales.length,
        totalRevenue: sales.reduce((sum, sale) => sum + sale.price, 0),
        totalPayout: sales.reduce((sum, sale) => sum + sale.payout, 0),
        totalProducts: products.length,
        completedSales: sales.filter(sale => sale.status === 'completed').length,
        pendingSales: sales.filter(sale => ['accepted', 'processing', 'shipped'].includes(sale.status)).length
      };
      
      setUserStats(stats);

    } catch (err: any) {
      console.error('Error loading user details:', err.message);
      setError('Chyba pri načítavaní detailov užívateľa: ' + err.message);
    } finally {
      setLoadingUserData(false);
    }
  };

  const handleUserSelect = async (user: UserProfile) => {
    setSelectedUser(user);
    setActiveTab('info');
    await loadUserDetails(user.id);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (err: any) {
      console.error('Error signing out:', err.message);
    }
  };

  const handleRetry = () => {
    setError(null);
    loadUsers();
  };

  const closeModal = () => {
    setSelectedUser(null);
    setUserSales([]);
    setUserProducts([]);
    setUserStats(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sk-SK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = users.filter(user =>
    [user.email, user.first_name, user.last_name].some(field =>
      field?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-600 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-white mb-2">Načítavajú sa užívatelia</h3>
          <p className="text-sm text-slate-400">Prosím čakajte...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-800 rounded-2xl shadow-lg">
                  <FaUsers className="text-white text-xl" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-800 animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">
                  Správa užívateľov
                </h1>
                <p className="text-sm text-slate-400">Katalóg a správa užívateľov</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center px-4 py-2 bg-slate-700/50 text-slate-300 font-semibold rounded-xl hover:bg-slate-600/50 transition-all duration-200 border border-slate-600/50 backdrop-blur-sm disabled:opacity-50"
              >
                <FaSync className={`mr-2 text-sm ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Obnovuje sa...' : 'Refresh'}
              </button>
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
        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FaExclamationTriangle className="h-5 w-5 text-red-400" />
                <p className="ml-3 text-sm text-red-300">{error}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleRetry}
                  className="text-red-300 hover:text-red-100 text-sm font-medium"
                >
                  Skúsiť znova
                </button>
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-300"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

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

        {/* Users Table */}
        <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-800/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div>
                <h3 className="text-xl font-bold text-white">Užívatelia ({filteredUsers.length})</h3>
                <p className="text-slate-400 text-sm mt-1">Správa a prehľad užívateľov</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm" />
                  <input
                    type="text"
                    placeholder="Vyhľadať užívateľov..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700/50">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Meno</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Typ</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Akcie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-300 font-mono">{user.id.slice(0, 8)}...</td>
                    <td className="px-6 py-4 text-sm text-white">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {user.first_name || user.last_name ? 
                        `${user.first_name || ''} ${user.last_name || ''}`.trim() : 
                        'N/A'
                      }
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.profile_type === 'Obchodný' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.profile_type || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleUserSelect(user)}
                        className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-semibold rounded-xl hover:from-indigo-700 hover:to-blue-700 transition-all duration-200 shadow-sm"
                      >
                        <FaInfoCircle className="mr-2 text-xs" />
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-700/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FaUsers className="text-slate-400 text-2xl" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Žiadni užívatelia</h3>
              <p className="text-slate-400">
                {searchTerm ? 'Nenašli sa žiadni užívatelia pre váš vyhľadávací výraz' : 'Zatiaľ nie sú pridaní žiadni užívatelia'}
              </p>
            </div>
          )}
        </div>

        {/* Enhanced Modal for User Details */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800/95 backdrop-blur-xl rounded-2xl w-full max-w-6xl border border-slate-700/50 max-h-[95vh] overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-700/50 bg-slate-800/50">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center">
                    <FaUser className="text-white text-xl" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {selectedUser.first_name || selectedUser.last_name ? 
                        `${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim() : 
                        'Užívateľ'
                      }
                    </h3>
                    <p className="text-slate-400 text-sm">{selectedUser.email}</p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-colors"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>

              {/* Stats Cards */}
              {userStats && (
                <div className="p-6 border-b border-slate-700/50 bg-slate-800/30">
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div className="bg-slate-700/30 rounded-xl p-4 text-center">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <FaShoppingCart className="text-blue-400 text-sm" />
                      </div>
                      <p className="text-2xl font-bold text-white">{userStats.totalSales}</p>
                      <p className="text-xs text-slate-400">Predaje</p>
                    </div>
                    <div className="bg-slate-700/30 rounded-xl p-4 text-center">
                      <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <FaEuroSign className="text-green-400 text-sm" />
                      </div>
                      <p className="text-2xl font-bold text-white">{formatCurrency(userStats.totalRevenue)}</p>
                      <p className="text-xs text-slate-400">Tržby</p>
                    </div>
                    <div className="bg-slate-700/30 rounded-xl p-4 text-center">
                      <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <FaChartLine className="text-purple-400 text-sm" />
                      </div>
                      <p className="text-2xl font-bold text-white">{formatCurrency(userStats.totalPayout)}</p>
                      <p className="text-xs text-slate-400">Payout</p>
                    </div>
                    <div className="bg-slate-700/30 rounded-xl p-4 text-center">
                      <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <FaBox className="text-orange-400 text-sm" />
                      </div>
                      <p className="text-2xl font-bold text-white">{userStats.totalProducts}</p>
                      <p className="text-xs text-slate-400">Produkty</p>
                    </div>
                    <div className="bg-slate-700/30 rounded-xl p-4 text-center">
                      <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-2xl font-bold text-white">{userStats.completedSales}</p>
                      <p className="text-xs text-slate-400">Dokončené</p>
                    </div>
                    <div className="bg-slate-700/30 rounded-xl p-4 text-center">
                      <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-2xl font-bold text-white">{userStats.pendingSales}</p>
                      <p className="text-xs text-slate-400">Čakajúce</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Navigation */}
              <div className="flex border-b border-slate-700/50 bg-slate-800/30">
                {[
                  { id: 'info', label: 'Informácie', icon: FaUser },
                  { id: 'sales', label: 'Predaje', icon: FaShoppingCart },
                  { id: 'products', label: 'Produkty', icon: FaBox }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center px-6 py-4 font-semibold transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'text-white border-b-2 border-indigo-500 bg-slate-700/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/20'
                    }`}
                  >
                    <tab.icon className="mr-2 text-sm" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {loadingUserData ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-slate-600 border-t-indigo-500 rounded-full animate-spin"></div>
                    <span className="ml-3 text-slate-300">Načítavajú sa údaje...</span>
                  </div>
                ) : (
                  <>
                    {/* User Info Tab */}
                    {activeTab === 'info' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-slate-300">
                        <div className="space-y-4">
                          <div className="flex items-center">
                            <FaUser className="text-slate-400 mr-3" />
                            <div>
                              <p className="text-xs text-slate-400 uppercase tracking-wider">Meno</p>
                              <p className="font-semibold">{selectedUser.first_name || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <FaUser className="text-slate-400 mr-3" />
                            <div>
                              <p className="text-xs text-slate-400 uppercase tracking-wider">Priezvisko</p>
                              <p className="font-semibold">{selectedUser.last_name || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <FaEnvelope className="text-slate-400 mr-3" />
                            <div>
                              <p className="text-xs text-slate-400 uppercase tracking-wider">Email</p>
                              <p className="font-semibold">{selectedUser.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <FaPhone className="text-slate-400 mr-3" />
                            <div>
                              <p className="text-xs text-slate-400 uppercase tracking-wider">Telefón</p>
                              <p className="font-semibold">{selectedUser.telephone || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <FaBuilding className="text-slate-400 mr-3" />
                            <div>
                              <p className="text-xs text-slate-400 uppercase tracking-wider">Typ profilu</p>
                              <p className="font-semibold">{selectedUser.profile_type || 'N/A'}</p>
                            </div>
                          </div>
                          {selectedUser.profile_type === 'Obchodný' && (
                            <>
                              <div className="flex items-center">
                                <FaBuilding className="text-slate-400 mr-3" />
                                <div>
                                  <p className="text-xs text-slate-400 uppercase tracking-wider">Spoločnosť</p>
                                  <p className="font-semibold">{selectedUser.company_name || 'N/A'}</p>
                                </div>
                              </div>
                              <div className="flex items-center">
                                <FaBuilding className="text-slate-400 mr-3" />
                                <div>
                                  <p className="text-xs text-slate-400 uppercase tracking-wider">IČO</p>
                                  <p className="font-semibold">{selectedUser.ico || 'N/A'}</p>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center">
                            <FaMapMarkerAlt className="text-slate-400 mr-3" />
                            <div>
                              <p className="text-xs text-slate-400 uppercase tracking-wider">Adresa</p>
                              <p className="font-semibold">
                                {selectedUser.address || selectedUser.popisne_cislo ? 
                                  `${selectedUser.address || ''} ${selectedUser.popisne_cislo || ''}`.trim() : 'N/A'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <FaMapMarkerAlt className="text-slate-400 mr-3" />
                            <div>
                              <p className="text-xs text-slate-400 uppercase tracking-wider">Mesto</p>
                              <p className="font-semibold">{selectedUser.mesto || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <FaMapMarkerAlt className="text-slate-400 mr-3" />
                            <div>
                              <p className="text-xs text-slate-400 uppercase tracking-wider">PSČ</p>
                              <p className="font-semibold">{selectedUser.psc || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <FaMapMarkerAlt className="text-slate-400 mr-3" />
                            <div>
                              <p className="text-xs text-slate-400 uppercase tracking-wider">Krajina</p>
                              <p className="font-semibold">{selectedUser.krajina || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <FaCreditCard className="text-slate-400 mr-3" />
                            <div>
                              <p className="text-xs text-slate-400 uppercase tracking-wider">IBAN</p>
                              <p className="font-semibold font-mono text-sm">{selectedUser.iban || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sales Tab */}
                    {activeTab === 'sales' && (
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-4">Predaje ({userSales.length})</h4>
                        {userSales.length > 0 ? (
                          <div className="space-y-4">
                            {userSales.map((sale) => (
                              <div key={sale.id} className="bg-slate-700/30 rounded-xl p-4 hover:bg-slate-700/40 transition-colors">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-4">
                                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-slate-600 bg-white">
                                      <img
                                        className="h-full w-full object-contain p-2"
                                        src={sale.image_url || '/default-image.png'}
                                        alt={sale.name}
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.src = '/default-image.png';
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <h5 className="font-semibold text-white">{sale.name}</h5>
                                      <p className="text-sm text-slate-400">Veľkosť: {sale.size}</p>
                                      <p className="text-sm text-slate-400">SKU: {sale.sku || 'N/A'}</p>
                                      <p className="text-sm text-slate-400">Externé ID: {sale.external_id || 'N/A'}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="flex items-center space-x-3 mb-2">
                                      <SalesStatusBadge status={sale.status} />
                                    </div>
                                    <p className="text-lg font-bold text-white">{formatCurrency(sale.price)}</p>
                                    <p className="text-sm text-green-400">Payout: {formatCurrency(sale.payout)}</p>
                                    <p className="text-xs text-slate-400">{formatDate(sale.created_at)}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <FaShoppingCart className="text-slate-400 text-4xl mx-auto mb-4" />
                            <p className="text-slate-400">Žiadne predaje</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Products Tab */}
                    {activeTab === 'products' && (
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-4">Produkty ({userProducts.length})</h4>
                        {userProducts.length > 0 ? (
                          <div className="space-y-4">
                            {userProducts.map((product) => (
                              <div key={product.id} className="bg-slate-700/30 rounded-xl p-4 hover:bg-slate-700/40 transition-colors">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-4">
                                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-slate-600 bg-white">
                                      <img
                                        className="h-full w-full object-contain p-2"
                                        src={product.image_url || '/default-image.png'}
                                        alt={product.name}
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.src = '/default-image.png';
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <h5 className="font-semibold text-white">{product.name}</h5>
                                      <p className="text-sm text-slate-400">Veľkosť: {product.size}</p>
                                      <p className="text-sm text-slate-400">SKU: {product.sku || 'N/A'}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-white">{formatCurrency(product.price)}</p>
                                    <p className="text-sm text-green-400">Payout: {formatCurrency(product.payout)}</p>
                                    <p className="text-xs text-slate-400">{formatDate(product.created_at)}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <FaBox className="text-slate-400 text-4xl mx-auto mb-4" />
                            <p className="text-slate-400">Žiadne produkty</p>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}