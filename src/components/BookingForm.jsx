import { useState, useEffect } from 'react';
import { useBooking } from '../context/BookingContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export default function BookingForm({ pg }) {
  const { selectedRoom, addBooking, closeBookingForm } = useBooking();
  const [submitted, setSubmitted] = useState(false);
  const [bookingId, setBookingId] = useState('');
  const [bookingRef, setBookingRef] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState('');

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

  const handleWhatsAppNotify = (overrideRef, existingWindow) => {
    const formattedMobile = form.mobile.startsWith('91') ? form.mobile : `91${form.mobile}`;
    const pgName = pg?.name || form.pgName;
    const roomNum = selectedRoom?.roomNumber || form.roomNumber;
    const roomType = form.roomType;
    const rentVal = selectedRoom?.rent || pg?.rent || 0;
    const checkIn = form.checkInDate;
    const dur = form.duration;
    const ref = overrideRef || bookingRef || bookingId;

    const message = `Hello *${form.fullName}*! 👋

Your booking request for *${pgName}* is confirmed! 🎉

*Booking Details:*
--------------------------------
🏠 *PG:* ${pgName}
🚪 *Room:* Room #${roomNum} (${roomType} Sharing)
💰 *Monthly Rent:* ₹${rentVal.toLocaleString()}/mo
📅 *Check-in Date:* ${checkIn}
⏳ *Stay Duration:* ${dur} months
📋 *Booking Reference:* ${ref}
--------------------------------

Thank you for choosing PGFinder! We are excited to welcome you home. 🏠`;

    const encodedText = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedMobile}?text=${encodedText}`;

    if (existingWindow && !existingWindow.closed) {
      existingWindow.location.href = whatsappUrl;
    } else {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.fullName.trim()) errs.fullName = 'Full name is required';
    if (!form.age || isNaN(Number(form.age)) || Number(form.age) < 18 || Number(form.age) > 100) errs.age = 'Enter a valid age (18-100)';
    if (!form.mobile.trim()) errs.mobile = 'Mobile number is required';
    else if (!/^\d{10}$/.test(form.mobile.trim())) errs.mobile = 'Enter a valid 10-digit mobile number';
    if (!form.gender) errs.gender = 'Please select gender';
    if (!form.photo) errs.photo = 'Aadhaar photo is required';
    else if (!form.photo.type?.startsWith('image/')) errs.photo = 'Please upload a valid image file';
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
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSaveError('');

    // Pre-open a blank window synchronously inside user click event to bypass popup blockers
    let whatsappWindow = null;
    try {
      whatsappWindow = window.open('about:blank', '_blank');
      if (whatsappWindow) {
        whatsappWindow.document.write(`
          <div style="font-family: 'Segoe UI', system-ui, sans-serif; text-align: center; margin-top: 80px; color: #333;">
            <div style="font-size: 40px; margin-bottom: 12px; animation: pulse 1.5s infinite;">⏳</div>
            <h3 style="margin: 0 0 8px;">Securing your booking...</h3>
            <p style="color: #666; font-size: 14px; margin: 0;">Preparing your WhatsApp notification, please wait.</p>
            <style>
              @keyframes pulse {
                0% { transform: scale(1); opacity: 0.8; }
                50% { transform: scale(1.1); opacity: 1; }
                100% { transform: scale(1); opacity: 0.8; }
              }
            </style>
          </div>
        `);
      }
    } catch (err) {
      console.warn('Browser blocked popup pre-open:', err);
    }

    const processBooking = async (bookingPayload) => {
      let ref = '';
      try {
        // addBooking handles saving to local state AND Supabase, returning the booking reference/ID
        ref = await addBooking(bookingPayload);
        const finalRef = ref || 'BK-' + Math.floor(Math.random() * 100000);
        setBookingRef(finalRef);
        setBookingId(finalRef);
        
        // Auto-send WhatsApp message immediately after booking is confirmed using the pre-opened window
        handleWhatsAppNotify(finalRef, whatsappWindow);
      } catch (err) {
        setSaveError('⚠️ Saved locally but failed to sync: ' + err.message);
        const finalRef = 'BK-' + Math.floor(Math.random() * 100000);
        setBookingRef(finalRef);
        setBookingId(finalRef);
        
        // Auto-send WhatsApp message fallback using the pre-opened window
        handleWhatsAppNotify(finalRef, whatsappWindow);
      }
      setSubmitted(true);
      setIsSubmitting(false);
    };

    const bookingPayload = {
      ...form,
      pgId: pg?.id,
      pgName: pg?.name,
      roomNumber: selectedRoom?.roomNumber || parseInt(form.roomNumber) || null,
      rent: selectedRoom?.rent || null,
    };

    if (form.photo) {
      const reader = new FileReader();
      reader.onload = () => {
        bookingPayload.photoData = reader.result;
        processBooking(bookingPayload);
      };
      reader.readAsDataURL(form.photo);
      return;
    }

    processBooking(bookingPayload);
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
              <span className="booking-id-label">Booking Ref</span>
              <span className="booking-id-value">{bookingRef || bookingId}</span>
            </div>
            {isSupabaseConfigured && !saveError && (
              <p style={{ fontSize: '13px', color: '#22c55e', marginTop: '10px', fontWeight: 500 }}>
                ✅ Saved to database successfully
              </p>
            )}
            {saveError && (
              <p style={{ fontSize: '13px', color: '#f59e0b', marginTop: '10px' }}>{saveError}</p>
            )}
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '12px' }}>
              Our team will contact you shortly to confirm your booking.
            </p>
            <button 
              className="whatsapp-btn" 
              onClick={handleWhatsAppNotify} 
              style={{ marginTop: '24px', width: '100%' }}
            >
              💬 Notify via WhatsApp
            </button>
            <button className="btn btn-primary" onClick={closeBookingForm} style={{ marginTop: '12px', width: '100%' }}>
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

        {isSupabaseConfigured && (
          <div style={{ fontSize: '12px', color: '#22c55e', textAlign: 'center', padding: '4px 0 8px', fontWeight: 500 }}>
            🔒 Connected to Supabase — your booking will be saved securely
          </div>
        )}

        <form onSubmit={handleSubmit} className="booking-form-body">
          {/* Row 1: Name & Age */}
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
              <label className="form-label" htmlFor="bf-email">Email Address</label>
              <input id="bf-email" className="form-input"
                type="email" placeholder="you@example.com" value={form.email}
                onChange={e => handleChange('email', e.target.value)} />
            </div>
          </div>

          {/* Row 3: Gender */}
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

          {/* Row 4: PG Name & Aadhaar Photo */}
          <div className="booking-form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="bf-pg">Preferred PG</label>
              <input id="bf-pg" className="form-input" type="text" value={form.pgName} readOnly
                style={{ background: 'rgba(249,115,22,0.06)', cursor: 'default' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Aadhaar Photo *</label>
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

          {/* Room Type */}
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

          {/* Row 6: Check-in & Duration */}
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

          {/* Row 7: Occupants & Food */}
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
                  Saving to Database...
                </span>
              ) : '🚀 Book Now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
