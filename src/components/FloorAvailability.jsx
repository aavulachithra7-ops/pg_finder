import RoomCard from './RoomCard';
import { useBooking } from '../context/BookingContext';
import { getRoomStats } from '../data/rooms';

export default function FloorAvailability({ pgId, totalFloors }) {
  const { getRooms } = useBooking();
  const rooms = getRooms(pgId, totalFloors);
  const stats = getRoomStats(rooms);

  // Group rooms by floor (descending)
  const floors = [];
  for (let f = totalFloors; f >= 1; f--) {
    floors.push({
      floor: f,
      rooms: rooms.filter(r => r.floor === f).sort((a, b) => a.roomNumber - b.roomNumber),
    });
  }

  return (
    <div className="floor-availability-v2">
      {/* Summary Stats */}
      <div className="room-stats-bar">
        <div className="room-stat">
          <span className="room-stat-icon">🏢</span>
          <div>
            <div className="room-stat-value">{stats.totalFloors}</div>
            <div className="room-stat-label">Total Floors</div>
          </div>
        </div>
        <div className="room-stat">
          <span className="room-stat-icon">🚪</span>
          <div>
            <div className="room-stat-value">{stats.totalRooms}</div>
            <div className="room-stat-label">Total Rooms</div>
          </div>
        </div>
        <div className="room-stat">
          <span className="room-stat-icon">🟢</span>
          <div>
            <div className="room-stat-value" style={{ color: 'var(--green)' }}>{stats.available}</div>
            <div className="room-stat-label">Available</div>
          </div>
        </div>
        <div className="room-stat">
          <span className="room-stat-icon">🔴</span>
          <div>
            <div className="room-stat-value" style={{ color: 'var(--red)' }}>{stats.booked}</div>
            <div className="room-stat-label">Booked</div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="room-legend">
        <div className="room-legend-item">
          <span className="room-legend-dot available" />
          <span>Available</span>
        </div>
        <div className="room-legend-item">
          <span className="room-legend-dot booked" />
          <span>Booked</span>
        </div>
        <div className="room-legend-item">
          <span className="room-legend-dot selected-dot" />
          <span>Selected</span>
        </div>
        <div className="room-legend-item">
          <span className="room-legend-dot maintenance-dot" />
          <span>Maintenance</span>
        </div>
      </div>

      {/* Floor Plan as Table */}
      <div className="floor-plan-table-wrapper">
        <table className="floor-plan-table">
          <thead>
            <tr>
              <th>Floor</th>
              <th>Room No</th>
              <th>Sharing</th>
              <th>Rent</th>
              <th>Status</th>
              <th>Features</th>
            </tr>
          </thead>
          <tbody>
            {floors.flatMap(({ floor, rooms: floorRooms }) => (
              floorRooms.map(room => {
                const features = [];
                if (room.isAC) features.push('AC');
                if (room.hasAttachedBathroom) features.push('Attached Bath');
                if (room.hasBalcony) features.push('Balcony');

                return (
                  <tr key={room.id} className={`room-row ${room.status}`} id={`room-${room.roomNumber}`}>
                    <td>{floor}</td>
                    <td>{room.roomNumber}</td>
                    <td>{room.sharingLabel || room.sharing}</td>
                    <td>₹{room.rent.toLocaleString()}</td>
                    <td className="room-status-cell">{room.status}</td>
                    <td>{features.join(', ') || '-'}</td>
                  </tr>
                );
              })
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
