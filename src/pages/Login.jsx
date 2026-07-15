import { useState, useEffect } from 'react';
import { signIn, signUp, signInWithGoogle, signInWithFacebook, onAuthChange } from '../lib/api';

export default function Login({ onNavigate, onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'tenant' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  // Listen for OAuth redirects (e.g., Google)
  useEffect(() => {
    const { data: { subscription } } = onAuthChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        const u = session.user;
        const userData = {
          id: u.id,
          email: u.email,
          name: u.user_metadata?.full_name || u.user_metadata?.name || u.email.split('@')[0],
          role: u.user_metadata?.role || 'tenant',
          isGoogle: u.app_metadata?.provider === 'google',
        };
        setToast('🎉 Signed in successfully!');
        if (onLogin) onLogin(userData);
        setTimeout(() => { setToast(''); onNavigate('home'); }, 1500);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setToast('');
    try {
      if (mode === 'signup') {
        const data = await signUp({ email: form.email, password: form.password, name: form.name, role: form.role });
        const u = data.user;
        const userData = { id: u.id, email: u.email, name: form.name, role: form.role };
        setToast('✅ Account created! Check your email to verify, then sign in.');
        if (onLogin) onLogin(userData);
        setTimeout(() => { setToast(''); onNavigate('home'); }, 2500);
      } else {
        const data = await signIn({ email: form.email, password: form.password });
        const u = data.user;
        const userData = {
          id: u.id,
          email: u.email,
          name: u.user_metadata?.name || form.email.split('@')[0],
          role: u.user_metadata?.role || 'tenant',
        };
        setToast('🎉 Welcome back! Redirecting...');
        if (onLogin) onLogin(userData);
        setTimeout(() => { setToast(''); onNavigate('home'); }, 1500);
      }
    } catch (err) {
      setToast(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setToast('🌐 Redirecting to Google...');
    try {
      await signInWithGoogle();
      // Auth state change listener above will handle the redirect
    } catch (err) {
      setToast(`❌ ${err.message}`);
      setLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setLoading(true);
    setToast('🌐 Redirecting to Facebook...');
    try {
      await signInWithFacebook();
    } catch (err) {
      setToast(`❌ ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Background orbs */}
      <div className="hero-orb" style={{ width: 400, height: 400, background: 'rgba(139,92,246,0.15)', top: -100, right: -100, position: 'absolute', borderRadius: '50%', filter: 'blur(80px)' }} />
      <div className="hero-orb" style={{ width: 300, height: 300, background: 'rgba(236,72,153,0.1)', bottom: -50, left: -50, position: 'absolute', borderRadius: '50%', filter: 'blur(80px)' }} />

      <div className="login-card">
        <div className="login-icon">
          <div className="login-icon-inner">🏠</div>
        </div>

        <h1 className="login-title">
          {mode === 'login' ? 'Welcome Back' : 'Join PGFinder'}
        </h1>
        <p className="login-subtitle">
          {mode === 'login'
            ? 'Sign in to access your dashboard and saved PGs'
            : 'Create an account to find your perfect PG today'}
        </p>

        {/* Role Switcher */}
        <div style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '24px',
          gap: '4px',
        }}>
          {['tenant', 'owner'].map(role => (
            <button
              key={role}
              id={`role-${role}`}
              onClick={() => setForm({ ...form, role })}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                fontWeight: 600,
                transition: 'all 0.2s',
                background: form.role === role ? 'var(--gradient-1)' : 'transparent',
                color: form.role === role ? 'white' : 'var(--text-muted)',
                boxShadow: form.role === role ? '0 4px 12px rgba(139,92,246,0.3)' : 'none',
              }}
            >
              {role === 'tenant' ? '🏠 I\'m a Tenant' : '🔑 I\'m an Owner'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label" htmlFor="signup-name">Full Name</label>
              <input
                id="signup-name"
                className="form-input"
                type="text"
                placeholder="John Doe"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          {mode === 'login' && (
            <div style={{ textAlign: 'right', marginTop: '-10px', marginBottom: '20px' }}>
              <span className="login-link" style={{ fontSize: '13px' }}>Forgot password?</span>
            </div>
          )}

          <button
            id="auth-submit-btn"
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '15px', marginTop: '8px' }}
            disabled={loading}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                {mode === 'login' ? 'Signing In...' : 'Creating Account...'}
              </span>
            ) : (
              mode === 'login' ? '🚀 Sign In' : '✨ Create Account'
            )}
          </button>
        </form>

        <div className="login-divider"><span>or continue with</span></div>

        <div className="social-login">
          <button className="social-login-btn" onClick={handleGoogleLogin}>
            <span style={{ fontWeight: 800, color: '#ea4335' }}>G</span> Google
          </button>
          <button className="social-login-btn" onClick={handleFacebookLogin}>
            <span style={{ fontWeight: 800, color: '#1877f2' }}>f</span> Facebook
          </button>
        </div>

        <p className="login-footer">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <span
            className="login-link"
            id="toggle-auth-mode"
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          >
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </span>
        </p>
      </div>

      {toast && (
        <div className="toast">{toast}</div>
      )}
    </div>
  );
}
