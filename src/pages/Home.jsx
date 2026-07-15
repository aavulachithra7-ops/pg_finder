import { useState, useEffect } from 'react';
import Hero from '../components/Hero';
import SearchBar from '../components/SearchBar';
import Filters from '../components/Filters';
import PGCard from '../components/PGCard';
import { pgData } from '../data/pgData';
import { getPGListings } from '../lib/api';

export default function Home({ onViewDetails }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ gender: 'All', sort: 'rent-asc', maxRent: 'all' });
  const [listings, setListings] = useState(pgData); // start with local data
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchListings() {
      try {
        const data = await getPGListings();
        if (data && data.length > 0) {
          // Normalize Supabase snake_case to camelCase
          const normalized = data.map(pg => ({
            id: pg.id,
            name: pg.name,
            location: pg.location,
            gender: pg.gender,
            rent: pg.rent,
            rating: pg.rating,
            distance: pg.distance,
            amenities: pg.amenities || [],
            totalFloors: pg.total_floors,
            floorAvailability: pg.floor_availability || {},
            image: pg.image,
            reviews: pg.pg_reviews || [],
          }));
          setListings(normalized);
        }
        // If empty, keep local pgData
      } catch {
        // Supabase not configured yet — use local data silently
      } finally {
        setLoading(false);
      }
    }
    fetchListings();
  }, []);

  const handleSearch = () => {
    // Already filtered in real-time, this handles button clicks / enter key submits
  };

  const filtered = listings
    .filter(pg => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        pg.name.toLowerCase().includes(q) ||
        pg.location.toLowerCase().includes(q) ||
        (pg.locationDetail && pg.locationDetail.toLowerCase().includes(q)) ||
        (pg.foodMenu && pg.foodMenu.toLowerCase().includes(q)) ||
        (pg.amenities && pg.amenities.some(a => a.toLowerCase().includes(q)));
      const matchesGender = filters.gender === 'All' || pg.gender === filters.gender;
      const matchesRent = filters.maxRent === 'all' ||
        (filters.maxRent === '10000-above' ? pg.rent > 10000 : pg.rent <= Number(filters.maxRent));
      return matchesSearch && matchesGender && matchesRent;
    })
    .sort((a, b) => {
      if (filters.sort === 'rent-asc') return a.rent - b.rent;
      if (filters.sort === 'rent-desc') return b.rent - a.rent;
      if (filters.sort === 'rating') return b.rating - a.rating;
      if (filters.sort === 'distance') return parseFloat(a.distance) - parseFloat(b.distance);
      return 0;
    });

  return (
    <>
      <Hero
        searchComponent={
          <SearchBar
            searchQuery={searchQuery}
            onSearch={setSearchQuery}
            onSubmit={handleSearch}
            listings={listings}
          />
        }
      />

      <section className="main-section">
        <div className="container">
          <Filters filters={filters} onFilterChange={setFilters} />

          <div style={{ marginTop: '40px' }}>
            <div className="section-header">
              <h2 className="section-title">
                🏠 PGs in <span className="gradient-text">Marathahalli</span>
              </h2>
              <span className="section-count">{filtered.length} listings found</span>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px', fontSize: '36px' }}>
                <div style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginBottom: '12px' }}>⟳</div>
                <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginTop: '8px' }}>Loading listings...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="no-results">
                <div style={{ fontSize: '60px', marginBottom: '16px' }}>🔍</div>
                <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '22px', fontWeight: 700, marginBottom: '10px' }}>
                  No PGs found
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
                  Try adjusting your filters or search query.
                </p>
              </div>
            ) : (
              <div className="pg-grid">
                {filtered.map(pg => (
                  <PGCard key={pg.id} pg={pg} onViewDetails={onViewDetails} />
                ))}
              </div>
            )}
          </div>

          {/* Features Banner */}
          <div style={{
            marginTop: '80px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '20px',
          }}>
            {[
              { icon: '✅', title: 'Verified Listings', desc: 'All PGs are personally verified by our team' },
              { icon: '⚡', title: 'Real-time Availability', desc: 'Instant floor-wise room availability updates' },
              { icon: '🍽️', title: 'Weekly Food Menu', desc: 'View daily meal plans before you move in' },
              { icon: '₹', title: 'Zero Brokerage', desc: 'Find your PG without paying any hidden fees' },
            ].map((f, i) => (
              <div key={i} style={{
                padding: '24px',
                borderRadius: '16px',
                background: 'var(--bg-glass)',
                border: '1px solid var(--border)',
                textAlign: 'center',
                transition: 'all 0.3s',
              }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>{f.icon}</div>
                <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>
                  {f.title}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
