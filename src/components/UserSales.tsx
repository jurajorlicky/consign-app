import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import SalesStatusBadge from './SalesStatusBadge';
import SalesStatusTimeline from './SalesStatusTimeline';
import { FaArrowLeft, FaSignOutAlt, FaShoppingCart, FaUser, FaExclamationTriangle } from 'react-icons/fa';

interface UserSale {
  id: string;
  product_id: string;
  name: string;
  size: string;
  price: number;
  image_url: string | null;
  payout: number;
  created_at: string;
  status: string;
  status_notes?: string;
}

export default function UserSales() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<UserSale[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [selectedSaleForTimeline, setSelectedSaleForTimeline] = useState<UserSale | null>(null);

  useEffect(() => {
    const fetchUserAndSales = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/');
          return;
        }
        
        setUser(user);
        await fetchSales(user.id);
      } catch (err) {
        console.error('Error fetching user:', err);
        setError('Chyba pri načítavaní používateľských dát.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndSales();
  }, [navigate]);

  const fetchSales = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_sales')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (err) {
      console.error('Error fetching sales:', err);
      setError('Chyba pri načítavaní vašich predajov.');
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (err) {
      console.error('Error signing out:', err);
    }
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

  const handleRetry = () => {
    setError(null);
    if (user) {
      fetchSales(user.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-white rounded-xl shadow-lg mb-3">
            <svg className="animate-spin h-6 w-6 text-slate-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-lg text-slate-600">Načítavajú sa predaje...</p>
        </div>
      </div>
    );
  }

  const totalPayout = sales.reduce((sum, sale) => sum + sale.payout, 0);
  const completedSales = sales.filter(sale => sale.status === 'completed').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-slate-900 to-slate-700 rounded-xl">
                <FaShoppingCart className="text-white text-lg" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Moje predaje</h1>
                <p className="text-sm text-slate-600">História vašich predajov</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Link
                to="/dashboard"
                className="inline-flex items-center px-4 py-2 bg-white text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all duration-200 border border-slate-200 shadow-sm"
              >
                <FaArrowLeft className="mr-2 text-sm" />
                Späť na Dashboard
              </Link>
              
              <Link
                to="/profile"
                className="inline-flex items-center px-4 py-2 bg-white text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all duration-200 border border-slate-200 shadow-sm"
              >
                <FaUser className="mr-2 text-sm" />
                Profil
              </Link>
              
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-4 py-2 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-all duration-200 border border-red-200"
              >
                <FaSignOutAlt className="mr-2 text-sm" />
                Odhlásiť
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaExclamationTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleRetry}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Skúsiť znova
                </button>
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FaShoppingCart className="text-blue-600 text-xl" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Celkový počet predajov</p>
                <p className="text-2xl font-bold text-slate-900">{sales.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Celkový payout</p>
                <p className="text-2xl font-bold text-slate-900">{totalPayout.toFixed(2)} €</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Dokončené predaje</p>
                <p className="text-2xl font-bold text-slate-900">{completedSales}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sales Table */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">História predajov</h3>
            <p className="text-sm text-slate-600 mt-1">Prehľad všetkých vašich predajov</p>
          </div>
          
          {sales.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Produkt</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Veľkosť</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Cena</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Výplata</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Dátum</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
                            <div className="text-sm font-semibold text-slate-900">{sale.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-800">
                          {sale.size}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                        {sale.price} €
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                        {sale.payout.toFixed(2)} €
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <SalesStatusBadge status={sale.status} />
                          <button
                            onClick={() => setSelectedSaleForTimeline(sale)}
                            className="text-blue-600 hover:text-blue-800 text-xs underline"
                          >
                            História
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {formatDate(sale.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FaShoppingCart className="text-slate-400 text-2xl" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Žiadne predaje</h3>
              <p className="text-slate-600 mb-6">Zatiaľ nemáte žiadne predaje</p>
              <Link
                to="/dashboard"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-slate-900 to-slate-700 text-white font-semibold rounded-xl hover:from-slate-800 hover:to-slate-600 transition-all duration-200 transform hover:scale-105"
              >
                <FaArrowLeft className="mr-2" />
                Späť na Dashboard
              </Link>
            </div>
          )}
        </div>

        {/* Sales Status Timeline Modal */}
        {selectedSaleForTimeline && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900">Status predaja</h2>
                <button
                  onClick={() => setSelectedSaleForTimeline(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                {/* Sale Info */}
                <div className="bg-slate-50 rounded-xl p-4 mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <img
                        src={selectedSaleForTimeline.image_url || '/default-image.png'}
                        alt={selectedSaleForTimeline.name}
                        className="h-full w-full object-contain p-2"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-lg">{selectedSaleForTimeline.name}</h3>
                      <p className="text-slate-600">Veľkosť: {selectedSaleForTimeline.size}</p>
                      <p className="text-slate-600">Cena: {selectedSaleForTimeline.price} €</p>
                      <p className="text-slate-600">Výplata: {selectedSaleForTimeline.payout.toFixed(2)} €</p>
                    </div>
                  </div>
                </div>
                
                <SalesStatusTimeline 
                  saleId={selectedSaleForTimeline.id} 
                  currentStatus={selectedSaleForTimeline.status}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}