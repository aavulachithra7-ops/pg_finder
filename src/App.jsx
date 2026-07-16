import { useState, useEffect } from 'react';
import { BookingProvider } from './context/BookingContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import PGDetails from './pages/PGDetails';
import Login from './pages/Login';
import About from './pages/About';
import OwnerDashboard from './pages/OwnerDashboard';
import { onAuthChange, signOut } from './lib/api';
import { isSupabaseConfigured } from './lib/supabase';
import './index.css';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedPG, setSelectedPG] = useState(null);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // Listen to Supabase auth state changes (handles page refresh + OAuth redirect)
  useEffect(() => {
    const { data: { subscription } } = onAuthChange((event, session) => {
      if (session?.user) {
        const u = session.user;
        setUser({
          id: u.id,
          email: u.email,
          name: u.user_metadata?.full_name || u.user_metadata?.name || u.email.split('@')[0],
          role: u.user_metadata?.role || 'tenant',
          isGoogle: u.app_metadata?.provider === 'google',
        });
      } else {
        // If there's an owner session saved in localStorage, restore it!
        const ownerProfile = localStorage.getItem('owner_profile');
        if (ownerProfile) {
          try {
            const data = JSON.parse(ownerProfile);
            setUser({
              id: data.pg_name,
              email: data.email,
              name: data.owner_name,
              role: 'owner',
              isOwnerPortal: true
            });
            setCurrentPage('owner-dashboard');
          } catch (e) {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
      setAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleNavigate = (page) => {
    setCurrentPage(page);
    setSelectedPG(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (e) {
      console.error('Logout error:', e);
    }
    // Clear both tenant and owner sessions
    localStorage.removeItem('owner_token');
    localStorage.removeItem('owner_pg_name');
    localStorage.removeItem('owner_profile');
    setUser(null);
    handleNavigate('home');
  };

  const handleViewDetails = (pg) => {
    setSelectedPG(pg);
    setCurrentPage('details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setCurrentPage('home');
    setSelectedPG(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showFooter = currentPage !== 'login' && currentPage !== 'owner-dashboard';

  // Don't render until we know the auth state
  if (!authReady) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', fontSize: '32px', background: 'var(--bg-primary, #fff)',
      }}>
        🏠
      </div>
    );
  }

  return (
    <BookingProvider>
      <div className={!isSupabaseConfigured ? 'has-env-warning' : ''}>
        {!isSupabaseConfigured && (
          <div className="env-warning-banner">
            ⚠️ Database not connected. Falling back to local mock storage. Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> env variables on deployment.
          </div>
        )}
        <Navbar currentPage={currentPage} onNavigate={handleNavigate} user={user} onLogout={handleLogout} />

        <main>
          {currentPage === 'home' && <Home onViewDetails={handleViewDetails} />}
          {currentPage === 'details' && selectedPG && <PGDetails pg={selectedPG} onBack={handleBack} />}
          {currentPage === 'login' && <Login onNavigate={handleNavigate} onLogin={handleLogin} />}
          {currentPage === 'about' && <About onNavigate={handleNavigate} />}
          {currentPage === 'owner-dashboard' && (
            user?.role === 'owner' ? (
              <OwnerDashboard onNavigate={handleNavigate} onLogout={handleLogout} />
            ) : (
              <Login onNavigate={handleNavigate} onLogin={handleLogin} />
            )
          )}
        </main>

        {showFooter && <Footer onNavigate={handleNavigate} />}
      </div>
    </BookingProvider>
  );
}
