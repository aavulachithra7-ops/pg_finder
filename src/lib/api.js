import { supabase, isSupabaseConfigured } from './supabase';
import { auth, db, isFirebaseConfigured } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  FacebookAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  collection, 
  query, 
  where 
} from 'firebase/firestore';
import { pgData } from '../data/pgData';

// ─── LOCAL STORAGE MOCK SETUP ──────────────────────────────────────────────────
const MOCK_USERS_KEY = 'pg_mock_users';
const MOCK_LISTINGS_KEY = 'pg_mock_listings';
const MOCK_BOOKINGS_KEY = 'pg_mock_bookings';
const CURRENT_USER_KEY = 'pg_current_user';
const SESSION_KEY = 'pg_session';

function getStorageItem(key, defaultValue) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStorageItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error setting localStorage key "${key}":`, err);
  }
}

// Initialize mock datasets (only if neither backend is configured)
if (!isSupabaseConfigured && !isFirebaseConfigured) {
  if (!localStorage.getItem(MOCK_LISTINGS_KEY)) {
    setStorageItem(MOCK_LISTINGS_KEY, pgData);
  }

  const defaultUsers = [
    {
      id: 'mock-user-1',
      email: 'test@example.com',
      password: 'password',
      user_metadata: { name: 'Test Tenant', role: 'tenant' },
      app_metadata: { provider: 'email' }
    },
    {
      id: 'mock-user-2',
      email: 'owner@example.com',
      password: 'password',
      user_metadata: { name: 'Test Owner', role: 'owner' },
      app_metadata: { provider: 'email' }
    }
  ];

  if (!localStorage.getItem(MOCK_USERS_KEY)) {
    setStorageItem(MOCK_USERS_KEY, defaultUsers);
  }
}

// Mock auth callbacks subscription registry
const authListeners = new Set();

function notifyAuthListeners(event, session) {
  authListeners.forEach(cb => {
    try {
      cb(event, session);
    } catch (err) {
      console.error('Error in mock auth callback:', err);
    }
  });
}

// ─── USER LOGIN RECORDER ──────────────────────────────────────────────────────

/**
 * Insert a row into user_logins table to track login activity.
 * Called after every successful sign-up or sign-in.
 */
async function recordUserLogin({ userId, name, email, role, provider }) {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from('user_logins').insert([{
      user_id:  userId,
      name:     name || null,
      email:    email,
      role:     role || 'tenant',
      provider: provider || 'email',
      login_at: new Date().toISOString(),
    }]);
  } catch (err) {
    // Non-fatal – just log
    console.warn('Could not record login event:', err.message);
  }
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

/** Sign up with email and password */
export async function signUp({ email, password, name, role }) {
  if (isFirebaseConfigured) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Save profile to profiles collection
    await setDoc(doc(db, 'profiles', user.uid), {
      id: user.uid,
      name,
      email,
      role
    });

    const sessionUser = {
      id: user.uid,
      email: user.email,
      user_metadata: { name, role },
      app_metadata: { provider: 'email' }
    };
    setStorageItem(CURRENT_USER_KEY, sessionUser);
    setStorageItem(SESSION_KEY, 'firebase-session-token');

    notifyAuthListeners('SIGNED_IN', { user: sessionUser });

    return { user: sessionUser };
  }

  if (!isSupabaseConfigured) {
    const users = getStorageItem(MOCK_USERS_KEY, []);
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('An account with this email already exists.');
    }
    const newUser = {
      id: 'mock-user-' + Math.random().toString(36).substr(2, 9),
      email,
      password,
      user_metadata: { name, role },
      app_metadata: { provider: 'email' }
    };
    users.push(newUser);
    setStorageItem(MOCK_USERS_KEY, users);

    const sessionUser = {
      id: newUser.id,
      email: newUser.email,
      user_metadata: newUser.user_metadata,
      app_metadata: newUser.app_metadata
    };
    setStorageItem(CURRENT_USER_KEY, sessionUser);
    setStorageItem(SESSION_KEY, 'mock-session-token');

    notifyAuthListeners('SIGNED_IN', { user: sessionUser });

    return { user: sessionUser };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, role },
    },
  });
  if (error) throw error;

  // Save profile to profiles table
  if (data.user) {
    await supabase.from('profiles').upsert({
      id: data.user.id,
      name,
      email,
      role,
    });

    // Record signup in user_logins
    await recordUserLogin({
      userId:   data.user.id,
      name,
      email,
      role,
      provider: 'email',
    });
  }
  return data;
}

/** Sign in with email and password */
export async function signIn({ email, password }) {
  if (isFirebaseConfigured) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Fetch profile
    let role = 'tenant';
    let name = user.displayName || user.email.split('@')[0];
    try {
      const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
      if (profileDoc.exists()) {
        role = profileDoc.data().role || 'tenant';
        name = profileDoc.data().name || name;
      }
    } catch (err) {
      console.error('Error fetching profile on signin:', err);
    }

    const sessionUser = {
      id: user.uid,
      email: user.email,
      user_metadata: { name, role },
      app_metadata: { provider: 'email' }
    };
    setStorageItem(CURRENT_USER_KEY, sessionUser);
    setStorageItem(SESSION_KEY, 'firebase-session-token');

    notifyAuthListeners('SIGNED_IN', { user: sessionUser });

    return { user: sessionUser };
  }

  if (!isSupabaseConfigured) {
    const users = getStorageItem(MOCK_USERS_KEY, []);
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user || user.password !== password) {
      throw new Error('Invalid login credentials. Use test@example.com / password.');
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata
    };
    setStorageItem(CURRENT_USER_KEY, sessionUser);
    setStorageItem(SESSION_KEY, 'mock-session-token');

    notifyAuthListeners('SIGNED_IN', { user: sessionUser });

    return { user: sessionUser };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  // Record login in user_logins
  if (data.user) {
    await recordUserLogin({
      userId:   data.user.id,
      name:     data.user.user_metadata?.name || email.split('@')[0],
      email,
      role:     data.user.user_metadata?.role || 'tenant',
      provider: 'email',
    });
  }
  return data;
}

/** Sign in with Google OAuth */
export async function signInWithGoogle() {
  if (isFirebaseConfigured) {
    const provider = new GoogleAuthProvider();
    // Always show the account chooser so the user can pick any Google account
    provider.setCustomParameters({ prompt: 'select_account' });
    // Request email and profile access
    provider.addScope('email');
    provider.addScope('profile');
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;

    // Fetch or create profile
    let role = 'tenant';
    let name = user.displayName || user.email.split('@')[0];
    try {
      const profileRef = doc(db, 'profiles', user.uid);
      const profileDoc = await getDoc(profileRef);
      if (profileDoc.exists()) {
        role = profileDoc.data().role || 'tenant';
        name = profileDoc.data().name || name;
      } else {
        await setDoc(profileRef, {
          id: user.uid,
          email: user.email,
          name,
          role
        });
      }
    } catch (err) {
      console.error('Error getting/setting profile for Google auth:', err);
    }

    const sessionUser = {
      id: user.uid,
      email: user.email,
      user_metadata: { name, role },
      app_metadata: { provider: 'google' }
    };
    setStorageItem(CURRENT_USER_KEY, sessionUser);
    setStorageItem(SESSION_KEY, 'firebase-session-token');

    notifyAuthListeners('SIGNED_IN', { user: sessionUser });

    return { user: sessionUser };
  }

  if (!isSupabaseConfigured) {
    const sessionUser = {
      id: 'mock-google-user',
      email: 'google.user@example.com',
      user_metadata: { name: 'Google User', role: 'tenant' },
      app_metadata: { provider: 'google' }
    };
    setStorageItem(CURRENT_USER_KEY, sessionUser);
    setStorageItem(SESSION_KEY, 'mock-session-token');

    notifyAuthListeners('SIGNED_IN', { user: sessionUser });

    return { user: sessionUser };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) throw error;
  // Note: For OAuth redirects, login recording happens in onAuthChange listener
  return data;
}

/** Sign in with Facebook OAuth */
export async function signInWithFacebook() {
  if (isFirebaseConfigured) {
    const provider = new FacebookAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;

    // Fetch or create profile
    let role = 'tenant';
    let name = user.displayName || user.email?.split('@')[0] || 'Facebook User';
    try {
      const profileRef = doc(db, 'profiles', user.uid);
      const profileDoc = await getDoc(profileRef);
      if (profileDoc.exists()) {
        role = profileDoc.data().role || 'tenant';
        name = profileDoc.data().name || name;
      } else {
        await setDoc(profileRef, {
          id: user.uid,
          email: user.email || '',
          name,
          role
        });
      }
    } catch (err) {
      console.error('Error getting/setting profile for Facebook auth:', err);
    }

    const sessionUser = {
      id: user.uid,
      email: user.email,
      user_metadata: { name, role },
      app_metadata: { provider: 'facebook' }
    };
    setStorageItem(CURRENT_USER_KEY, sessionUser);
    setStorageItem(SESSION_KEY, 'firebase-session-token');

    notifyAuthListeners('SIGNED_IN', { user: sessionUser });

    return { user: sessionUser };
  }

  if (!isSupabaseConfigured) {
    const sessionUser = {
      id: 'mock-facebook-user',
      email: 'facebook.user@example.com',
      user_metadata: { name: 'Facebook User', role: 'tenant' },
      app_metadata: { provider: 'facebook' }
    };
    setStorageItem(CURRENT_USER_KEY, sessionUser);
    setStorageItem(SESSION_KEY, 'mock-session-token');

    notifyAuthListeners('SIGNED_IN', { user: sessionUser });

    return { user: sessionUser };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) throw error;
  // Note: For OAuth redirects, login recording happens in onAuthChange listener
  return data;
}

/** Sign out */
export async function signOut() {
  if (isFirebaseConfigured) {
    await firebaseSignOut(auth);
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(SESSION_KEY);
    notifyAuthListeners('SIGNED_OUT', null);
    return;
  }

  if (!isSupabaseConfigured) {
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(SESSION_KEY);
    notifyAuthListeners('SIGNED_OUT', null);
    return;
  }

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Get current user */
export async function getCurrentUser() {
  if (isFirebaseConfigured) {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;
    
    // Fetch profile
    let role = 'tenant';
    let name = firebaseUser.displayName || firebaseUser.email.split('@')[0];
    try {
      const profileDoc = await getDoc(doc(db, 'profiles', firebaseUser.uid));
      if (profileDoc.exists()) {
        role = profileDoc.data().role || 'tenant';
        name = profileDoc.data().name || name;
      }
    } catch (err) {
      console.error(err);
    }

    return {
      id: firebaseUser.uid,
      email: firebaseUser.email,
      user_metadata: { name, role },
      app_metadata: { provider: firebaseUser.providerData?.[0]?.providerId || 'email' }
    };
  }

  if (!isSupabaseConfigured) {
    return getStorageItem(CURRENT_USER_KEY, null);
  }

  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/** Get current session */
export async function getSession() {
  if (isFirebaseConfigured) {
    const user = await getCurrentUser();
    return user ? { user } : null;
  }

  if (!isSupabaseConfigured) {
    const user = getStorageItem(CURRENT_USER_KEY, null);
    return user ? { user } : null;
  }

  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/** Listen to auth changes */
export function onAuthChange(callback) {
  if (isFirebaseConfigured) {
    const internalCb = (event, session) => callback(event, session);
    authListeners.add(internalCb);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        let role = 'tenant';
        let name = user.displayName || user.email.split('@')[0];
        try {
          const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
          if (profileDoc.exists()) {
            role = profileDoc.data().role || 'tenant';
            name = profileDoc.data().name || name;
          }
        } catch (err) {
          console.error(err);
        }
        const sessionUser = {
          id: user.uid,
          email: user.email,
          user_metadata: { name, role },
          app_metadata: { provider: user.providerData?.[0]?.providerId || 'email' }
        };
        setStorageItem(CURRENT_USER_KEY, sessionUser);
        setStorageItem(SESSION_KEY, 'firebase-session-token');
        callback('SIGNED_IN', { user: sessionUser });
      } else {
        localStorage.removeItem(CURRENT_USER_KEY);
        localStorage.removeItem(SESSION_KEY);
        callback('SIGNED_OUT', null);
      }
    });

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            authListeners.delete(internalCb);
            unsubscribe();
          }
        }
      }
    };
  }

  if (!isSupabaseConfigured) {
    authListeners.add(callback);

    // Async trigger to match supabase callback dispatch behavior
    setTimeout(() => {
      const user = getStorageItem(CURRENT_USER_KEY, null);
      if (user) {
        callback('SIGNED_IN', { user });
      } else {
        callback('SIGNED_OUT', null);
      }
    }, 50);

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            authListeners.delete(callback);
          }
        }
      }
    };
  }

  return supabase.auth.onAuthStateChange(async (event, session) => {
    // Record OAuth logins (Google/Facebook) when user lands back after redirect
    if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
      const u = session.user;
      const provider = u.app_metadata?.provider || 'email';
      if (provider !== 'email') {
        // OAuth providers — record the login event
        await recordUserLogin({
          userId:   u.id,
          name:     u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0],
          email:    u.email,
          role:     u.user_metadata?.role || 'tenant',
          provider,
        });
      }
    }
    callback(event, session);
  });
}

// ─── PROFILES ─────────────────────────────────────────────────────────────────

export async function getProfile(userId) {
  if (isFirebaseConfigured) {
    const docRef = doc(db, 'profiles', userId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) throw new Error('Profile not found');
    return docSnap.data();
  }

  if (!isSupabaseConfigured) {
    const users = getStorageItem(MOCK_USERS_KEY, []);
    const user = users.find(u => u.id === userId);
    if (!user) throw new Error('Profile not found');
    return {
      id: user.id,
      name: user.user_metadata?.name || 'Mock User',
      email: user.email,
      role: user.user_metadata?.role || 'tenant'
    };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

// ─── PG LISTINGS ──────────────────────────────────────────────────────────────

/** Fetch all PG listings */
export async function getPGListings() {
  if (isFirebaseConfigured) {
    const colRef = collection(db, 'pg_listings');
    const querySnapshot = await getDocs(colRef);
    if (querySnapshot.empty) {
      console.log('Seeding Firestore with default PG listings...');
      for (const pg of pgData) {
        const docData = { ...pg };
        if (docData.reviews) delete docData.reviews;
        await setDoc(doc(db, 'pg_listings', String(pg.id)), docData);
        if (pg.reviews && pg.reviews.length > 0) {
          for (const rev of pg.reviews) {
            await setDoc(doc(collection(db, 'pg_listings', String(pg.id), 'reviews'), rev.id || 'r-' + Math.random().toString(36).substr(2, 9)), rev);
          }
        }
      }
      const newSnapshot = await getDocs(colRef);
      return newSnapshot.docs.map(doc => doc.data());
    }
    return querySnapshot.docs.map(doc => doc.data());
  }

  if (!isSupabaseConfigured) {
    return getStorageItem(MOCK_LISTINGS_KEY, pgData);
  }

  const { data, error } = await supabase
    .from('pg_listings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** Fetch single PG by ID */
export async function getPGById(id) {
  if (isFirebaseConfigured) {
    const docRef = doc(db, 'pg_listings', String(id));
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) throw new Error('PG listing not found');
    const pg = docSnap.data();
    
    // Fetch reviews
    const reviewsSnap = await getDocs(collection(db, 'pg_listings', String(id), 'reviews'));
    const reviews = reviewsSnap.docs.map(d => d.data());
    return {
      ...pg,
      pg_reviews: reviews
    };
  }

  if (!isSupabaseConfigured) {
    const listings = getStorageItem(MOCK_LISTINGS_KEY, pgData);
    const pg = listings.find(item => item.id === Number(id));
    if (!pg) throw new Error('PG listing not found');

    return {
      ...pg,
      pg_reviews: pg.reviews || []
    };
  }

  const { data, error } = await supabase
    .from('pg_listings')
    .select('*, pg_reviews(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

/** Create a new PG listing */
export async function createPGListing(pgListingData) {
  if (isFirebaseConfigured) {
    const listings = await getPGListings();
    const newId = listings.length > 0 ? Math.max(...listings.map(l => Number(l.id) || 0)) + 1 : 1;
    const pg = {
      ...pgListingData,
      id: newId,
      rating: 5.0,
      distance: pgListingData.distance || '1.0 km',
      totalFloors: pgListingData.total_floors || 3,
      floorAvailability: pgListingData.floor_availability || { "1": 1, "2": 1, "3": 1 },
      amenities: pgListingData.amenities || [],
      created_at: new Date().toISOString()
    };
    await setDoc(doc(db, 'pg_listings', String(newId)), pg);
    return pg;
  }

  if (!isSupabaseConfigured) {
    const listings = getStorageItem(MOCK_LISTINGS_KEY, pgData);
    const newId = listings.length > 0 ? Math.max(...listings.map(l => l.id)) + 1 : 1;
    const pg = {
      ...pgListingData,
      id: newId,
      rating: 5.0,
      distance: pgListingData.distance || '1.0 km',
      reviews: [],
      totalFloors: pgListingData.total_floors || 3,
      floorAvailability: pgListingData.floor_availability || { "1": 1, "2": 1, "3": 1 },
      amenities: pgListingData.amenities || []
    };
    listings.unshift(pg);
    setStorageItem(MOCK_LISTINGS_KEY, listings);
    return pg;
  }

  const { data, error } = await supabase
    .from('pg_listings')
    .insert([pgListingData])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── BOOKINGS ─────────────────────────────────────────────────────────────────

/** Create a new booking */
export async function createBooking(bookingData) {
  if (isFirebaseConfigured) {
    const bookingRef = doc(collection(db, 'bookings'));
    const newBooking = {
      ...bookingData,
      id: bookingRef.id,
      created_at: new Date().toISOString()
    };
    await setDoc(bookingRef, newBooking);
    return newBooking;
  }

  if (!isSupabaseConfigured) {
    const bookings = getStorageItem(MOCK_BOOKINGS_KEY, []);
    const newBooking = {
      ...bookingData,
      id: 'mock-booking-' + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString()
    };
    bookings.push(newBooking);
    setStorageItem(MOCK_BOOKINGS_KEY, bookings);
    return newBooking;
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert([bookingData])
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Get bookings for current user */
export async function getUserBookings(userId) {
  if (isFirebaseConfigured) {
    const q = query(collection(db, 'bookings'), where('user_id', '==', userId));
    const querySnapshot = await getDocs(q);
    const bookings = querySnapshot.docs.map(doc => doc.data());
    
    const resolvedBookings = [];
    for (const b of bookings) {
      let pg_listings = null;
      try {
        const pgRef = doc(db, 'pg_listings', String(b.pg_id));
        const pgSnap = await getDoc(pgRef);
        if (pgSnap.exists()) {
          pg_listings = pgSnap.data();
        }
      } catch (e) {
        console.error('Error fetching booking listing:', e);
      }
      resolvedBookings.push({
        ...b,
        pg_listings
      });
    }
    return resolvedBookings;
  }

  if (!isSupabaseConfigured) {
    const bookings = getStorageItem(MOCK_BOOKINGS_KEY, []);
    const listings = getStorageItem(MOCK_LISTINGS_KEY, pgData);

    const userBookings = bookings.filter(b => b.user_id === userId);
    return userBookings.map(b => ({
      ...b,
      pg_listings: listings.find(l => l.id === b.pg_id) || null
    }));
  }

  const { data, error } = await supabase
    .from('bookings')
    .select('*, pg_listings(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// ─── REVIEWS ──────────────────────────────────────────────────────────────────

/** Add a review */
export async function addReview({ pgId, userId, rating, text, author }) {
  if (isFirebaseConfigured) {
    const reviewsCol = collection(db, 'pg_listings', String(pgId), 'reviews');
    const reviewRef = doc(reviewsCol);
    const newReview = {
      id: reviewRef.id,
      author,
      rating: Number(rating),
      text,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) || 'Just now',
      avatar: author ? author.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U',
      created_at: new Date().toISOString()
    };
    await setDoc(reviewRef, newReview);

    // Recalculate average rating
    const allReviewsSnap = await getDocs(reviewsCol);
    const allReviews = allReviewsSnap.docs.map(d => d.data());
    const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
    const newRating = Number((totalRating / allReviews.length).toFixed(1));

    const pgRef = doc(db, 'pg_listings', String(pgId));
    await updateDoc(pgRef, { rating: newRating });

    return newReview;
  }

  if (!isSupabaseConfigured) {
    const listings = getStorageItem(MOCK_LISTINGS_KEY, pgData);
    const pgIndex = listings.findIndex(l => l.id === Number(pgId));
    if (pgIndex === -1) throw new Error('PG listing not found');

    const pg = listings[pgIndex];
    if (!pg.reviews) pg.reviews = [];

    const newReview = {
      id: 'mock-review-' + Math.random().toString(36).substr(2, 9),
      author,
      rating: Number(rating),
      text,
      date: 'Just now',
      avatar: author ? author.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'
    };

    pg.reviews.unshift(newReview);

    const totalRating = pg.reviews.reduce((sum, r) => sum + r.rating, 0);
    pg.rating = Number((totalRating / pg.reviews.length).toFixed(1));

    listings[pgIndex] = pg;
    setStorageItem(MOCK_LISTINGS_KEY, listings);

    return newReview;
  }

  const { data, error } = await supabase
    .from('pg_reviews')
    .insert([{ pg_id: pgId, user_id: userId, rating, text, author }])
    .select()
    .single();
  if (error) throw error;
  return data;
}
