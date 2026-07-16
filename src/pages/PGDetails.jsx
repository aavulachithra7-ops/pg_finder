import { useState } from 'react';
import Amenities from '../components/Amenities';
import ReviewCard from '../components/ReviewCard';
import WeeklyMenu from '../components/WeeklyMenu';
import BookingForm from '../components/BookingForm';
import { useBooking } from '../context/BookingContext';
import { amenityIcons } from '../data/pgData';

export default function PGDetails({ pg, onBack }) {
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const { selectedRoom, openBookingForm, showBookingForm, bookingPG } = useBooking();
  const totalAvailable = Object.values(pg.floorAvailability).reduce((s, v) => s + v, 0);
  const [activePhoto, setActivePhoto] = useState(null);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="details-page">
      {/* Hero Image */}
      <div className="details-hero">
        <img src={pg.image} alt={pg.name} />
        <div className="details-hero-overlay" />

        <button className="details-back" onClick={onBack} id="back-btn">
          ← Back to listings
        </button>

        <div className="details-hero-content">
          <div className="container">
            <div className="details-meta" style={{ marginBottom: '10px' }}>
              <span style={{
                padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                background: pg.gender === 'Male' ? 'rgba(59,130,246,0.8)' : pg.gender === 'Female' ? 'rgba(236,72,153,0.8)' : 'rgba(249,115,22,0.8)',
                color: 'white',
              }}>
                {pg.gender === 'Male' ? '👨' : pg.gender === 'Female' ? '👩' : '👥'} {pg.gender}
              </span>
              <span style={{ padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: 'rgba(251,146,60,0.2)', color: '#fff7ed', border: '1px solid rgba(251,146,60,0.3)' }}>
                ⭐ {pg.rating} Rating
              </span>
              <span style={{ padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
                📍 {pg.distance} from metro
              </span>
            </div>
            <h1 className="details-name">{pg.name}</h1>

            {/* Glassmorphism Amenities + Price Bar */}
            <div className="hero-glass-bar">
              <div className="hero-amenities-list">
                {pg.amenities.map((amenity) => (
                  <span key={amenity} className="hero-amenity-chip">
                    <span className="hero-amenity-icon">{amenityIcons[amenity] || '✦'}</span>
                    {amenity}
                  </span>
                ))}
              </div>
              <div className="hero-price-badge">
                <span className="hero-price-from">Starting from</span>
                <span className="hero-price-value">₹{Math.max(6000, pg.rent).toLocaleString()}</span>
                <span className="hero-price-unit">/mo</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="details-body">
        <div className="container">
          <div className="details-layout">
            {/* Left Column */}
            <div>
                <h2 className="details-section-title">📋 About this PG</h2>
                <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                  {pg.name} is a premium {pg.gender.toLowerCase()} PG located in the heart of {pg.location}, Bangalore.
                  Situated just <strong style={{ color: 'var(--text-primary)' }}>{pg.distance}</strong> from the nearest metro station,
                  it offers excellent connectivity to major tech parks. The PG is known for its
                  top-class amenities, making it perfect for working professionals and students alike.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '24px' }}>
                  {[
                    { 
                      label: 'Location', 
                      value: pg.locationDetail || pg.location, 
                      icon: '📍',
                      isLink: true,
                      linkUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pg.name + ' ' + (pg.locationDetail || pg.location) + ' Bangalore')}`
                    },
                    { label: 'Total Floors', value: `${pg.totalFloors} Floors`, icon: '🏢' },
                    { label: 'Rooms Available', value: `${totalAvailable} Rooms`, icon: '🚪' },
                  ].map((item) => {
                    const cardContent = (
                      <>
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>{item.icon}</div>
                        <div style={{ fontSize: '15px', fontWeight: 700 }}>{item.value}</div>
                        <div style={{ fontSize: '12px', color: item.isLink ? 'var(--accent)' : 'var(--text-muted)', marginTop: '2px', textDecoration: item.isLink ? 'underline' : 'none' }}>
                          {item.isLink ? '🗺️ View on Maps' : item.label}
                        </div>
                      </>
                    );

                    if (item.isLink) {
                      return (
                        <a
                          key={item.label}
                          href={item.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="location-card-link"
                          style={{
                            display: 'block',
                            textDecoration: 'none',
                            color: 'inherit',
                            padding: '16px',
                            borderRadius: '12px',
                            background: 'var(--bg-glass)',
                            border: '1px solid var(--border)',
                            textAlign: 'center',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer',
                          }}
                        >
                          {cardContent}
                        </a>
                      );
                    }

                    return (
                      <div key={item.label} style={{
                        padding: '16px',
                        borderRadius: '12px',
                        background: 'var(--bg-glass)',
                        border: '1px solid var(--border)',
                        textAlign: 'center',
                      }}>
                        {cardContent}
                      </div>
                    );
                  })}
                </div>

              {/* Room Gallery */}
              {pg.roomPhotos && pg.roomPhotos.length > 0 && (
                <div className="details-section">
                  <h2 className="details-section-title">📸 Room Gallery</h2>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                    marginTop: '16px'
                  }}>
                    {pg.roomPhotos.map((photo, index) => (
                      <div 
                        key={index} 
                        className="room-photo-container"
                        onClick={() => setActivePhoto(photo)}
                        style={{
                          borderRadius: '12px',
                          overflow: 'hidden',
                          aspectRatio: '4 / 3',
                          border: '1px solid var(--border)',
                          cursor: 'pointer',
                          position: 'relative'
                        }}
                      >
                        <img 
                          src={photo} 
                          alt={`Room view ${index + 1}`} 
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'transform 0.3s ease'
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Amenities */}
              <div className="details-section">
                <h2 className="details-section-title">✨ Amenities</h2>
                <Amenities amenities={pg.amenities} />
              </div>

              {/* Room availability removed as requested */}

              {/* Sharing & Pricing removed as requested */}


              {/* Weekly Food Menu moved under reviews to use available space */}
              <div className="details-section">
                <h2 className="details-section-title">🍽️ Weekly Food Menu</h2>
                <WeeklyMenu />
              </div>
            </div>

            {/* Sidebar */}
            <div className="details-sidebar">
              <div className="booking-card">
                <div className="booking-price">
                  ₹{pg.rent.toLocaleString()}
                  <span> /month</span>
                </div>
                <div style={{ fontSize: '13px', color: totalAvailable > 0 ? 'var(--green)' : 'var(--red)', marginBottom: '4px' }}>
                  {totalAvailable > 0 ? `✅ ${totalAvailable} rooms available` : '❌ Fully occupied'}
                </div>

                <div className="booking-divider" />

                <table className="booking-info-table compact">
                  <tbody>
                    <tr>
                      <th>Location</th>
                      <td>{pg.locationDetail || pg.location}</td>
                    </tr>
                    <tr>
                      <th>Rooms</th>
                      <td>{totalAvailable} available</td>
                    </tr>
                    <tr>
                      <th>Rating</th>
                      <td>{`⭐ ${pg.rating}`}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="booking-divider" />

                <button
                  className="booking-btn"
                  id="book-now-detail-btn"
                  onClick={() => openBookingForm(pg, selectedRoom)}
                >
                  📋 Book Now
                </button>
              </div>

              {/* Sidebar: show a couple of tenant reviews in the space to the right */}
              <div className="sidebar-reviews">
                <h3 className="sidebar-section-title">💬 Tenant Reviews</h3>
                {pg.reviews && pg.reviews.length > 0 ? (
                  <div className="sidebar-reviews-list">
                    {pg.reviews.map(review => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                ) : (
                  <div className="empty-state-small">No reviews yet.</div>
                )}
              </div>

              {/* Weekly Food Menu (moved to sidebar) */}
              {/* Quick info card removed to declutter sidebar (was PGFinder Guarantee) */}
            </div>
          </div>
        </div>
      </div>

      {/* Booking Form Modal */}
      {showBookingForm && bookingPG && (
        <BookingForm pg={bookingPG} />
      )}

      {showToast && (
        <div className="toast">
          {toastMsg}
        </div>
      )}

      {activePhoto && (
        <div 
          onClick={() => setActivePhoto(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10, 10, 10, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <img 
            src={activePhoto} 
            alt="Room Gallery Zoomed" 
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              borderRadius: '12px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              objectFit: 'contain'
            }}
          />
          <button 
            onClick={() => setActivePhoto(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: 'white',
              fontSize: '20px',
              cursor: 'pointer',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}





