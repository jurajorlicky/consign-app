import { useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  FaSignOutAlt,
  FaSync,
  FaList,
  FaShoppingBag,
  FaUsers,
  FaCog,
  FaChartBar,
  FaShoppingCart,
  FaSave,
  FaPercent,
  FaEuroSign,
  FaExclamationTriangle
} from 'react-icons/fa';

interface AdminSettings {
  id: string;
  fee_percent: number;
  fee_fixed: number;
}

export default function SettingsPage() {
  const location = useLocation();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [feePercent, setFeePercent] = useState<string>('');
  const [feeFixed, setFeeFixed] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setError(null);
      if (!refreshing) setLoading(true);

      const { data, error } = await supabase
        .from('admin_settings')
        .select('id, fee_percent, fee_fixed')
        .single();

      if (error) throw error;

      setSettings(data);
      setFeePercent((data.fee_percent * 100).toString());
      setFeeFixed(data.fee_fixed.toString());
    } catch (err: any) {
      console.error('Error loading settings:', err.message);
      setError('Chyba pri načítavaní nastavení: ' + err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const feePercentValue = parseFloat(feePercent) / 100;
      const feeFixedValue = parseFloat(feeFixed);

      if (isNaN(feePercentValue) || isNaN(feeFixedValue)) {
        throw new Error('Neplatné hodnoty poplatkov');
      }

      if (feePercentValue < 0 || feePercentValue > 1) {
        throw new Error('Percentuálny poplatok musí byť medzi 0% a 100%');
      }

      if (feeFixedValue < 0) {
        throw new Error('Fixný poplatok nemôže byť záporný');
      }

      const { error } = await supabase
        .from('admin_settings')
        .update({
          fee_percent: feePercentValue,
          fee_fixed: feeFixedValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings?.id);

      if (error) throw error;

      setSuccess('Nastavenia boli úspešne uložené!');
      loadSettings();
    } catch (err: any) {
      console.error('Error saving settings:', err.message);
      setError('Chyba pri ukladaní nastavení: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSettings();
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
    loadSettings();
  };

  useEffect(() => {
    loadSettings();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-600 border-t-gray-500 rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-white mb-2">Načítavajú sa nastavenia</h3>
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
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-gray-600 via-slate-600 to-gray-800 rounded-2xl shadow-lg">
                  <FaCog className="text-white text-xl" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-800 animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-400 to-slate-400 bg-clip-text text-transparent">
                  Nastavenia
                </h1>
                <p className="text-sm text-slate-400">Správa systémových nastavení</p>
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

        {success && (
          <div className="mb-6 bg-green-900/20 border border-green-500/30 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="ml-3 text-sm text-green-300">{success}</p>
              </div>
              <button
                onClick={() => setSuccess(null)}
                className="text-green-400 hover:text-green-300"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
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

        {/* Settings Form */}
        <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-800/50">
            <h3 className="text-xl font-bold text-white">Systémové nastavenia</h3>
            <p className="text-slate-400 text-sm mt-1">Konfigurácia poplatkov a systémových parametrov</p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3">
                  <FaPercent className="inline mr-2" />
                  Percentuálny poplatok (%)
                </label>
                <input
                  type="number"
                  value={feePercent}
                  onChange={(e) => setFeePercent(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all duration-200"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="20"
                />
                <p className="text-xs text-slate-400 mt-2">Percentuálny poplatok z predajnej ceny</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3">
                  <FaEuroSign className="inline mr-2" />
                  Fixný poplatok (€)
                </label>
                <input
                  type="number"
                  value={feeFixed}
                  onChange={(e) => setFeeFixed(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all duration-200"
                  step="0.01"
                  min="0"
                  placeholder="5.00"
                />
                <p className="text-xs text-slate-400 mt-2">Fixný poplatok za každý predaj</p>
              </div>
            </div>

            {/* Preview */}
            {feePercent && feeFixed && (
              <div className="mt-6 bg-slate-700/30 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Náhľad výpočtu</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {[100, 200, 500].map(price => {
                    const feePercentValue = parseFloat(feePercent) / 100;
                    const feeFixedValue = parseFloat(feeFixed);
                    const payout = price * (1 - feePercentValue) - feeFixedValue;
                    return (
                      <div key={price} className="bg-slate-800/50 rounded-lg p-3">
                        <div className="text-slate-400">Predajná cena: <span className="text-white font-semibold">{price} €</span></div>
                        <div className="text-slate-400">Payout: <span className="text-green-400 font-semibold">{Math.max(0, payout).toFixed(2)} €</span></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={saving || !feePercent || !feeFixed}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-gray-600 to-slate-600 text-white font-semibold rounded-xl hover:from-gray-700 hover:to-slate-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transform hover:scale-105"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Ukladá sa...
                  </>
                ) : (
                  <>
                    <FaSave className="mr-2" />
                    Uložiť nastavenia
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}