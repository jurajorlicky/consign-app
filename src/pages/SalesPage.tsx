import { useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import SalesStatusBadge from '../components/SalesStatusBadge';
import AdminSalesStatusManager from '../components/AdminSalesStatusManager';
import {
  FaSearch,
  FaSignOutAlt,
  FaSync,
  FaList,
  FaShoppingBag,
  FaUsers,
  FaCog,
  FaChartBar,
  FaShoppingCart,
  FaExclamationTriangle,
  FaSave,
  FaUserShield
} from 'react-icons/fa';

interface Sale {
  id: string;
  product_id: string;
  name: string;
  size: string;
  price: number;
  payout: number;
  created_at: string;
  status: string;
  image_url?: string;
  user_email?: string;
  status_notes?: string;
  sku?: string;
  external_id?: string;
}

export default function SalesPage() {
  const location = useLocation();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSaleForStatus, setSelectedSaleForStatus] = useState<Sale | null>(null);

  const loadSales = useCallback(async () => {
    try {
      setError(null);
      if (!refreshing) setLoading(true);

      const { data, error } = await supabase
        .from('user_sales')
        .select(`
          id, product_id, name, size, price, payout, created_at, status, image_url, external_id, sku, status_notes,
          profiles(email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enriched = (data || []).map((sale: any) => ({
        ...sale,
        user_email: sale.profiles?.email || 'N/A',
      }));

      setSales(enriched);

    } catch (err: any) {
      console.error('Error loading sales:', err.message);
      setError('Chyba pri načítavaní predajov: ' + err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSales();
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
    loadSales();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sk-SK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Dokončené';
      case 'cancelled': return 'Zrušené';
      case 'pending': return 'Čaká sa';
      default: return status;
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  const filteredSales = sales.filter((sale) =>
    [sale.name, sale.sku, sale.user_email, sale.external_id].some((field) =>
      field?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.price, 0);
  const totalPayout = sales.reduce((sum, sale) => sum + sale.payout, 0);
  const completedSales = sales.filter(sale => sale.status === 'completed').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-600 border-t-green-500 rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-white mb-2">Načítavajú sa predaje</h3>
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
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-600 via-emerald-600 to-green-800 rounded-2xl shadow-lg">
                  <FaShoppingCart className="text-white text-xl" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-800 animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                  Správa predajov
                </h1>
                <p className="text-sm text-slate-400">Správa a prehľad predaných produktov</p>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FaShoppingCart className="text-blue-600 text-xl" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-400">Celkový počet predajov</p>
                <p className="text-2xl font-bold text-white">{sales.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-400">Celkové tržby</p>
                <p className="text-2xl font-bold text-white">{totalRevenue.toFixed(2)} €</p>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-400">Dokončené predaje</p>
                <p className="text-2xl font-bold text-white">{completedSales}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sales Table */}
        <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-800/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div>
                <h3 className="text-xl font-bold text-white">Predaje ({filteredSales.length})</h3>
                <p className="text-slate-400 text-sm mt-1">Správa a prehľad predajov</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm" />
                  <input
                    type="text"
                    placeholder="Vyhľadať predaje..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700/50">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Externé ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Produkt</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Veľkosť</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Cena</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Payout</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Používateľ</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Dátum</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Akcie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-slate-300 text-sm font-mono">
                        {sale.external_id || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-slate-600 bg-white shadow-sm">
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
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-white">{sale.name}</div>
                          <div className="text-xs text-slate-400">SKU: {sale.sku || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-700 text-slate-200">
                        {sale.size}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-white">
                      {sale.price} €
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-400">
                      {sale.payout.toFixed(2)} €
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {sale.user_email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <SalesStatusBadge status={sale.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 6v6m-4-6h8m-8 0V9a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                        {formatDate(sale.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedSaleForStatus(sale)}
                        className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-semibold rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-sm"
                      >
                        <FaUserShield className="mr-2" />
                        Upraviť
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredSales.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-700/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FaShoppingCart className="text-slate-400 text-2xl" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Žiadne predaje</h3>
                <p className="text-slate-400">
                  {searchTerm ? 'Nenašli sa žiadne predaje pre váš vyhľadávací výraz' : 'Zatiaľ nie sú žiadne predaje'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sales Status Management Modal */}
        {selectedSaleForStatus && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-slate-800 p-6 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-600 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl text-white font-semibold">Správa statusu predaja</h2>
                <button
                  onClick={() => setSelectedSaleForStatus(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Sale Info */}
              <div className="bg-slate-700/50 rounded-xl p-4 mb-6">
                <div className="flex items-center space-x-4">
                  <img 
                    src={selectedSaleForStatus.image_url || '/default-image.png'} 
                    alt={selectedSaleForStatus.name}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                  <div>
                    <h3 className="text-white font-semibold text-lg">{selectedSaleForStatus.name}</h3>
                    <p className="text-slate-300">Veľkosť: {selectedSaleForStatus.size}</p>
                    <p className="text-slate-300">Cena: {selectedSaleForStatus.price} €</p>
                    <p className="text-slate-300">Používateľ: {selectedSaleForStatus.user_email}</p>
                    <p className="text-slate-300">Externé ID: {selectedSaleForStatus.external_id || 'N/A'}</p>
                  </div>
                </div>
              </div>
              
              <AdminSalesStatusManager
                saleId={selectedSaleForStatus.id}
                currentStatus={selectedSaleForStatus.status}
                currentExternalId={selectedSaleForStatus.external_id}
                onStatusUpdate={(newStatus) => {
                  setSelectedSaleForStatus({
                    ...selectedSaleForStatus,
                    status: newStatus
                  });
                  // Refresh the sales list
                  loadSales();
                }}
                onExternalIdUpdate={(newExternalId) => {
                  setSelectedSaleForStatus({
                    ...selectedSaleForStatus,
                    external_id: newExternalId
                  });
                  // Refresh the sales list
                  loadSales();
                }}
                onClose={() => setSelectedSaleForStatus(null)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}