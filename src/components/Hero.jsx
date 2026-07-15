export default function Hero({ onExplore, searchComponent }) {
  return (
    <section className="hero" id="hero">
      <div className="hero-bg" />
      <div className="hero-orb hero-orb-1" />
      <div className="hero-orb hero-orb-2" />

      <div className="hero-content">
        <div className="hero-badge">
          <span className="hero-badge-dot" />
          🏠 Marathahalli's #1 PG Discovery Platform
        </div>

        <h1 className="hero-title">
          Find Your Perfect
          <br />
          <span className="gradient-text">PG in Marathahalli</span>
        </h1>

        <p className="hero-subtitle">
          Discover verified PGs with real-time room availability, weekly food menus, 
          and detailed floor plans. Your next home is just a search away.
        </p>

        {searchComponent}


      </div>
    </section>
  );
}
