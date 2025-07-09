import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState, useCallback, useRef } from "react";
import type { User } from '@supabase/supabase-js';
import { supabase } from "./lib/supabase";
import AuthForm from "./components/AuthForm";
import Dashboard from "./components/Dashboard";
import Profile from "./components/Profile";
import UserSales from "./components/UserSales";
import AdminDashboard from "./components/AdminDashboard";
import ProductsPage from "./pages/ProductsPage";
import UsersPage from "./pages/UsersPage";
import ListedProductsPage from "./pages/ListedProductsPage";
import SalesPage from "./pages/SalesPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const adminCacheRef = useRef<{[key: string]: boolean}>({});
  const initializingRef = useRef(false);

  const checkAdminStatus = useCallback(async (userId: string): Promise<boolean> => {
    try {
      if (adminCacheRef.current[userId] !== undefined) {
        return adminCacheRef.current[userId];
      }

      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('id', userId)
        .single();
      
      if (adminError && adminError.code !== 'PGRST116') {
        console.warn('Admin check error:', adminError.message);
        return false;
      }
      
      const isAdminUser = !!adminData;
      adminCacheRef.current[userId] = isAdminUser;
      
      return isAdminUser;
    } catch (err: any) {
      console.warn('Error checking admin status:', err.message);
      return false;
    }
  }, []);

  const initializeAuth = useCallback(async () => {
    if (initializingRef.current) return;
    
    try {
      initializingRef.current = true;
      setError(null);

      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        throw new Error(`Auth error: ${authError.message}`);
      }

      setUser(user);

      if (user) {
        const adminStatus = await checkAdminStatus(user.id);
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(false);
        adminCacheRef.current = {};
      }
    } catch (err: any) {
      console.error("Error in initializeAuth:", err.message);
      setError("Chyba pri načítavaní: " + err.message);
      setUser(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
      initializingRef.current = false;
    }
  }, [checkAdminStatus]);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      if (isMounted) {
        await initializeAuth();
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      try {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          if (event === 'SIGNED_IN') {
            adminCacheRef.current = {};
            const adminStatus = await checkAdminStatus(currentUser.id);
            setIsAdmin(adminStatus);
          } else {
            const adminStatus = await checkAdminStatus(currentUser.id);
            setIsAdmin(adminStatus);
          }
        } else {
          setIsAdmin(false);
          adminCacheRef.current = {};
        }
        setError(null);
      } catch (err: any) {
        console.error("Error in auth state change:", err.message);
        setIsAdmin(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [initializeAuth, checkAdminStatus]);

  // Kratší loading
  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-white rounded-xl shadow-lg mb-3">
            <svg className="animate-spin h-6 w-6 text-slate-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <div className="text-lg text-gray-600">Načítava sa...</div>
        </div>
      </div>
    );
  }
  
  return (
    <Routes>
      <Route
        path="/"
        element={
          !user ? (
            <div className="min-h-screen flex justify-center items-center bg-gray-50">
              <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-lg">
                <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                  Prihlásenie
                </h1>
                <AuthForm />
              </div>
            </div>
          ) : isAdmin ? (
            <Navigate to="/admin" replace />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />
      <Route
        path="/dashboard"
        element={user && !isAdmin ? <Dashboard isAdmin={isAdmin} /> : <Navigate to={isAdmin ? "/admin" : "/"} replace />}
      />
      <Route
        path="/profile"
        element={user ? <Profile /> : <Navigate to="/" replace />}
      />
      <Route
        path="/sales"
        element={user ? <UserSales /> : <Navigate to="/" replace />}
      />
      <Route
        path="/admin"
        element={user && isAdmin ? <AdminDashboard /> : <Navigate to="/dashboard" replace />}
      />
      <Route
        path="/admin/products"
        element={user && isAdmin ? <ProductsPage /> : <Navigate to="/dashboard" replace />}
      />
      <Route
        path="/admin/users"
        element={user && isAdmin ? <UsersPage /> : <Navigate to="/dashboard" replace />}
      />
      <Route
        path="/admin/listed-products"
        element={user && isAdmin ? <ListedProductsPage /> : <Navigate to="/dashboard" replace />}
      />
      <Route
        path="/admin/sales"
        element={user && isAdmin ? <SalesPage /> : <Navigate to="/dashboard" replace />}
      />
      <Route
        path="/admin/settings"
        element={user && isAdmin ? <SettingsPage /> : <Navigate to="/dashboard" replace />}
      />
    </Routes>
  );
}