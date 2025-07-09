import { useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  FaSearch, FaSignOutAlt, FaSync, FaList, FaShoppingBag,
  FaUsers, FaCog, FaChartBar, FaShoppingCart, FaCheck
} from 'react-icons/fa';

interface UserProduct {
  id: string;
  user_id: string;
  product_id: string;
  name: string;
  size: string;
  price: number;
  image_url?: string;
  payout: number;
  created_at: string;
  sku: string;
  user_email?: string;
}

export default function ListedProductsPage() {
  const location = useLocation();
  const [products, setProducts] = useState<UserProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [externalId, setExternalId] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<UserProduct | null>(null);

  // Hlavný JOIN na profiles(email)
  const loadProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from('user_products')
      .select(`
        id, user_id, product_id, name, size, price, payout, created_at, image_url, sku,
        profiles(email)
      `)
      .order('created_at', { ascending: false });

    if (!error) {
      setProducts(
        data?.map(p => ({
          ...p,
          user_email: p.profiles?.email || 'N/A'
        })) || []
      );
    } else {
      console.error('Error loading products:', error.message);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleConfirmSale = async () => {
    if (!selectedProduct || !externalId) return;
    setRefreshing(true);
    setShowModal(false);

    try {
      // Vkladáš predaj
      const { error: insertError } = await supabase.from('user_sales').insert({
        user_id: selectedProduct.user_id,
        product_id: selectedProduct.product_id,
        name: selectedProduct.name,
        sku: selectedProduct.sku,
        size: selectedProduct.size,
        price: selectedProduct.price,
        payout: selectedProduct.payout,
        image_url: selectedProduct.image_url,
        status: 'accepted',
        external_id: externalId
      });
      if (insertError) throw insertError;

      // Mažeš ponuku
      const { error: deleteError } = await supabase
        .from('user_products')
        .delete()
        .eq('id', selectedProduct.id);
      if (deleteError) throw deleteError;

      // Pošleš email ak je email vyplnený
if (selectedProduct.user_email && selectedProduct.user_email !== 'N/A') {
  await fetch('https://ddzmuxcavpgbzhirzlqt.supabase.co/functions/v1/send-sale-email-ts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: selectedProduct.user_email,
      productName: selectedProduct.name,
      size: selectedProduct.size,
      price: selectedProduct.price,
      payout: selectedProduct.payout,
      external_id: externalId    
    })
  });
}

      await loadProducts();
    } catch (err: any) {
      alert('Chyba pri spracovaní: ' + err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const filtered = products.filter(p =>
    [p.name, p.sku, p.user_email, p.size].some(f =>
      f?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-orange-600 via-amber-600 to-orange-800 rounded-2xl shadow-lg">
                  <FaList className="text-white text-xl" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-800 animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                  Ponuky používateľov
                </h1>
                <p className="text-sm text-slate-400">Správa a prehľad ponúk</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => { setRefreshing(true); loadProducts().finally(() => setRefreshing(false)); }}
                className="inline-flex items-center px-4 py-2 bg-slate-700/50 text-slate-300 font-semibold rounded-xl hover:bg-slate-600/50 border border-slate-600/50 backdrop-blur-sm"
              >
                <FaSync className={`mr-2 text-sm ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Obnovuje sa...' : 'Refresh'}
              </button>
              <button
                onClick={async () => { await supabase.auth.signOut(); window.location.href = '/'; }}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-xl shadow-lg hover:from-red-700 hover:to-red-800"
              >
                <FaSignOutAlt className="mr-2 text-sm" />
                Odhlásiť
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl mb-6 overflow-hidden">
          <div className="flex overflow-x-auto">
            {[
              { label: 'Prehľad', icon: FaChartBar, path: '/admin' },
              { label: 'Produkty', icon: FaShoppingBag, path: '/admin/products' },
              { label: 'Ponuky', icon: FaList, path: '/admin/listed-products' },
              { label: 'Predaje', icon: FaShoppingCart, path: '/admin/sales' },
              { label: 'Užívatelia', icon: FaUsers, path: '/admin/users' },
              { label: 'Nastavenia', icon: FaCog, path: '/admin/settings' },
            ].map((tab) => {
              const isActive = location.pathname === tab.path;
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`relative flex items-center px-6 py-4 font-semibold transition-all duration-300 min-w-max ${
                    isActive ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
                  }`}
                >
                  <tab.icon className="mr-2 text-sm" />
                  {tab.label}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-800/50 flex justify-between items-center">
            <h3 className="text-xl font-bold text-white">Ponuky ({filtered.length})</h3>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm" />
              <input
                type="text"
                placeholder="Vyhľadať..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700/50">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400">Produkt</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400">Veľkosť</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400">Cena</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400">Payout</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400">Používateľ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400">Dátum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400">Akcia</th>
                </tr>
              </thead>
              <tbody className="bg-slate-900 divide-y divide-slate-700">
                {filtered.map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap flex items-center">
                      <img src={product.image_url || '/default-image.png'} alt="" className="h-10 w-10 rounded-lg mr-3" />
                      <div>
                        <div className="text-sm font-medium text-white">{product.name}</div>
                        <div className="text-xs text-slate-400">ID: {product.id.slice(0, 8)}...</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-white">{product.size}</td>
                    <td className="px-6 py-4 text-white">{product.price} €</td>
                    <td className="px-6 py-4 text-green-400 font-semibold">{product.payout.toFixed(2)} €</td>
                    <td className="px-6 py-4 text-slate-300">{product.user_email}</td>
                    <td className="px-6 py-4 text-slate-300 font-mono">{product.sku}</td>
                    <td className="px-6 py-4 text-slate-400">{new Date(product.created_at).toLocaleDateString('sk-SK')}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedProduct(product);
                          setExternalId('');
                          setShowModal(true);
                        }}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl"
                      >
                        <FaCheck className="mr-2 inline" /> Prijať
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="text-center py-8 text-slate-400">Žiadne ponuky</div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-slate-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full border border-slate-600">
            <h2 className="text-lg text-white font-semibold mb-4">Zadaj External ID</h2>
            <input
              type="text"
              placeholder="napr. AIR-001"
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              className="w-full p-2 rounded bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700"
              >
                Zrušiť
              </button>
              <button
                onClick={handleConfirmSale}
                disabled={!externalId}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Potvrdiť
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}