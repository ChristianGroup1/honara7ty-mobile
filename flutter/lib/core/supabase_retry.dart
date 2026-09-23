import 'supabase_service.dart';

/// Repeats one request after refreshing a session that expired between the
/// client's automatic refresh cycle and a protected Supabase call.
Future<T> withExpiredJwtRetry<T>(Future<T> Function() request) async {
  try {
    return await request();
  } catch (error, stackTrace) {
    final message = error.toString().toLowerCase();
    final expired = message.contains('jwt expired') ||
        message.contains('invalid jwt') ||
        message.contains('token has expired');
    if (!expired || supabase.auth.currentSession == null) {
      Error.throwWithStackTrace(error, stackTrace);
    }
    await supabase.auth.refreshSession();
    return request();
  }
}
