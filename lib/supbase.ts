import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
 import AsyncStorage from '@react-native-async-storage/async-storage';


// EXPO_PUBLIC_SUPABASE_URL=https://pphbwecwwotrfqjyrsai.supabase.co
// EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_FxT1TCTwcaDoc5twrn37Mw_nr3HpUeg

const supabaseUrl = "https://pphbwecwwotrfqjyrsai.supabase.co";
const supabaseAnonKey = "sb_publishable_FxT1TCTwcaDoc5twrn37Mw_nr3HpUeg";
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,    // ← ده ا��لي بيحفظ السيشن
    detectSessionInUrl: false,
  },
}); 
export default supabase;