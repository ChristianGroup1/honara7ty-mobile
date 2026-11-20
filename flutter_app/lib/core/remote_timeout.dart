import 'dart:async';

/// Fail-open timeout for any server call so offline never freezes the UI.
const Duration kRemoteTimeout = Duration(seconds: 5);

Future<T> withRemoteTimeout<T>(
  Future<T> future, {
  Duration timeout = kRemoteTimeout,
}) =>
    future.timeout(timeout);

Future<T?> tryRemote<T>(
  Future<T> Function() request, {
  Duration timeout = kRemoteTimeout,
}) async {
  try {
    return await request().timeout(timeout);
  } catch (_) {
    return null;
  }
}
