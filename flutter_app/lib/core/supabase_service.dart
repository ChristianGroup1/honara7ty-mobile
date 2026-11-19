// ─── Supabase Client ─────────────────────────────────────────────────────────
// Mirrors lib/supbase.ts from the React Native source.
// URL and anon key are the same values used in the RN app.

import 'package:supabase_flutter/supabase_flutter.dart';

const String _supabaseUrl = 'https://pphbwecwwotrfqjyrsai.supabase.co';
const String _supabaseAnonKey =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaGJ3ZWN3d290cmZxanlyc2FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyMTkxNzIsImV4cCI6MjA4Mjc5NTE3Mn0'
    '.WzIqb_CoAny83-QgyAxK4SWm_-xqUrh_9dITbkA_MYQ';

/// Initialise Supabase.  Call once from [main] before [runApp].
Future<void> initSupabase() async {
  await Supabase.initialize(
    url: _supabaseUrl,
    anonKey: _supabaseAnonKey,
    authOptions: const FlutterAuthClientOptions(
      authFlowType: AuthFlowType.pkce,
      autoRefreshToken: true,
    ),
    realtimeClientOptions: const RealtimeClientOptions(
      logLevel: RealtimeLogLevel.info,
    ),
  );
}

/// Convenience getter so callers never have to import supabase_flutter directly.
SupabaseClient get supabase => Supabase.instance.client;
