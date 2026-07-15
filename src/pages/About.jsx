export default function About({ onNavigate }) {
  const team = [
    { name: 'Harshitha', role: 'CEO & Founder', avatar: 'H', emoji: '👩‍💼' },
    { name: 'Chitra', role: 'Head of Design', avatar: 'C', emoji: '👩‍🎨' },
    { name: 'Aneesha', role: 'Lead Engineer', avatar: 'A', emoji: '👩‍💻' },
    { name: 'Prathibha', role: 'Product Manager', avatar: 'P', emoji: '👩‍💼' },
    { name: 'Nisha', role: 'Operations Manager', avatar: 'N', emoji: '👩‍🔧' },
    { name: 'Shaistha', role: 'Marketing Lead', avatar: 'S', emoji: '👩‍🏫' },
    { name: 'Bhuvana', role: 'Customer Success', avatar: 'B', emoji: '👩‍💻' },
  ];

  const milestones = [
    { year: '2021', event: 'PGFinder founded in Marathahalli' },
    { year: '2022', event: 'Reached 100+ verified PG listings' },
    { year: '2023', event: '10,000 tenants successfully placed' },
    { year: '2024', event: 'Launched real-time floor availability feature' },
  ];

  return (
    <div className="about-page">
      <div className="container">
        {/* Hero */}
        <div className="about-hero">
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 20px',
            borderRadius: '30px',
            background: 'rgba(249,115,22,0.15)',
            border: '1px solid rgba(249,115,22,0.3)',
            color: '#7c2d12',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '28px',
          }}>
            🏆 Trusted by 12,000+ Tenants
          </div>

          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 800, marginBottom: '20px' }}>
            We're on a Mission to Make <span className="gradient-text">PG Hunting Effortless</span>
          </h1>
          <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 40px', lineHeight: '1.7' }}>
            PGFinder was born from the frustration of finding a good PG in Marathahalli.
            We're building the platform we wish had existed when we were looking.
          </p>

          <button className="btn btn-primary" onClick={() => onNavigate('home')} id="explore-pgs-btn" style={{ fontSize: '15px', padding: '14px 32px' }}>
            🏠 Explore PGs →
          </button>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '20px',
          marginBottom: '80px',
        }}>
          {[
            { num: '500+', label: 'Verified PGs', icon: '🏠' },
            { num: '12K+', label: 'Happy Tenants', icon: '😊' },
            { num: '4.8⭐', label: 'Avg Rating', icon: '⭐' },
            { num: '₹0', label: 'Brokerage', icon: '💸' },
            { num: '24/7', label: 'Support', icon: '🛡️' },
          ].map((s, i) => (
            <div key={i} className="about-stat-card">
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>{s.icon}</div>
              <div className="about-stat-num">{s.num}</div>
              <div className="about-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Mission */}
        <div className="about-mission">
          <div className="about-mission-grid">
            <div className="about-mission-text">
              <h2>Why We Built <span className="gradient-text">PGFinder</span></h2>
              <p>
                Finding a PG in Marathahalli used to mean endless calls, broker fees, and unreliable information.
                We experienced this firsthand when relocating for work — and decided to fix it.
              </p>
              <p>
                PGFinder gives tenants real-time floor-wise availability, honest noise ratings, verified amenity lists,
                and zero brokerage — everything you need to make a confident decision.
              </p>
              <p>
                For PG owners, we offer a powerful platform to reach thousands of qualified tenants and manage
                listings with ease.
              </p>
              <button
                className="btn btn-primary"
                style={{ marginTop: '16px' }}
                onClick={() => onNavigate('login')}
                id="list-pg-btn"
              >
                🔑 List Your PG Free
              </button>
            </div>

            {/* Timeline */}
            <div>
              <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '20px', fontWeight: 700, marginBottom: '24px', color: 'var(--text-secondary)' }}>
                Our Journey
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {milestones.map((m, i) => (
                  <div key={i} style={{ display: 'flex', gap: '20px', paddingBottom: i < milestones.length - 1 ? '24px' : '0', position: 'relative' }}>
                    {i < milestones.length - 1 && (
                      <div style={{ position: 'absolute', left: '19px', top: '40px', width: '2px', height: 'calc(100% - 16px)', background: 'var(--border)' }} />
                    )}
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: 'var(--gradient-1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: 800, color: 'white',
                      flexShrink: 0, zIndex: 1,
                      boxShadow: '0 4px 16px rgba(249,115,22,0.3)',
                    }}>
                      {m.year.slice(2)}
                    </div>
                    <div style={{ paddingTop: '8px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 700, marginBottom: '4px' }}>{m.year}</div>
                      <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{m.event}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Team */}
        <div className="team-section">
          <h2>Meet the <span className="gradient-text">Team</span></h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '48px' }}>
            The passionate people building the future of PG discovery
          </p>
          <div className="team-grid">
            {team.map((member, i) => (
              <div key={i} className="team-card" id={`team-${member.avatar.toLowerCase()}`}>
                <div className="team-avatar">{member.avatar}</div>
                <div className="team-name">{member.name}</div>
                <div className="team-role">{member.role}</div>
                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                  {['🐦', '💼'].map((icon, j) => (
                    <div key={j} style={{
                      width: '30px', height: '30px', borderRadius: '8px',
                      background: 'var(--bg-glass)', border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s',
                    }}>
                      {icon}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{
          margin: '60px 0 80px',
          padding: '60px 40px',
          borderRadius: '28px',
          background: 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(249,115,22,0.08), rgba(251,146,60,0.06))',
          border: '1px solid rgba(249,115,22,0.25)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(249,115,22,0.1)', filter: 'blur(60px)', top: '-100px', right: '-50px' }} />
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '36px', fontWeight: 800, marginBottom: '16px', position: 'relative' }}>
            Ready to Find Your <span className="gradient-text">Dream PG?</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px', marginBottom: '32px', position: 'relative' }}>
            Join thousands of happy tenants who found their perfect PG through PGFinder.
          </p>
          <button
            className="btn btn-primary"
            style={{ fontSize: '16px', padding: '16px 40px', position: 'relative' }}
            onClick={() => onNavigate('home')}
            id="cta-search-btn"
          >
            🔍 Start Searching Now →
          </button>
        </div>
      </div>
    </div>
  );
}




