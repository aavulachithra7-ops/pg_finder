import { useState } from 'react';
import { useBooking } from '../context/BookingContext';
import { sharingPricing } from '../data/rooms';

export default function RoomCard({ room, pgId }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const { selectedRoom, selectRoom } = useBooking();

  const isSelected = selectedRoom?.roomNumber === room.roomNumber;

  const statusConfig = {
    available: { color: '#10b981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', label: 'Available', cursor: 'pointer' },
    booked: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)', label: 'Booked', cursor: 'not-allowed' },
    maintenance: { color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', border: 'rgba(156,163,175,0.3)', label: 'Maintenance', cursor: 'not-allowed' },
  };

  const status = statusConfig[room.status];
  const pricing = sharingPricing.find(s => s.type === room.sharing);

  const handleClick = () => {
    if (room.status === 'available') {
      selectRoom(room);
    }
  };

  return (
    <div
      className={`room-card ${room.status} ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      style={{ cursor: status.cursor }}
      role="button"
      aria-label={`Room ${room.roomNumber} - ${status.label}`}
      tabIndex={room.status === 'available' ? 0 : -1}
    >
      <div className="room-card-number">{room.roomNumber}</div>
      <div className="room-card-sharing">{pricing?.icon}</div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="room-tooltip">
          <div className="room-tooltip-header">
            Room {room.roomNumber}
            <span className="room-tooltip-status" style={{ color: status.color, background: status.bg, border: `1px solid ${status.border}` }}>
              {status.label}
            </span>
          </div>
          <div className="room-tooltip-grid">
            <div className="room-tooltip-item">
              <span className="room-tooltip-label">Floor</span>
              <span className="room-tooltip-value">{room.floor}</span>
            </div>
            <div className="room-tooltip-item">
              <span className="room-tooltip-label">Type</span>
              <span className="room-tooltip-value">{room.sharingLabel}</span>
            </div>
            <div className="room-tooltip-item">
              <span className="room-tooltip-label">Rent</span>
              <span className="room-tooltip-value">₹{room.rent.toLocaleString()}/mo</span>
            </div>
            <div className="room-tooltip-item">
              <span className="room-tooltip-label">Bathroom</span>
              <span className="room-tooltip-value">{room.hasAttachedBathroom ? 'Attached' : 'Common'}</span>
            </div>
            <div className="room-tooltip-item">
              <span className="room-tooltip-label">AC</span>
              <span className="room-tooltip-value">{room.isAC ? 'AC' : 'Non-AC'}</span>
            </div>
            <div className="room-tooltip-item">
              <span className="room-tooltip-label">Balcony</span>
              <span className="room-tooltip-value">{room.hasBalcony ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
