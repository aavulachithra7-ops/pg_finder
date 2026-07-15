import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = 
  supabaseUrl && 
  supabaseUrl !== 'https://your-project-id.supabase.co' && 
  supabaseAnonKey && 
  supabaseAnonKey !== 'your-anon-public-key-here';

if (!isSupabaseConfigured) {
  console.warn('⚠️ Supabase URL not configured. Falling back to local storage mock database/auth.');
}

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://your-project-id.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'your-anon-public-key-here'
);

