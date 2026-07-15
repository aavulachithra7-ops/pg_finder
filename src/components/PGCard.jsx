import { useState } from 'react';
import { amenityIcons } from '../data/pgData';
import { useBooking } from '../context/BookingContext';

export default function PGCard({ pg, onViewDetails }) {
  const [wishlisted, setWishlisted] = useState(false);
  const { openBookingForm } = useBooking();

  const genderClass = pg.gender === 'Male' ? 'badge-male' : pg.gender === 'Female' ? 'badge-female' : 'badge-colive';
  const totalAvailable = Object.values(pg.floorAvailability).reduce((a, b) => a + b, 0);

  const handleWishlist = (e) => {
    e.stopPropagation();
    setWishlisted(!wishlisted);
  };

  const handleBookNow = (e) => {
    e.stopPropagation();
    openBookingForm(pg);
  };

  return (
    <div
      className="pg-card"
      id={`pg-card-${pg.id}`}
      onClick={() => onViewDetails(pg)}
    >
      <div className="pg-card-img">
        <img src={pg.image} alt={pg.name} loading="lazy" />
        <div className="pg-card-overlay" />

        <div className="pg-card-badges">
          <span className={`badge-gender ${genderClass}`}>
            {pg.gender === 'Male' ? '👨' : pg.gender === 'Female' ? '👩' : '👥'} {pg.gender}
          </span>
        </div>

        <button
          className={`pg-card-wishlist ${wishlisted ? 'active' : ''}`}
          onClick={handleWishlist}
          id={`wishlist-${pg.id}`}
          title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          {wishlisted ? '❤️' : '🤍'}
        </button>

        <div className="pg-card-rating">
          ⭐ {pg.rating}
        </div>
      </div>

      <div className="pg-card-body">
        <h3 className="pg-card-name">{pg.name}</h3>
        <div className="pg-card-location">
          <span>📍</span>
          <span>{pg.location}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>•</span>
          <span>{pg.distance} from metro</span>
        </div>

        <div className="pg-card-amenities">
          {pg.amenities.slice(0, 5).map(a => (
            <span key={a} className="amenity-pill">
              {amenityIcons[a] || '✓'} {a}
            </span>
          ))}
          {pg.amenities.length > 5 && (
            <span className="amenity-pill">+{pg.amenities.length - 5}</span>
          )}
        </div>

        <div className="pg-card-footer">
          <div>
            <div className="pg-card-rent">
              ₹{pg.rent.toLocaleString()} <span>/month</span>
            </div>
            <div style={{ fontSize: '12px', color: totalAvailable > 0 ? 'var(--green)' : 'var(--red)', marginTop: '4px' }}>
              {totalAvailable > 0 ? `✅ ${totalAvailable} rooms available` : '❌ Fully occupied'}
            </div>
          </div>
          <div className="pg-card-actions">
            <button className="pg-card-btn" id={`view-details-${pg.id}`}>
              View Details →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
