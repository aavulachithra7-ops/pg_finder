import { useState, useEffect } from 'react';
import { useBooking } from '../context/BookingContext';

export default function BookingForm({ pg }) {
  const { selectedRoom, addBooking, closeBookingForm } = useBooking();
  const [submitted, setSubmitted] = useState(false);
  const [bookingId, setBookingId] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    age: '',
    mobile: '',
    email: '',
    gender: '',
    pgName: pg?.name || '',
    roomNumber: '',
    roomType: '',
    checkInDate: '',
    duration: '',
    occupants: '1',
    foodPreference: '',
    notes: '',
    aadhar: '',
    photo: null,
  });

  // Auto-fill from selected room
  useEffect(() => {
    if (selectedRoom) {
      setForm(prev => ({
        ...prev,
        roomNumber: String(selectedRoom.roomNumber),
        roomType: selectedRoom.sharing,
      }));
    }
  }, [selectedRoom]);

  // Auto-fill PG name
  useEffect(() => {
    if (pg) {
      setForm(prev => ({ ...prev, pgName: pg.name }));
    }
  }, [pg]);

  const validate = () => {
    const errs = {};
    if (!form.fullName.trim()) errs.fullName = 'Full name is required';
    if (!form.age || isNaN(Number(form.age)) || Number(form.age) < 18 || Number(form.age) > 100) errs.age = 'Enter a valid age (18-100)';
    if (!form.mobile.trim()) errs.mobile = 'Mobile number is required';
    else if (!/^\d{10}$/.test(form.mobile.trim())) errs.mobile = 'Enter a valid 10-digit mobile number';
    if (!form.gender) errs.gender = 'Please select gender';
    if (!form.aadhar.trim()) errs.aadhar = 'Aadhaar number is required';
    else if (!/^\d{12}$/.test(form.aadhar.trim())) errs.aadhar = 'Enter a valid 12-digit Aadhaar number';
    if (!form.roomType) errs.roomType = 'Please select room type';
    if (!form.checkInDate) errs.checkInDate = 'Check-in date is required';
    else {
      const selected = new Date(form.checkInDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) errs.checkInDate = 'Check-in date must be in the future';
    }
    if (!form.duration) errs.duration = 'Duration of stay is required';
    if (!form.foodPreference) errs.foodPreference = 'Please select food preference';
    // photo optional but if present must be image
    if (form.photo && !form.photo.type?.startsWith('image/')) errs.photo = 'Please upload a valid image file';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (isSubmitting) return;
    setIsSubmitting(true);

    // Simulate brief processing
    setTimeout(() => {
      const bookingPayload = {
        ...form,
        pgId: pg?.id,
        pgName: pg?.name,
        roomNumber: selectedRoom?.roomNumber || parseInt(form.roomNumber) || null,
        rent: selectedRoom?.rent || null,
      };

      // If photo file present, convert to data URL for storage
      if (form.photo) {
        const reader = new FileReader();
        reader.onload = () => {
          bookingPayload.photoData = reader.result;
          const id = addBooking(bookingPayload);
          setBookingId(id);
          setSubmitted(true);
          setIsSubmitting(false);
        };
        reader.readAsDataURL(form.photo);
        return;
      }

      const id = addBooking(bookingPayload);
      setBookingId(id);
      setSubmitted(true);
      setIsSubmitting(false);
    }, 800);
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  const handlePhoto = (file) => {
    setForm(prev => ({ ...prev, photo: file }));
    if (errors.photo) setErrors(prev => { const n = { ...prev }; delete n.photo; return n; });
  };

  // Get today's date as min for date input
  const today = new Date().toISOString().split('T')[0];

  if (submitted) {
    return (
      <div className="booking-form-overlay" onClick={closeBookingForm}>
        <div className="booking-form-modal" onClick={e => e.stopPropagation()}>
          <div className="booking-success">
            <div className="booking-success-icon">🎉</div>
            <h2>Booking Submitted!</h2>
            <p>Your booking request has been submitted successfully.</p>
            <div className="booking-id-display">
              <span className="booking-id-label">Booking ID</span>
              <span className="booking-id-value">{bookingId}</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '16px' }}>
              Our team will contact you shortly to confirm your booking.
            </p>
            <button className="btn btn-primary" onClick={closeBookingForm} style={{ marginTop: '24px', width: '100%' }}>
              ✅ Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-form-overlay" onClick={closeBookingForm}>
      <div className="booking-form-modal" onClick={e => e.stopPropagation()}>
        <div className="booking-form-header">
          <h2>📋 Book Your Stay</h2>
          <button className="booking-form-close" onClick={closeBookingForm}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="booking-form-body">
          {/* Row 1: Name & Mobile */}
          <div className="booking-form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="bf-name">Full Name *</label>
              <input id="bf-name" className={`form-input ${errors.fullName ? 'input-error' : ''}`}
                type="text" placeholder="John Doe" value={form.fullName}
                onChange={e => handleChange('fullName', e.target.value)} />
              {errors.fullName && <span className="field-error">{errors.fullName}</span>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="bf-age">Age *</label>
              <input id="bf-age" className={`form-input ${errors.age ? 'input-error' : ''}`}
                type="number" placeholder="25" value={form.age} min={18} max={100}
                onChange={e => handleChange('age', e.target.value.replace(/[^0-9]/g, ''))} />
              {errors.age && <span className="field-error">{errors.age}</span>}
            </div>
          </div>

          {/* Row 2: Mobile & Gender */}
          <div className="booking-form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="bf-mobile">Mobile Number *</label>
              <input id="bf-mobile" className={`form-input ${errors.mobile ? 'input-error' : ''}`}
                type="tel" placeholder="9876543210" value={form.mobile} maxLength={10}
                onChange={e => handleChange('mobile', e.target.value.replace(/\D/g, ''))} />
              {errors.mobile && <span className="field-error">{errors.mobile}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Gender *</label>
              <div className="booking-chips">
                {['Male', 'Female', 'Other'].map(g => (
                  <button key={g} type="button"
                    className={`booking-chip ${form.gender === g ? 'active' : ''}`}
                    onClick={() => handleChange('gender', g)}>
                    {g === 'Male' ? '👨' : g === 'Female' ? '👩' : '👥'} {g}
                  </button>
                ))}
              </div>
              {errors.gender && <span className="field-error">{errors.gender}</span>}
            </div>
          </div>

          {/* Row 3: PG Name (auto-filled) & Room Number */}
          <div className="booking-form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="bf-pg">Preferred PG</label>
              <input id="bf-pg" className="form-input" type="text" value={form.pgName} readOnly
                style={{ background: 'rgba(249,115,22,0.06)', cursor: 'default' }} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="bf-room">Selected Room</label>
              <input id="bf-room" className="form-input" type="text"
                value={form.roomNumber ? `Room ${form.roomNumber}` : 'Select from floor plan'}
                readOnly style={{ background: 'rgba(249,115,22,0.06)', cursor: 'default' }} />
            </div>
          </div>

          {/* Row: Aadhaar & Photo Upload */}
          <div className="booking-form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="bf-aadhar">Aadhaar Number *</label>
              <input id="bf-aadhar" className={`form-input ${errors.aadhar ? 'input-error' : ''}`}
                type="text" placeholder="123412341234" value={form.aadhar} maxLength={12}
                onChange={e => handleChange('aadhar', e.target.value.replace(/\D/g, ''))} />
              {errors.aadhar && <span className="field-error">{errors.aadhar}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Upload Photo</label>
              <input type="file" accept="image/*" className={`form-input ${errors.photo ? 'input-error' : ''}`}
                onChange={e => handlePhoto(e.target.files?.[0] || null)} />
              {errors.photo && <span className="field-error">{errors.photo}</span>}
              {form.photo && (
                <div style={{ marginTop: 8 }}>
                  <img src={URL.createObjectURL(form.photo)} alt="preview" style={{ width: 86, height: 86, objectFit: 'cover', borderRadius: 8 }} />
                </div>
              )}
            </div>
          </div>

          {/* Row 4: Room Type */}
          <div className="form-group">
            <label className="form-label">Room Type *</label>
            <div className="booking-chips">
              {[
                { value: 'single', label: '👤 Single' },
                { value: 'double', label: '👥 Double' },
                { value: 'triple', label: '👨‍👩‍👦 Triple' },
                { value: 'four', label: '👨‍👩‍👦‍👦 Four' },
              ].map(t => (
                <button key={t.value} type="button"
                  className={`booking-chip ${form.roomType === t.value ? 'active' : ''}`}
                  onClick={() => handleChange('roomType', t.value)}>
                  {t.label}
                </button>
              ))}
            </div>
            {errors.roomType && <span className="field-error">{errors.roomType}</span>}
          </div>

          {/* Row 5: Check-in & Duration */}
          <div className="booking-form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="bf-checkin">Check-in Date *</label>
              <input id="bf-checkin" className={`form-input ${errors.checkInDate ? 'input-error' : ''}`}
                type="date" value={form.checkInDate} min={today}
                onChange={e => handleChange('checkInDate', e.target.value)} />
              {errors.checkInDate && <span className="field-error">{errors.checkInDate}</span>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="bf-duration">Duration of Stay *</label>
              <select id="bf-duration" className={`form-input ${errors.duration ? 'input-error' : ''}`}
                value={form.duration} onChange={e => handleChange('duration', e.target.value)}>
                <option value="">Select duration</option>
                <option value="1">1 Month</option>
                <option value="3">3 Months</option>
                <option value="6">6 Months</option>
                <option value="12">12 Months</option>
                <option value="24">24 Months</option>
              </select>
              {errors.duration && <span className="field-error">{errors.duration}</span>}
            </div>
          </div>

          {/* Row 6: Occupants & Food */}
          <div className="booking-form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="bf-occupants">Number of Occupants</label>
              <select id="bf-occupants" className="form-input" value={form.occupants}
                onChange={e => handleChange('occupants', e.target.value)}>
                {[1, 2, 3, 4].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Food Preference *</label>
              <div className="booking-chips">
                {['Veg', 'Non-Veg'].map(f => (
                  <button key={f} type="button"
                    className={`booking-chip ${form.foodPreference === f ? 'active' : ''}`}
                    onClick={() => handleChange('foodPreference', f)}>
                    {f === 'Veg' ? '🥗' : '🍗'} {f}
                  </button>
                ))}
              </div>
              {errors.foodPreference && <span className="field-error">{errors.foodPreference}</span>}
            </div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="form-label" htmlFor="bf-notes">Additional Notes</label>
            <textarea id="bf-notes" className="form-input" rows={3}
              placeholder="Any special requirements..." value={form.notes}
              onChange={e => handleChange('notes', e.target.value)}
              style={{ resize: 'vertical' }} />
          </div>

          {/* Buttons */}
          <div className="booking-form-actions">
            <button type="button" className="btn btn-ghost" onClick={closeBookingForm}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}
              style={{ flex: 1 }}>
              {isSubmitting ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                  <span className="spinner" />
                  Processing...
                </span>
              ) : '🚀 Book Now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}




