import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pphbwecwwotrfqjyrsai.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaGJ3ZWN3d290cmZxanlyc2FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyMTkxNzIsImV4cCI6MjA4Mjc5NTE3Mn0.WzIqb_CoAny83-QgyAxK4SWm_-xqUrh_9dITbkA_MYQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
