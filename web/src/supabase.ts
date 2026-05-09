import { createClient } from '@supabase/supabase-js';

const fallbackSupabaseUrl = 'https://pphbwecwwotrfqjyrsai.supabase.co';
const fallbackSupabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaGJ3ZWN3d290cmZxanlyc2FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyMTkxNzIsImV4cCI6MjA4Mjc5NTE3Mn0.WzIqb_CoAny83-QgyAxK4SWm_-xqUrh_9dITbkA_MYQ';

export const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || fallbackSupabaseUrl;
export const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || fallbackSupabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});
