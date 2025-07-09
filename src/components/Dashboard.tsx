import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getFees, calculatePayout } from '../lib/fees';
import AddProductModal from './AddProductModal';
import EditProductModal from './EditProductModal';
import { FaEdit, FaTrash, FaUser, FaSignOutAlt, FaChartLine, FaPlus, FaShoppingBag, FaSyncAlt, FaCog, FaExclamationTriangle } from 'react-icons/fa';

interface Product {
  id: string;
  name: string;
  size: string;
  price: number;
  image_url?: string | null;
  original_price?: number;
  product_id: string;
  user_id: string;
  payout: number;
  sku: string;
}

interface MarketPrice {
  final_price: number;
}

interface Fees {
  fee_percent: number;
  fee_fixed: number;
}

interface DashboardProps {
  isAdmin: boolean;
}

export default function Dashboard({ isAdmin }: DashboardProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fees, setFees] = useState<Fees>({ fee_percent: 0.2, fee_fixed: 5 });
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [marketPricesLoading, setMarketPricesLoading] = useState<boolean>(false);

  const fetchProducts = useCallback(async (userId: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      setError(null);
      
      const { data, error } = await supabase
        .from('user_products')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);

      if (error) {
        throw new Error(`Chyba pri načítavaní produktov: ${error.message}`);
      }

      if (Array.isArray(data)) {
        const validProducts = data.filter(
          (product) => product !== null && product !== undefined
        );
        setProducts(validProducts);
        
        if (validProducts.length > 0) {
          fetchMarketPricesWithTimeout(validProducts).catch(err => {
            console.warn('Market prices failed to load:', err.message);
          });
        }
      } else {
        setProducts([]);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('Error fetching products:', err.message);
      
      if (err.name === 'AbortError') {
        setError('Načítavanie produktov trvá príliš dlho. Skúste obnoviť stránku.');
      } else {
        setError(err.message || 'Došlo k chybe pri načítavaní produktov');
      }
      setProducts([]);
    }
  }, []);

  const fetchMarketPricesWithTimeout = useCallback(async (products: Product[]) => {
    try {
      setMarketPricesLoading(true);
      const pricesMap: Record<string, number> = {};
      
      const pricePromises = products.slice(0, 10).map(async (product) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout per request

          const { data: priceData, error: priceError } = await supabase
            .from('product_price_view')
            .select('final_price')
            .eq('product_id', product.product_id)
            .eq('size', product.size)
            .eq('final_status', 'Skladom')
            .order('final_price', { ascending: true })
            .limit(1)
            .single()
            .abortSignal(controller.signal);

          clearTimeout(timeoutId);
            
          if (priceError && priceError.code !== 'PGRST116') {
            return;
          }

          if (priceData) {
            const key = `${product.product_id}-${product.size}`;
            pricesMap[key] = priceData.final_price;
          }
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            console.warn(`Error fetching market price for product ${product.product_id}:`, err.message);
          }
        }
      });

      await Promise.allSettled(pricePromises);
      setMarketPrices(pricesMap);
    } catch (err: any) {
      console.error('Error fetching market prices:', err.message);
    } finally {
      setMarketPricesLoading(false);
    }
  }, []);

  const initializeUser = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    try {
      setError(null);

      const { data: { user }, error: authError } = await supabase.auth.getUser();

      clearTimeout(timeoutId);

      if (authError) {
        throw new Error(`Chyba autentifikácie: ${authError.message}`);
      }

      if (!user) {
        navigate('/');
        return;
      }

      setUser(user);
      
      const [feesResult, productsResult] = await Promise.allSettled([
        getFees(),
        fetchProducts(user.id)
      ]);

      if (feesResult.status === 'fulfilled') {
        setFees(feesResult.value);
      } else {
        console.warn('Failed to load fees, using defaults');
      }

      if (productsResult.status === 'rejected') {
        console.warn('Failed to load products:', productsResult.reason);
      }

    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('Error initializing user:', err.message);
      
      if (err.name === 'AbortError') {
        setError('Načítavanie trvá príliš dlho. Skúste obnoviť stránku.');
      } else {
        setError(err.message || 'Chyba pri načítavaní používateľa');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, fetchProducts]);

  useEffect(() => {
    if (isAdmin && user && !loading) {
      navigate('/admin', { replace: true });
    }
  }, [isAdmin, user, loading, navigate]);

  useEffect(() => {
    let isMounted = true;
    
    const initialize = async () => {
      if (isMounted) {
        await initializeUser();
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run once

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (err: any) {
      console.error('Error signing out:', err.message);
      setError('Chyba pri odhlasovaní');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Naozaj chcete odstrániť tento produkt?')) return;

    try {
      const { error } = await supabase.from('user_products').delete().eq('id', id);
      if (error) {
        throw new Error(`Chyba pri odstraňovaní produktu: ${error.message}`);
      }
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setError(null);
    } catch (err: any) {
      console.error('Error deleting product:', err.message);
      setError(err.message);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsEditModalOpen(true);
  };

  const handleProductUpdated = (updatedProduct: Product) => {
    setProducts((prevProducts) =>
      prevProducts.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
    );
    setIsEditModalOpen(false);
    setEditingProduct(null);
  };

  const handleRefresh = async () => {
    if (user && !refreshing) {
      setRefreshing(true);
      try {
        await fetchProducts(user.id);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setRefreshing(false);
      }
    }
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    initializeUser();
  };

  // Loading state with timeout indicator
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
          <p className="text-lg text-slate-600 mb-2">Načítava sa dashboard...</p>
          <p className="text-sm text-slate-500">Ak sa načítavanie zdá príliš dlhé, skúste obnoviť stránku</p>
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl max-w-md mx-auto">
              <div className="flex items-center text-red-800 mb-2">
                <FaExclamationTriangle className="mr-2" />
                <span className="font-semibold">Chyba</span>
              </div>
              <p className="text-red-700 text-sm mb-3">{error}</p>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                Skúsiť znova
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-slate-600 mb-4">Používateľ neexistuje alebo nie je prihlásený.</div>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            Prihlásiť sa
          </button>
        </div>
      </div>
    );
  }

  const totalPayout = products.reduce((sum, product) => sum + product.payout, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-slate-900 to-slate-700 rounded-xl">
                <FaShoppingBag className="text-white text-lg" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Seller Hub</h1>
                <p className="text-sm text-slate-600">Správa vašich produktov</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-slate-900 to-slate-700 text-white font-semibold rounded-xl hover:from-slate-800 hover:to-slate-600 transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                <FaPlus className="mr-2 text-sm" />
                Pridať produkt
              </button>
              
              <Link
                to="/sales"
                className="inline-flex items-center px-4 py-2 bg-white text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all duration-200 border border-slate-200 shadow-sm"
              >
                <FaChartLine className="mr-2 text-sm" />
                Predaje
              </Link>
              
              <Link
                to="/profile"
                className="inline-flex items-center px-4 py-2 bg-white text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all duration-200 border border-slate-200 shadow-sm"
              >
                <FaUser className="mr-2 text-sm" />
                Profil
              </Link>

              {isAdmin && (
                <Link
                  to="/admin"
                  className="inline-flex items-center px-4 py-2 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-all duration-200 border border-red-200"
                >
                  <FaCog className="mr-2 text-sm" />
                  Admin
                </Link>
              )}
              
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FaShoppingBag className="text-blue-600 text-xl" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Celkový počet produktov</p>
                <p className="text-2xl font-bold text-slate-900">{products.length}</p>
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Priemerná cena</p>
                <p className="text-2xl font-bold text-slate-900">
                  {products.length > 0 ? (products.reduce((sum, p) => sum + p.price, 0) / products.length).toFixed(2) : '0.00'} €
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Vaše produkty</h3>
              {marketPricesLoading && (
                <p className="text-sm text-slate-500 mt-1">Načítavajú sa trhové ceny...</p>
              )}
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-600 font-semibold rounded-xl hover:bg-blue-100 transition-all duration-200 border border-blue-200 disabled:opacity-50"
              title="Obnoviť produkty"
            >
              <FaSyncAlt className={`mr-2 text-sm ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Obnovuje sa...' : 'Obnoviť'}
            </button>
          </div>
          
          {products.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">#</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Produkt</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Veľkosť</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">SKU</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Cena</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Payout</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Akcie</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {products.map((product, index) => {
                    const currentMarketPrice = marketPrices[`${product.product_id}-${product.size}`];
                    
                    let priceColor = 'text-slate-900';
                    let priceStatus = '';
                    let priceBadge = null;
                    
                    if (currentMarketPrice !== undefined && currentMarketPrice !== null) {
                      if (product.price <= currentMarketPrice) {
                        priceColor = 'text-green-600 font-semibold';
                        if (product.price < currentMarketPrice) {
                          priceStatus = `(-${(currentMarketPrice - product.price).toFixed(2)} €)`;
                          priceBadge = <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 ml-2">Najnižšia</span>;
                        }
                      } else {
                        priceColor = 'text-red-600 font-semibold';
                        priceStatus = `(+${(product.price - currentMarketPrice).toFixed(2)} €)`;
                        priceBadge = <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 ml-2">Vyššia</span>;
                      }
                    }

                    return (
                      <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-medium">{index + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                              <img
                                className="h-full w-full object-contain p-2"
                                src={product?.image_url || '/default-image.png'}
                                alt={product?.name || 'Žiadny obrázok'}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = '/default-image.png';
                                }}
                              />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-semibold text-slate-900">
                                {product?.name || 'Neznámy názov'}
                              </div>
                              {currentMarketPrice && (
                                <div className="text-xs text-slate-500 mt-1">
                                  Trhová cena: {currentMarketPrice} €
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-800">
                            {product?.size || 'Neznáma veľkosť'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {product.sku || 'N/A'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${priceColor}`}>
                          <div className="flex items-center">
                            {product?.price ? `${product.price} €` : 'Neznáma cena'}
                            {priceBadge}
                          </div>
                          {priceStatus && (
                            <div className="text-xs text-slate-500 mt-1">
                              {priceStatus}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                          {product.payout.toFixed(2)} €
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => handleEditProduct(product)}
                              className="text-slate-600 hover:text-slate-900 transition-colors p-2 hover:bg-slate-100 rounded-lg"
                              title="Upraviť produkt"
                            >
                              <FaEdit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="text-red-600 hover:text-red-700 transition-colors p-2 hover:bg-red-50 rounded-lg"
                              title="Odstrániť produkt"
                            >
                              <FaTrash className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FaShoppingBag className="text-slate-400 text-2xl" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Žiadne produkty</h3>
              <p className="text-slate-600 mb-6">Začnite pridaním svojho prvého produktu</p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-slate-900 to-slate-700 text-white font-semibold rounded-xl hover:from-slate-800 hover:to-slate-600 transition-all duration-200 transform hover:scale-105"
              >
                <FaPlus className="mr-2" />
                Pridať produkt
              </button>
            </div>
          )}
        </div>

        <AddProductModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onProductAdded={(newProduct) => setProducts((prev) => [...prev, newProduct])}
        />

        {editingProduct && (
          <EditProductModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onProductUpdated={handleProductUpdated}
            product={editingProduct}
          />
        )}
      </main>
    </div>
  );
}