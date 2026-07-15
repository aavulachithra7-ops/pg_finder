export default function Footer({ onNavigate }) {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div className="logo-icon">🏠</div>
              <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '20px', fontWeight: 700 }}>
                PG<span style={{ color: 'var(--accent)' }}>Finder</span>
              </span>
            </div>
            <p>
              Connecting tenants with the best PGs in Marathahalli. 
              Find your perfect home away from home with zero brokerage.
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              {['🐦', '📘', '📸', '💼'].map((icon, i) => (
                <button key={i} className="social-btn">{icon}</button>
              ))}
            </div>
          </div>

          <div className="footer-col">
            <h4>Explore</h4>
            <div className="footer-links">
              {['Home', 'About', 'Blog', 'Contact'].map(l => (
                <button key={l} className="footer-link" onClick={() => onNavigate(l.toLowerCase())}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="footer-col">
            <h4>For Tenants</h4>
            <div className="footer-links">
              {['Search PGs', 'Compare PGs', 'Save Wishlist', 'Reviews'].map(l => (
                <button key={l} className="footer-link">{l}</button>
              ))}
            </div>
          </div>

          <div className="footer-col">
            <h4>For Owners</h4>
            <div className="footer-links">
              {['List Your PG', 'Manage Listings', 'Analytics', 'Support'].map(l => (
                <button key={l} className="footer-link" onClick={() => l === 'List Your PG' && onNavigate('login')}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2024 PGFinder. Made with ❤️ for Marathahalli residents. All rights reserved.</p>
          <div style={{ display: 'flex', gap: '20px' }}>
            {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map(l => (
              <button key={l} className="footer-link" style={{ fontSize: '13px' }}>{l}</button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
