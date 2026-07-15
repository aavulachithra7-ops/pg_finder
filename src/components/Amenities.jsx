import { amenityIcons } from '../data/pgData';

export default function Amenities({ amenities }) {
  return (
    <div className="amenities-grid">
      {amenities.map(a => (
        <div key={a} className="amenity-item" id={`amenity-${a.toLowerCase().replace(/\s+/g, '-')}`}>
          <span className="amenity-icon">{amenityIcons[a] || '✓'}</span>
          <span className="amenity-name">{a}</span>
        </div>
      ))}
    </div>
  );
}
