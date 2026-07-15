import { useState, useEffect } from 'react';
import { BookingProvider } from './context/BookingContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import PGDetails from './pages/PGDetails';
import Login from './pages/Login';
import About from './pages/About';
import { onAuthChange, signOut } from './lib/api';
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
        setUser(null);
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

  const showFooter = currentPage !== 'login';

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
      <div>
        <Navbar currentPage={currentPage} onNavigate={handleNavigate} user={user} onLogout={handleLogout} />

        <main>
          {currentPage === 'home' && <Home onViewDetails={handleViewDetails} />}
          {currentPage === 'details' && selectedPG && <PGDetails pg={selectedPG} onBack={handleBack} />}
          {currentPage === 'login' && <Login onNavigate={handleNavigate} onLogin={handleLogin} />}
          {currentPage === 'about' && <About onNavigate={handleNavigate} />}
        </main>

        {showFooter && <Footer onNavigate={handleNavigate} />}
      </div>
    </BookingProvider>
  );
}
