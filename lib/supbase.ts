import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';


// EXPO_PUBLIC_SUPABASE_URL=https://pphbwecwwotrfqjyrsai.supabase.co
// EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_FxT1TCTwcaDoc5twrn37Mw_nr3HpUeg

const supabaseUrl = "https://pphbwecwwotrfqjyrsai.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaGJ3ZWN3d290cmZxanlyc2FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyMTkxNzIsImV4cCI6MjA4Mjc5NTE3Mn0.WzIqb_CoAny83-QgyAxK4SWm_-xqUrh_9dITbkA_MYQ";
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

AppState.addEventListener('change', state => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

export default supabase;
