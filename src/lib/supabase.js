import { createClient } from '@supabase/supabase-js';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
let supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Clean up environment variables by stripping quotes and whitespace
if (supabaseUrl) {
  supabaseUrl = supabaseUrl.trim().replace(/^['"]|['"]$/g, '');
}
if (supabaseAnonKey) {
  supabaseAnonKey = supabaseAnonKey.trim().replace(/^['"]|['"]$/g, '');
}

const isValidUrl = (url) => {
  return typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));
};

export const isSupabaseConfigured = 
  isValidUrl(supabaseUrl) && 
  supabaseUrl !== 'https://your-project-id.supabase.co' && 
  supabaseAnonKey && 
  supabaseAnonKey !== 'your-anon-public-key-here';

if (!isSupabaseConfigured) {
  console.warn('⚠️ Supabase URL not configured correctly. Falling back to local storage mock database/auth.');
}

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://your-project-id.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'your-anon-public-key-here'
);

