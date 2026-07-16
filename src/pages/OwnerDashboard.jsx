import { useState, useEffect } from 'react';
import { 
  getOwnerDashboardData, 
  updateOwnerPG, 
  manageOwnerRoom, 
  updateBookingStatus, 
  changeOwnerPassword 
} from '../lib/api';

export default function OwnerDashboard({ onNavigate, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'pg-details' | 'rooms' | 'bookings' | 'security'
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  
  // Dashboard data
  const [dashboardData, setDashboardData] = useState({ pg: null, rooms: [], bookings: [] });
  const [isOffline, setIsOffline] = useState(false);

  // PG Edit Form State
  const [pgForm, setPgForm] = useState({ location: '', rent: 0, gender: '', amenities: [], image: '' });
  const allAmenities = ['WiFi', 'Food', 'Laundry', 'CCTV', 'Hot Water', 'Lift', 'AC', 'Gym', 'Generator', 'Parking'];

  // Room CRUD Form State
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomModalMode, setRoomModalMode] = useState('add'); // 'add' | 'edit'
  const [roomForm, setRoomForm] = useState({
    room_number: '',
    floor: '',
    sharing: 'double',
    rent: '',
    status: 'available',
    has_attached_bathroom: true,
    is_ac: false,
    has_balcony: false
  });

  // Password Change Form State
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });

  // Load Dashboard Data
  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await getOwnerDashboardData();
      setDashboardData(data);
      setIsOffline(!!data.isOfflineMock);
      
      if (data.pg) {
        setPgForm({
          location: data.pg.location || '',
          rent: data.pg.rent || 0,
          gender: data.pg.gender || 'Any',
          amenities: data.pg.amenities || [],
          image: data.pg.image || ''
        });
      }
    } catch (err) {
      setToast(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePgSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateOwnerPG(pgForm);
      setToast('✅ PG details updated successfully!');
      loadData(false);
    } catch (err) {
      setToast(`❌ Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoomModalOpen = (mode, room = null) => {
    setRoomModalMode(mode);
    if (mode === 'edit' && room) {
      setRoomForm({
        room_number: room.room_number || room.roomNumber,
        floor: room.floor,
        sharing: room.sharing,
        rent: room.rent,
        status: room.status,
        has_attached_bathroom: room.has_attached_bathroom ?? room.hasAttachedBathroom ?? true,
        is_ac: room.is_ac ?? room.isAC ?? false,
        has_balcony: room.has_balcony ?? room.hasBalcony ?? false
      });
    } else {
      setRoomForm({
        room_number: '',
        floor: '',
        sharing: 'double',
        rent: '',
        status: 'available',
        has_attached_bathroom: true,
        is_ac: false,
        has_balcony: false
      });
    }
    setShowRoomModal(true);
  };

  const handleRoomSubmit = async (e) => {
    e.preventDefault();
    if (!roomForm.room_number || !roomForm.floor || !roomForm.rent) {
      setToast('❌ Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...roomForm,
        room_number: parseInt(roomForm.room_number),
        floor: parseInt(roomForm.floor),
        rent: parseInt(roomForm.rent)
      };
      await manageOwnerRoom(roomModalMode, payload);
      setToast(`✅ Room ${roomModalMode === 'add' ? 'added' : 'updated'} successfully!`);
      setShowRoomModal(false);
      loadData(false);
    } catch (err) {
      setToast(`❌ Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRoom = async (roomNumber) => {
    if (!confirm(`Are you sure you want to delete Room ${roomNumber}?`)) return;
    try {
      await manageOwnerRoom('delete', { room_number: roomNumber });
      setToast('🗑️ Room deleted successfully.');
      loadData(false);
    } catch (err) {
      setToast(`❌ Error: ${err.message}`);
    }
  };

  const handleBookingAction = async (bookingId, status) => {
    try {
      await updateBookingStatus(bookingId, status);
      setToast(`✅ Booking request ${status}!`);
      loadData(false);
    } catch (err) {
      setToast(`❌ Error: ${err.message}`);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setToast('❌ Passwords do not match.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setToast('❌ New password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    try {
      await changeOwnerPassword({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      });
      setToast('✅ Password changed successfully!');
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setToast(`❌ Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSafeLogout = () => {
    localStorage.removeItem('owner_token');
    localStorage.removeItem('owner_pg_name');
    localStorage.removeItem('owner_profile');
    if (onLogout) onLogout();
  };

  // Stat Calculations
  const stats = () => {
    const rooms = dashboardData.rooms || [];
    const bookings = dashboardData.bookings || [];
    const totalRooms = rooms.length;
    const bookedRooms = rooms.filter(r => r.status === 'booked').length;
    const availableRooms = rooms.filter(r => r.status === 'available').length;
    const maintenanceRooms = rooms.filter(r => r.status === 'maintenance').length;
    const occupancyRate = totalRooms > 0 ? Math.round((bookedRooms / totalRooms) * 100) : 0;
    
    // Monthly Revenue (rent sum of booked rooms)
    const monthlyRevenue = rooms
      .filter(r => r.status === 'booked')
      .reduce((sum, r) => sum + (r.rent || 0), 0);
      
    const pendingRequests = bookings.filter(b => b.status === 'pending').length;

    return { totalRooms, bookedRooms, availableRooms, maintenanceRooms, occupancyRate, monthlyRevenue, pendingRequests };
  };

  const currentStats = stats();

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', border: '4px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '18px', color: 'var(--text-muted)' }}>Loading Owner Dashboard...</span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px', minHeight: '80vh' }}>
      
      {/* Dashboard Top Header Banner */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        background: 'linear-gradient(90deg, #fff, #fef8f4)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '20px 24px',
        marginBottom: '24px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.03)',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <span style={{ fontSize: '12px', textTransform: 'uppercase', tracking: '1px', fontWeight: '800', color: 'var(--accent)' }}>Owner Administration</span>
          <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '4px 0 0' }}>{dashboardData.pg?.name || 'My PG Listing'}</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0' }}>Welcome, {JSON.parse(localStorage.getItem('owner_profile'))?.owner_name || 'Owner'}</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Connection status badge */}
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: '600',
            padding: '6px 12px',
            borderRadius: '20px',
            background: isOffline ? '#fff7ed' : '#f0fdf4',
            color: isOffline ? '#c2410c' : '#15803d',
            border: `1px solid ${isOffline ? '#fed7aa' : '#bbf7d0'}`
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOffline ? '#ea580c' : '#22c55e', display: 'inline-block' }} />
            {isOffline ? 'Offline Mock Mode' : 'Connected to Backend'}
          </span>
          <button className="btn btn-ghost" onClick={handleSafeLogout} style={{ border: '1px solid var(--border)', padding: '8px 16px' }}>
            🚪 Logout
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '30px', alignItems: 'start' }}>
        
        {/* Navigation Sidebar */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '16px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.02)'
        }}>
          {[
            { id: 'overview', label: '📊 Overview', desc: 'Stats and revenues' },
            { id: 'pg-details', label: '🏠 PG Details', desc: 'Manage info & photos' },
            { id: 'rooms', label: '🔑 Room Manager', desc: 'Manage availability & rent' },
            { id: 'bookings', label: '📋 Bookings', desc: 'Approve tenant requests' },
            { id: 'security', label: '⚙️ Settings', desc: 'Password & profile' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setToast(''); }}
              style={{
                textAlign: 'left',
                padding: '12px 16px',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                transition: 'all 0.2s',
                background: activeTab === tab.id ? 'var(--gradient-1)' : 'transparent',
                color: activeTab === tab.id ? 'white' : 'var(--text-primary)',
                boxShadow: activeTab === tab.id ? '0 4px 14px rgba(249, 115, 22, 0.25)' : 'none'
              }}
            >
              <div style={{ fontWeight: '700', fontSize: '14px' }}>{tab.label}</div>
              <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px', color: activeTab === tab.id ? '#fff' : 'var(--text-muted)' }}>{tab.desc}</div>
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div style={{
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.02)',
          minHeight: '400px'
        }}>
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px' }}>Dashboard Overview</h2>
              
              {/* Stat Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <div style={{ background: 'linear-gradient(135deg, #ff7e5f, #feb47b)', color: '#white', padding: '20px', borderRadius: '16px', color: '#white', boxShadow: '0 10px 20px rgba(254, 180, 123, 0.25)' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', opacity: 0.9, textTransform: 'uppercase' }}>Occupancy Rate</span>
                  <div style={{ fontSize: '32px', fontWeight: '800', margin: '8px 0' }}>{currentStats.occupancyRate}%</div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#white', width: `${currentStats.occupancyRate}%`, backgroundColor: '#fff' }} />
                  </div>
                </div>

                <div style={{ background: 'linear-gradient(135deg, #11998e, #38ef7d)', color: '#white', padding: '20px', borderRadius: '16px', color: '#white', boxShadow: '0 10px 20px rgba(56, 239, 125, 0.25)' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', opacity: 0.9, textTransform: 'uppercase' }}>Monthly Revenue</span>
                  <div style={{ fontSize: '32px', fontWeight: '800', margin: '8px 0' }}>₹{currentStats.monthlyRevenue.toLocaleString()}</div>
                  <span style={{ fontSize: '12px', opacity: 0.9 }}>from active bookings</span>
                </div>

                <div style={{ background: 'linear-gradient(135deg, #7F00FF, #E100FF)', color: '#white', padding: '20px', borderRadius: '16px', color: '#white', boxShadow: '0 10px 20px rgba(225, 0, 255, 0.25)' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', opacity: 0.9, textTransform: 'uppercase' }}>Rooms Management</span>
                  <div style={{ fontSize: '32px', fontWeight: '800', margin: '8px 0' }}>{currentStats.totalRooms} Rooms</div>
                  <span style={{ fontSize: '12px', opacity: 0.9 }}>{currentStats.availableRooms} available, {currentStats.maintenanceRooms} in repair</span>
                </div>

                <div style={{ background: 'linear-gradient(135deg, #e65c00, #F9D423)', color: '#white', padding: '20px', borderRadius: '16px', color: '#white', boxShadow: '0 10px 20px rgba(230, 92, 0, 0.25)' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', opacity: 0.9, textTransform: 'uppercase' }}>Pending Requests</span>
                  <div style={{ fontSize: '32px', fontWeight: '800', margin: '8px 0' }}>{currentStats.pendingRequests}</div>
                  <span style={{ fontSize: '12px', opacity: 0.9 }}>awaiting owner decision</span>
                </div>
              </div>

              {/* Graphical distribution breakdown */}
              <div style={{ background: '#fcfcfc', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '32px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Room Status Breakdown</h3>
                <div style={{ display: 'flex', gap: '8px', height: '24px', borderRadius: '6px', overflow: 'hidden', marginBottom: '16px' }}>
                  <div style={{ width: `${currentStats.totalRooms ? (currentStats.bookedRooms / currentStats.totalRooms) * 100 : 0}%`, background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'white', fontWeight: '700' }}>
                    {currentStats.bookedRooms > 0 && `Booked (${currentStats.bookedRooms})`}
                  </div>
                  <div style={{ width: `${currentStats.totalRooms ? (currentStats.availableRooms / currentStats.totalRooms) * 100 : 0}%`, background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'white', fontWeight: '700' }}>
                    {currentStats.availableRooms > 0 && `Available (${currentStats.availableRooms})`}
                  </div>
                  <div style={{ width: `${currentStats.totalRooms ? (currentStats.maintenanceRooms / currentStats.totalRooms) * 100 : 0}%`, background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'white', fontWeight: '700' }}>
                    {currentStats.maintenanceRooms > 0 && `Repair (${currentStats.maintenanceRooms})`}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '24px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '12px', height: '12px', background: '#22c55e', borderRadius: '3px' }} /> Booked ({currentStats.bookedRooms})</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '12px', height: '12px', background: '#3b82f6', borderRadius: '3px' }} /> Available ({currentStats.availableRooms})</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '3px' }} /> Maintenance ({currentStats.maintenanceRooms})</div>
                </div>
              </div>

              {/* Recent Bookings Notification Panel */}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Recent Booking Activity</h3>
                {dashboardData.bookings?.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic' }}>No bookings logged for this PG yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {dashboardData.bookings.slice(-4).reverse().map(b => (
                      <div key={b.id || b.bookingId} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        background: '#f9f9f9',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        fontSize: '14px'
                      }}>
                        <div>
                          <strong>{b.fullName || b.full_name}</strong> applied for Room #{b.roomNumber || b.room_number} ({b.roomType || b.room_type} sharing)
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Mobile: {b.mobile} • Stay: {b.duration} months</div>
                        </div>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '700',
                          textTransform: 'capitalize',
                          background: b.status === 'confirmed' ? '#f0fdf4' : (b.status === 'pending' ? '#fff7ed' : '#fef2f2'),
                          color: b.status === 'confirmed' ? '#166534' : (b.status === 'pending' ? '#9a3412' : '#991b1b')
                        }}>{b.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PG DETAILS */}
          {activeTab === 'pg-details' && (
            <form onSubmit={handlePgSubmit}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px' }}>Manage PG Listing</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label className="form-label">PG Name (Read-Only)</label>
                  <input className="form-input" type="text" value={dashboardData.pg?.name || ''} readOnly style={{ background: '#f5f5f5', color: '#888' }} />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Rent Base price (₹/month) *</label>
                  <input className="form-input" type="number" value={pgForm.rent} onChange={e => setPgForm({ ...pgForm, rent: parseInt(e.target.value) || 0 })} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Location / Address *</label>
                  <input className="form-input" type="text" value={pgForm.location} onChange={e => setPgForm({ ...pgForm, location: e.target.value })} required />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Tenant Restriction Type *</label>
                  <select className="form-input" value={pgForm.gender} onChange={e => setPgForm({ ...pgForm, gender: e.target.value })} required>
                    <option value="Male">Male Only</option>
                    <option value="Female">Female Only</option>
                    <option value="Co-Live">Co-Live</option>
                    <option value="Any">Any / Mixed</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">PG Photo URL</label>
                <input className="form-input" type="url" placeholder="https://..." value={pgForm.image} onChange={e => setPgForm({ ...pgForm, image: e.target.value })} />
                {pgForm.image && (
                  <div style={{ marginTop: '12px' }}>
                    <img src={pgForm.image} alt="PG listing cover preview" style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }} />
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '28px' }}>
                <label className="form-label">PG Amenities</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px', marginTop: '10px' }}>
                  {allAmenities.map(amenity => {
                    const exists = pgForm.amenities.includes(amenity);
                    return (
                      <label key={amenity} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                        <input
                          type="checkbox"
                          checked={exists}
                          onChange={() => {
                            const updated = exists 
                              ? pgForm.amenities.filter(a => a !== amenity)
                              : [...pgForm.amenities, amenity];
                            setPgForm({ ...pgForm, amenities: updated });
                          }}
                        />
                        {amenity}
                      </label>
                    );
                  })}
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '15px' }} disabled={submitting}>
                {submitting ? 'Saving Changes...' : '💾 Save PG Details'}
              </button>
            </form>
          )}

          {/* TAB 3: ROOMS MANAGER */}
          {activeTab === 'rooms' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>Room Inventory</h2>
                <button className="btn btn-primary" onClick={() => handleRoomModalOpen('add')}>
                  ➕ Add New Room
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '12px' }}>Floor</th>
                      <th style={{ padding: '12px' }}>Room #</th>
                      <th style={{ padding: '12px' }}>Sharing</th>
                      <th style={{ padding: '12px' }}>Monthly Rent</th>
                      <th style={{ padding: '12px' }}>Features</th>
                      <th style={{ padding: '12px' }}>Status</th>
                      <th style={{ padding: '12px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.rooms.map(room => (
                      <tr key={room.id || room.room_number} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px' }}>{room.floor}</td>
                        <td style={{ padding: '12px', fontWeight: '700' }}>Room {room.room_number || room.roomNumber}</td>
                        <td style={{ padding: '12px', textTransform: 'capitalize' }}>{room.sharing} Sharing</td>
                        <td style={{ padding: '12px', fontWeight: '700' }}>₹{room.rent.toLocaleString()}</td>
                        <td style={{ padding: '12px', fontSize: '18px' }}>
                          {room.is_ac && <span title="AC">❄️</span>}
                          {room.has_attached_bathroom && <span title="Attached Bathroom">🚿</span>}
                          {room.has_balcony && <span title="Balcony">🌅</span>}
                          {!room.is_ac && !room.has_attached_bathroom && !room.has_balcony && <span style={{ fontSize: '12px', color: '#ccc' }}>Standard</span>}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '700',
                            textTransform: 'capitalize',
                            background: room.status === 'available' ? '#f0fdf4' : (room.status === 'booked' ? '#eff6ff' : '#fef2f2'),
                            color: room.status === 'available' ? '#166534' : (room.status === 'booked' ? '#1e40af' : '#991b1b')
                          }}>{room.status}</span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '12px', marginRight: '6px', border: '1px solid var(--border)' }} onClick={() => handleRoomModalOpen('edit', room)}>
                            ✏️ Edit
                          </button>
                          <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '12px', color: '#ef4444', border: '1px solid #fee2e2' }} onClick={() => handleDeleteRoom(room.room_number || room.roomNumber)}>
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ROOM FORM MODAL */}
              {showRoomModal && (
                <div style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0,0,0,0.4)',
                  zIndex: 2000,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px'
                }}>
                  <div style={{
                    background: 'white',
                    padding: '28px',
                    borderRadius: '16px',
                    width: '460px',
                    maxWidth: '100%',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.15)'
                  }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>
                      {roomModalMode === 'add' ? '➕ Add Room to Listing' : '✏️ Edit Room Configuration'}
                    </h3>
                    
                    <form onSubmit={handleRoomSubmit}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div className="form-group">
                          <label className="form-label">Room Number *</label>
                          <input 
                            className="form-input" 
                            type="number" 
                            placeholder="101" 
                            value={roomForm.room_number} 
                            onChange={e => setRoomForm({ ...roomForm, room_number: e.target.value })}
                            required 
                            disabled={roomModalMode === 'edit'}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Floor *</label>
                          <input 
                            className="form-input" 
                            type="number" 
                            placeholder="1" 
                            value={roomForm.floor} 
                            onChange={e => setRoomForm({ ...roomForm, floor: e.target.value })}
                            required 
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div className="form-group">
                          <label className="form-label">Sharing Type *</label>
                          <select className="form-input" value={roomForm.sharing} onChange={e => setRoomForm({ ...roomForm, sharing: e.target.value })} required>
                            <option value="single">Single Sharing</option>
                            <option value="double">Double Sharing</option>
                            <option value="triple">Triple Sharing</option>
                            <option value="four">Four Sharing</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Monthly Rent (₹) *</label>
                          <input 
                            className="form-input" 
                            type="number" 
                            placeholder="8000" 
                            value={roomForm.rent} 
                            onChange={e => setRoomForm({ ...roomForm, rent: e.target.value })}
                            required 
                          />
                        </div>
                      </div>

                      <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label className="form-label">Room Status *</label>
                        <select className="form-input" value={roomForm.status} onChange={e => setRoomForm({ ...roomForm, status: e.target.value })} required>
                          <option value="available">Available</option>
                          <option value="booked">Booked</option>
                          <option value="maintenance">Maintenance / Repair</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={roomForm.has_attached_bathroom} 
                            onChange={e => setRoomForm({ ...roomForm, has_attached_bathroom: e.target.checked })} 
                          />
                          Attached Private Bathroom
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={roomForm.is_ac} 
                            onChange={e => setRoomForm({ ...roomForm, is_ac: e.target.checked })} 
                          />
                          Air Conditioned (AC)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={roomForm.has_balcony} 
                            onChange={e => setRoomForm({ ...roomForm, has_balcony: e.target.checked })} 
                          />
                          Attached Balcony
                        </label>
                      </div>

                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button type="button" className="btn btn-ghost" style={{ flex: 1, border: '1px solid var(--border)' }} onClick={() => setShowRoomModal(false)}>
                          Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={submitting}>
                          {submitting ? 'Saving...' : '💾 Save Room'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: BOOKINGS & PENDING REQUESTS */}
          {activeTab === 'bookings' && (
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px' }}>Tenant Booking Approvals</h2>
              
              {/* SECTION 1: Pending Approvals */}
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--accent)', marginBottom: '14px' }}>
                  ⏳ Pending Approvals ({dashboardData.bookings.filter(b => b.status === 'pending').length})
                </h3>
                {dashboardData.bookings.filter(b => b.status === 'pending').length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic', padding: '16px', border: '1px dashed var(--border)', borderRadius: '10px' }}>
                    No pending booking requests.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {dashboardData.bookings.filter(b => b.status === 'pending').map(b => (
                      <div key={b.id || b.bookingId} style={{
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        padding: '16px',
                        background: 'rgba(251, 146, 60, 0.02)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                          <div>
                            <strong style={{ fontSize: '16px' }}>{b.fullName || b.full_name}</strong> (Age: {b.age})
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              📞 {b.mobile} • ✉️ {b.email || 'No email'}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: '700', fontSize: '15px' }}>Room #{b.roomNumber || b.room_number || 'Auto'}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{b.roomType || b.room_type} Sharing</div>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '20px', fontSize: '13px', padding: '10px', background: '#f9f9f9', borderRadius: '8px', marginBottom: '14px' }}>
                          <div>📅 <strong>Check-in:</strong> {b.checkInDate || b.check_in_date}</div>
                          <div>⏳ <strong>Duration:</strong> {b.duration} Months</div>
                          <div>🥗 <strong>Food:</strong> {b.foodPreference || b.food_preference}</div>
                          {b.notes && <div style={{ flexBasis: '100%', marginTop: '6px' }}>📝 <strong>Notes:</strong> {b.notes}</div>}
                        </div>

                        {/* Aadhaar Photo Preview */}
                        {b.photoData && (
                          <div style={{ marginBottom: '14px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Aadhaar Card Attachment:</span>
                            <img 
                              src={b.photoData} 
                              alt="Tenant Aadhaar Card Verification" 
                              style={{ maxHeight: '180px', borderRadius: '8px', border: '1px solid var(--border)' }} 
                            />
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px', flex: 1, background: '#22c55e', border: 'none', boxShadow: 'none' }} onClick={() => handleBookingAction(b.id || b.bookingId, 'confirmed')}>
                            ✅ Approve Request
                          </button>
                          <button className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: '13px', flex: 1, border: '1px solid #fee2e2', color: '#ef4444' }} onClick={() => handleBookingAction(b.id || b.bookingId, 'cancelled')}>
                            ❌ Reject Request
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 2: Confirmed Tenants */}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px' }}>
                  👥 Checked-in Tenants ({dashboardData.bookings.filter(b => b.status === 'confirmed').length})
                </h3>
                {dashboardData.bookings.filter(b => b.status === 'confirmed').length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No active checked-in tenants.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: '#f5f5f5', borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '10px' }}>Tenant Name</th>
                          <th style={{ padding: '10px' }}>Room #</th>
                          <th style={{ padding: '10px' }}>Contact</th>
                          <th style={{ padding: '10px' }}>Check-in</th>
                          <th style={{ padding: '10px' }}>Food</th>
                          <th style={{ padding: '10px' }}>Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.bookings.filter(b => b.status === 'confirmed').map(b => (
                          <tr key={b.id || b.bookingId} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '10px', fontWeight: '700' }}>{b.fullName || b.full_name}</td>
                            <td style={{ padding: '10px', fontWeight: '700' }}>#{b.roomNumber || b.room_number || 'N/A'}</td>
                            <td style={{ padding: '10px' }}>{b.mobile}</td>
                            <td style={{ padding: '10px' }}>{b.checkInDate || b.check_in_date}</td>
                            <td style={{ padding: '10px' }}>{b.foodPreference || b.food_preference}</td>
                            <td style={{ padding: '10px' }}>{b.duration} months</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: SECURITY / SETTINGS */}
          {activeTab === 'security' && (
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px' }}>Security Settings</h2>
              
              <div style={{ maxWidth: '440px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>🔑 Change Account Password</h3>
                
                <form onSubmit={handlePasswordSubmit}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="old-pass">Current Password *</label>
                    <input 
                      id="old-pass"
                      className="form-input" 
                      type="password" 
                      value={passwordForm.oldPassword} 
                      onChange={e => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })} 
                      required 
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label" htmlFor="new-pass">New Password *</label>
                    <input 
                      id="new-pass"
                      className="form-input" 
                      type="password" 
                      value={passwordForm.newPassword} 
                      onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} 
                      required 
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '24px' }}>
                    <label className="form-label" htmlFor="confirm-pass">Confirm New Password *</label>
                    <input 
                      id="confirm-pass"
                      className="form-input" 
                      type="password" 
                      value={passwordForm.confirmPassword} 
                      onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} 
                      required 
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Changing Password...' : '🔒 Update Password'}
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>

      {toast && (
        <div className="toast">{toast}</div>
      )}
    </div>
  );
}
