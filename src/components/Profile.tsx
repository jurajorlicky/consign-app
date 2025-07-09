import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { FaArrowLeft, FaChartLine, FaEdit, FaTrash, FaSignOutAlt, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaBuilding, FaCreditCard } from 'react-icons/fa';
import { User } from '@supabase/supabase-js';

interface IProfile {
  first_name: string;
  last_name: string;
  profile_type: 'Osobný' | 'Obchodný';
  vat_type: string;
  company_name?: string;
  ico?: string;
  vat_number?: string;
  address: string;
  popisne_cislo: string;
  psc: string;
  mesto: string;
  krajina: string;
  email: string;
  telephone: string;
  iban: string;
}

export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');

  const [profile, setProfile] = useState<IProfile>({
    first_name: '',
    last_name: '',
    profile_type: 'Osobný',
    vat_type: '',
    company_name: '',
    ico: '',
    vat_number: '',
    address: '',
    popisne_cislo: '',
    psc: '',
    mesto: '',
    krajina: 'Slovensko',
    email: '',
    telephone: '',
    iban: '',
  });

  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const getProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        // Timeout pre profile loading
        timeoutId = setTimeout(() => {
          if (isMounted) {
            setError('Načítavanie profilu trvá príliš dlho. Skúste obnoviť stránku.');
            setLoading(false);
          }
        }, 8000);

        const userPromise = supabase.auth.getUser();
        const userTimeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('User fetch timeout')), 3000)
        );

        const { data: { user }, error: authError } = await Promise.race([
          userPromise,
          userTimeoutPromise
        ]) as any;
        
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (authError) {
          throw new Error('Chyba autentifikácie: ' + authError.message);
        }

        if (!user) {
          navigate('/');
          return;
        }

        if (!isMounted) return;

        setUser(user);
        setEmail(user.email || '');

        // Rýchle načítanie profilu s timeout
        const profilePromise = supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        const profileTimeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
        );

        try {
          const { data: profileData, error: profileError } = await Promise.race([
            profilePromise,
            profileTimeoutPromise
          ]) as any;

          if (profileData && isMounted) {
            setProfile({
              first_name: profileData.first_name || '',
              last_name: profileData.last_name || '',
              profile_type: profileData.profile_type || 'Osobný',
              vat_type: profileData.vat_type || '',
              company_name: profileData.company_name || '',
              ico: profileData.ico || '',
              vat_number: profileData.vat_number || '',
              address: profileData.address || '',
              popisne_cislo: profileData.popisne_cislo || '',
              psc: profileData.psc || '',
              mesto: profileData.mesto || '',
              krajina: profileData.krajina || 'Slovensko',
              email: profileData.email || user.email,
              telephone: profileData.telephone || '',
              iban: profileData.iban || '',
            });
          } else if (isMounted) {
            setProfile((prev) => ({ ...prev, email: user.email || '' }));
          }

          if (profileError && profileError.code !== 'PGRST116') {
            console.warn('Profile error:', profileError.message);
          }
        } catch (profileErr: any) {
          console.warn('Profile loading failed:', profileErr.message);
          if (isMounted) {
            setProfile((prev) => ({ ...prev, email: user.email || '' }));
          }
        }

      } catch (error: any) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        console.error('Error loading user data:', error.message);
        if (isMounted) {
          setError('Nepodarilo sa načítať profil. Skúste znova.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    getProfile();

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (error: any) {
      console.error('Error signing out:', error.message);
      setError('Chyba pri odhlasení.');
    }
  };

  const handleOpenModal = () => {
    setShowModal(true);
    setError(null);
    setSuccessMessage(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (profile.profile_type === 'Obchodný' && !profile.company_name) {
      setError('Pri výbere Obchodný je potrebné vyplniť názov firmy.');
      return;
    }
    if (profile.profile_type === 'Obchodný') {
      if (profile.vat_type === 'MARGIN' && !profile.ico) {
        setError('Pri výbere MARGIN je potrebné vyplniť IČO.');
        return;
      }
      if (profile.vat_type === 'VAT 0%' && (!profile.ico || !profile.vat_number)) {
        setError('Pri výbere VAT 0% je potrebné vyplniť IČO a číslo DPH.');
        return;
      }
    }

    try {
      if (!user) {
        setError('Používateľ nie je prihlásený.');
        return;
      }

      const updates = {
        id: user.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        profile_type: profile.profile_type,
        vat_type: profile.vat_type,
        company_name: profile.profile_type === 'Obchodný' ? profile.company_name : null,
        ico: profile.profile_type === 'Obchodný' ? profile.ico : null,
        vat_number: profile.vat_type === 'VAT 0%' ? profile.vat_number : null,
        address: profile.address,
        popisne_cislo: profile.popisne_cislo,
        psc: profile.psc,
        mesto: profile.mesto,
        krajina: profile.krajina,
        email: profile.email,
        telephone: profile.telephone,
        iban: profile.iban,
      };

      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(updates, { onConflict: 'id' });

      if (upsertError) {
        throw new Error('Chyba pri ukladaní profilu: ' + upsertError.message);
      }

      setSuccessMessage('Profil bol úspešne uložený!');
      setShowModal(false);
    } catch (err: any) {
      setError('Neočakávaná chyba pri ukladaní profilu: ' + err.message);
      console.error(err);
    }
  };

  const handleDeleteProfile = async () => {
    const confirmDelete = window.confirm(
      'Naozaj chcete odstrániť svoj profil? Táto akcia je nezvratná.'
    );
    if (!confirmDelete) return;

    try {
      if (!user) {
        setError('Používateľ nie je prihlásený.');
        return;
      }

      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (deleteError) {
        throw new Error('Chyba pri odstraňovaní profilu: ' + deleteError.message);
      }

      setProfile({
        first_name: '',
        last_name: '',
        profile_type: 'Osobný',
        vat_type: '',
        company_name: '',
        ico: '',
        vat_number: '',
        address: '',
        popisne_cislo: '',
        psc: '',
        mesto: '',
        krajina: 'Slovensko',
        email: user.email || '',
        telephone: '',
        iban: '',
      });

      setSuccessMessage('Profil bol úspešne odstránený.');
    } catch (error: any) {
      setError('Neočakávaná chyba pri odstraňovaní profilu: ' + error.message);
      console.error(error);
    }
  };

  // Skrátený loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <svg className="animate-spin h-8 w-8 text-slate-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-lg text-slate-600 mb-2">Načítava sa profil...</p>
          {error && (
            <div className="mt-4 text-red-600 text-sm max-w-md">
              {error}
              <button
                onClick={() => window.location.reload()}
                className="block mx-auto mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Obnoviť stránku
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 sticky top-0 z-40">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
    <div className="flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-slate-900 to-slate-700 rounded-xl">
          <FaUser className="text-white text-lg" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Môj profil</h1>
          <p className="text-sm text-slate-600">Osobné a fakturačné údaje</p>
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
          to="/sales"
          className="inline-flex items-center px-4 py-2 bg-white text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all duration-200 border border-slate-200 shadow-sm"
        >
          <FaChartLine className="mr-2 text-sm" />
          Predaje
        </Link>

        <button
          onClick={handleSignOut}
          className="inline-flex items-center px-4 py-2 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-all duration-200 border border-red-200"
        >
          <FaSignOutAlt className="mr-2 text-sm" />
          Odhlásiť sa
        </button>
      </div>
    </div>
  </div>
</header>


      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success/Error Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
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
        )}

        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-800">{successMessage}</p>
                </div>
              </div>
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-green-400 hover:text-green-600"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Account Information */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg mb-8">
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mr-3">
                <FaUser className="text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Účet</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center">
                <FaEnvelope className="text-slate-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-slate-600">Email</p>
                  <p className="text-slate-900 font-semibold">{email}</p>
                </div>
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-slate-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 6v6m-4-6h8m-8 0V9a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-slate-600">Účet vytvorený</p>
                  <p className="text-slate-900 font-semibold">{user?.created_at ? new Date(user.created_at).toLocaleDateString('sk-SK') : 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg">
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mr-3">
                  <FaUser className="text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Osobné informácie</h3>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleOpenModal}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-slate-900 to-slate-700 text-white font-semibold rounded-xl hover:from-slate-800 hover:to-slate-600 transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  <FaEdit className="mr-2 text-sm" />
                  Upraviť
                </button>
                <button
                  onClick={handleDeleteProfile}
                  className="inline-flex items-center px-4 py-2 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-all duration-200 border border-red-200"
                >
                  <FaTrash className="mr-2 text-sm" />
                  Odstrániť
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center">
                <FaUser className="text-slate-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-slate-600">Meno</p>
                  <p className="text-slate-900 font-semibold">{profile.first_name || '—'}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <FaUser className="text-slate-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-slate-600">Priezvisko</p>
                  <p className="text-slate-900 font-semibold">{profile.last_name || '—'}</p>
                </div>
              </div>

              <div className="flex items-center">
                <FaBuilding className="text-slate-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-slate-600">Typ profilu</p>
                  <p className="text-slate-900 font-semibold">{profile.profile_type || '—'}</p>
                </div>
              </div>

              {profile.profile_type === 'Obchodný' && (
                <>
                  <div className="flex items-center">
                    <FaBuilding className="text-slate-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-slate-600">Názov firmy</p>
                      <p className="text-slate-900 font-semibold">{profile.company_name || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <FaBuilding className="text-slate-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-slate-600">Typ DPH</p>
                      <p className="text-slate-900 font-semibold">{profile.vat_type || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <FaBuilding className="text-slate-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-slate-600">IČO</p>
                      <p className="text-slate-900 font-semibold">{profile.ico || '—'}</p>
                    </div>
                  </div>
                  {profile.vat_type === 'VAT 0%' && (
                    <div className="flex items-center">
                      <FaBuilding className="text-slate-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-slate-600">Číslo DPH</p>
                        <p className="text-slate-900 font-semibold">{profile.vat_number || '—'}</p>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center">
                <FaPhone className="text-slate-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-slate-600">Telefón</p>
                  <p className="text-slate-900 font-semibold">{profile.telephone || '—'}</p>
                </div>
              </div>

              <div className="flex items-center">
                <FaMapMarkerAlt className="text-slate-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-slate-600">Adresa</p>
                  <p className="text-slate-900 font-semibold">
                    {profile.address || profile.popisne_cislo ? 
                      `${profile.address || ''} ${profile.popisne_cislo || ''}`.trim() : '—'}
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                <FaMapMarkerAlt className="text-slate-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-slate-600">Mesto</p>
                  <p className="text-slate-900 font-semibold">{profile.mesto || '—'}</p>
                </div>
              </div>

              <div className="flex items-center">
                <FaMapMarkerAlt className="text-slate-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-slate-600">PSČ</p>
                  <p className="text-slate-900 font-semibold">{profile.psc || '—'}</p>
                </div>
              </div>

              <div className="flex items-center">
                <FaMapMarkerAlt className="text-slate-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-slate-600">Krajina</p>
                  <p className="text-slate-900 font-semibold">{profile.krajina || '—'}</p>
                </div>
              </div>

              <div className="flex items-center md:col-span-2">
                <FaCreditCard className="text-slate-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-slate-600">IBAN</p>
                  <p className="text-slate-900 font-semibold">{profile.iban || '—'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">Upraviť profil</h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <form onSubmit={handleSubmitProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="first_name" className="block text-sm font-semibold text-slate-700 mb-2">
                      Meno
                    </label>
                    <input
                      type="text"
                      id="first_name"
                      value={profile.first_name}
                      onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                      className="block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="last_name" className="block text-sm font-semibold text-slate-700 mb-2">
                      Priezvisko
                    </label>
                    <input
                      type="text"
                      id="last_name"
                      value={profile.last_name}
                      onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                      className="block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="profile_type" className="block text-sm font-semibold text-slate-700 mb-2">
                      Typ profilu
                    </label>
                    <select
                      id="profile_type"
                      value={profile.profile_type}
                      onChange={(e) => setProfile({ ...profile, profile_type: e.target.value as 'Osobný' | 'Obchodný', vat_type: e.target.value === 'Osobný' ? 'PRIVATE' : '' })}
                      className="block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    >
                      <option value="Osobný">Osobný</option>
                      <option value="Obchodný">Obchodný</option>
                    </select>
                  </div>

                  {profile.profile_type === 'Obchodný' && (
                    <div>
                      <label htmlFor="company_name" className="block text-sm font-semibold text-slate-700 mb-2">
                        Názov firmy
                      </label>
                      <input
                        type="text"
                        id="company_name"
                        value={profile.company_name || ''}
                        onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                        className="block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                        required={profile.profile_type === 'Obchodný'}
                      />
                    </div>
                  )}

                  {profile.profile_type === 'Obchodný' && (
                    <div>
                      <label htmlFor="vat_type" className="block text-sm font-semibold text-slate-700 mb-2">
                        Typ DPH
                      </label>
                      <select
                        id="vat_type"
                        value={profile.vat_type}
                        onChange={(e) => setProfile({ ...profile, vat_type: e.target.value })}
                        className="block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      >
                        <option value="">Vyberte typ</option>
                        <option value="MARGIN">MARGIN</option>
                        <option value="VAT 0%">VAT 0%</option>
                      </select>
                    </div>
                  )}

                  {profile.profile_type === 'Obchodný' && (
                    <div>
                      <label htmlFor="ico" className="block text-sm font-semibold text-slate-700 mb-2">
                        IČO
                      </label>
                      <input
                        type="text"
                        id="ico"
                        value={profile.ico || ''}
                        onChange={(e) => setProfile({ ...profile, ico: e.target.value })}
                        className="block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                        required={profile.profile_type === 'Obchodný'}
                      />
                    </div>
                  )}

                  {profile.profile_type === 'Obchodný' && profile.vat_type === 'VAT 0%' && (
                    <div>
                      <label htmlFor="vat_number" className="block text-sm font-semibold text-slate-700 mb-2">
                        Číslo DPH
                      </label>
                      <input
                        type="text"
                        id="vat_number"
                        value={profile.vat_number || ''}
                        onChange={(e) => setProfile({ ...profile, vat_number: e.target.value })}
                        className="block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                        required={profile.vat_type === 'VAT 0%'}
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor="address" className="block text-sm font-semibold text-slate-700 mb-2">
                      Adresa
                    </label>
                    <input
                      type="text"
                      id="address"
                      value={profile.address}
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                      className="block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="popisne_cislo" className="block text-sm font-semibold text-slate-700 mb-2">
                      Popisné číslo
                    </label>
                    <input
                      type="text"
                      id="popisne_cislo"
                      value={profile.popisne_cislo}
                      onChange={(e) => setProfile({ ...profile, popisne_cislo: e.target.value })}
                      className="block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="psc" className="block text-sm font-semibold text-slate-700 mb-2">
                      PSČ
                    </label>
                    <input
                      type="text"
                      id="psc"
                      value={profile.psc}
                      onChange={(e) => setProfile({ ...profile, psc: e.target.value })}
                      className="block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="mesto" className="block text-sm font-semibold text-slate-700 mb-2">
                      Mesto
                    </label>
                    <input
                      type="text"
                      id="mesto"
                      value={profile.mesto}
                      onChange={(e) => setProfile({ ...profile, mesto: e.target.value })}
                      className="block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="krajina" className="block text-sm font-semibold text-slate-700 mb-2">
                      Krajina
                    </label>
                    <select
                      id="krajina"
                      value={profile.krajina}
                      onChange={(e) => setProfile({ ...profile, krajina: e.target.value })}
                      className="block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      required
                    >
                      <option value="Slovensko">Slovensko</option>
                      <option value="Ceska Republika">Česká Republika</option>
                      <option value="Madarsko">Maďarsko</option>
                      <option value="Rumunsko">Rumunsko</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={profile.email}
                      readOnly
                      className="block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm bg-slate-50 text-slate-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="telephone" className="block text-sm font-semibold text-slate-700 mb-2">
                      Telefónne číslo
                    </label>
                    <input
                      type="text"
                      id="telephone"
                      value={profile.telephone}
                      onChange={(e) => setProfile({ ...profile, telephone: e.target.value })}
                      className="block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="iban" className="block text-sm font-semibold text-slate-700 mb-2">
                    IBAN
                  </label>
                  <input
                    type="text"
                    id="iban"
                    value={profile.iban}
                    onChange={(e) => setProfile({ ...profile, iban: e.target.value })}
                    className="block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-6 py-3 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors"
                  >
                    Zrušiť
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-slate-900 to-slate-700 hover:from-slate-800 hover:to-slate-600 rounded-xl transition-all duration-200"
                  >
                    Uložiť zmeny
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}