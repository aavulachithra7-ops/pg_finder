import { useState, useEffect } from 'react';

export default function Navbar({ currentPage, onNavigate, user, onLogout }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const initials = user ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '';

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="container navbar-inner">
        <div className="navbar-logo" onClick={() => onNavigate('home')}>
          <div className="logo-icon">🏠</div>
          <span className="logo-text">PG<span>Finder</span></span>
        </div>

        <div className="navbar-nav">
          {[
            { id: 'home', label: 'Home' },
            { id: 'about', label: 'About' },
            ...(!user ? [{ id: 'login', label: 'Login' }] : []),
          ].map(link => (
            <button
              key={link.id}
              className={`nav-link ${currentPage === link.id ? 'active' : ''}`}
              onClick={() => onNavigate(link.id)}
            >
              {link.label}
            </button>
          ))}

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--gradient-1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '13px', color: 'white',
                cursor: 'default',
              }} title={user.name}>
                {initials}
              </div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Hi, {user.name.split(' ')[0]}!
              </span>
              <button
                className="nav-link"
                onClick={onLogout}
                style={{ color: '#ef4444', fontWeight: 600 }}
              >
                Logout
              </button>
            </div>
          ) : (
            <button className="nav-cta" onClick={() => onNavigate('login')}>
              🚀 List Your PG
            </button>
          )}
        </div>

        <button className="mobile-menu-btn" onClick={() => onNavigate('home')}>☰</button>
      </div>
    </nav>
  );
}
