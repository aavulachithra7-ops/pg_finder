import { createContext, useContext, useState, useCallback } from 'react';
import { generateRooms } from '../data/rooms';
import { createBooking } from '../lib/api';

const BookingContext = createContext(null);

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within BookingProvider');
  return ctx;
}

// Generate a unique booking ID like PG-2026-001245
let bookingCounter = parseInt(localStorage.getItem('pgBookingCounter') || '0', 10);

function generateBookingId() {
  bookingCounter += 1;
  localStorage.setItem('pgBookingCounter', String(bookingCounter));
  const year = new Date().getFullYear();
  return `PG-${year}-${String(bookingCounter).padStart(6, '0')}`;
}

export function BookingProvider({ children }) {
  const [roomsByPG, setRoomsByPG] = useState({});
  const [bookings, setBookings] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pgBookings') || '[]'); }
    catch { return []; }
  });
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingPG, setBookingPG] = useState(null);

  const getRooms = useCallback((pgId, totalFloors) => {
    if (roomsByPG[pgId]) return roomsByPG[pgId];
    const rooms = generateRooms(totalFloors);
    setRoomsByPG(prev => ({ ...prev, [pgId]: rooms }));
    return rooms;
  }, [roomsByPG]);

  const selectRoom = useCallback((room) => {
    if (room.status !== 'available') return;
    setSelectedRoom(room);
  }, []);

  const clearSelectedRoom = useCallback(() => setSelectedRoom(null), []);

  const openBookingForm = useCallback((pg, room = null) => {
    setBookingPG(pg);
    if (room) setSelectedRoom(room);
    setShowBookingForm(true);
  }, []);

  const closeBookingForm = useCallback(() => {
    setShowBookingForm(false);
    setSelectedRoom(null);
    setBookingPG(null);
  }, []);

  const addBooking = useCallback(async (bookingData) => {
    const id = generateBookingId();
    const newBooking = {
      ...bookingData,
      bookingId: id,
      timestamp: new Date().toISOString(),
    };

    // Save to localStorage immediately (always works)
    const updatedBookings = [...bookings, newBooking];
    setBookings(updatedBookings);
    localStorage.setItem('pgBookings', JSON.stringify(updatedBookings));

    let resultRef = id;

    // Also save to Supabase (best-effort — won't crash if not configured)
    try {
      const currentUser = JSON.parse(localStorage.getItem('pg_current_user') || 'null');
      
      // Ensure the user_id is a valid UUID to avoid Postgres foreign key type constraint failures
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const dbUserId = (currentUser?.id && uuidRegex.test(currentUser.id)) ? currentUser.id : null;

      const saved = await createBooking({
        full_name:       bookingData.fullName || '',
        age:             bookingData.age ? Number(bookingData.age) : null,
        mobile:          bookingData.mobile || '',
        email:           bookingData.email || null,
        gender:          bookingData.gender || null,
        aadhar:          bookingData.aadhar || null,
        pg_id:           bookingData.pgId || null,
        pg_name:         bookingData.pgName || null,
        room_number:     bookingData.roomNumber ? Number(bookingData.roomNumber) : null,
        room_type:       bookingData.roomType || null,
        rent:            bookingData.rent ? Number(bookingData.rent) : null,
        check_in_date:   bookingData.checkInDate || null,
        duration:        bookingData.duration ? Number(bookingData.duration) : null,
        occupants:       bookingData.occupants ? Number(bookingData.occupants) : null,
        food_preference: bookingData.foodPreference || null,
        notes:           bookingData.notes || null,
        user_id:         dbUserId,
        status:          'pending',
      });
      if (saved?.booking_ref) {
        resultRef = saved.booking_ref;
      }
      console.log('✅ Booking saved to Supabase:', resultRef);
    } catch (err) {
      console.warn('⚠️ Could not save to Supabase (using localStorage only):', err.message);
    }

    // Mark the room as booked
    if (bookingData.roomNumber && bookingData.pgId) {
      setRoomsByPG(prev => {
        const pgRooms = prev[bookingData.pgId];
        if (!pgRooms) return prev;
        const updated = pgRooms.map(r =>
          r.roomNumber === bookingData.roomNumber ? { ...r, status: 'booked' } : r
        );
        return { ...prev, [bookingData.pgId]: updated };
      });
    }

    setSelectedRoom(null);
    return resultRef;
  }, [bookings]);

  return (
    <BookingContext.Provider value={{
      roomsByPG,
      getRooms,
      bookings,
      selectedRoom,
      selectRoom,
      clearSelectedRoom,
      showBookingForm,
      bookingPG,
      openBookingForm,
      closeBookingForm,
      addBooking,
    }}>
      {children}
    </BookingContext.Provider>
  );
}
