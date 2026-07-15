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

    // Also save to Supabase (best-effort — won't crash if not configured)
    try {
      const currentUser = JSON.parse(localStorage.getItem('pg_current_user') || 'null');
      await createBooking({
        pg_id: bookingData.pgId || null,
        user_id: currentUser?.id || null,
        pg_name: bookingData.pgName,
        user_name: bookingData.fullName || bookingData.userName,
        user_email: bookingData.email || bookingData.userEmail,
        user_phone: bookingData.mobile || bookingData.userPhone,
        move_in_date: bookingData.checkInDate || bookingData.moveInDate,
        duration: Number(bookingData.duration) || null,
        room_type: bookingData.roomType,
        special_requests: bookingData.notes || bookingData.specialRequests,
        status: 'pending',
      });
      console.log('✅ Booking saved to Supabase:', id);
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
    return id;
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
