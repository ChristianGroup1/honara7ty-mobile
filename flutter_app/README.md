# Honara7ty Flutter app

This is the Flutter implementation of the existing Arabic-first Honara7ty app. It lives separately from the React Native app at the repository root.

## Run

Requirements: Flutter stable (the project was checked with Flutter 3.47.6 / Dart 3.13.5).

```sh
cd flutter_app
flutter pub get
flutter run
```

Open the project directory itself in Android Studio or VS Code. The app uses the existing Supabase project configuration and Firebase Android configuration copied with the Flutter implementation. iOS Firebase setup and provider credentials must be configured for the developer's bundle/account before those platform-specific services can run.

## Scope and behavior

- `lib/routing/app_router.dart` contains the route table and auth/onboarding redirects.
- `lib/screens/` contains the screen implementations; `lib/features/` contains shared data and behavior.
- Arabic/RTL and light/dark themes are configured in `lib/main.dart` and `lib/core/theme.dart`.
- Design tokens and implementation notes are in the repository-root `design_system.md`.
- `SCREEN_COVERAGE.md` lists the 64 screenshot references and their screen/state coverage. A listed state means its containing Flutter flow is implemented; it does not claim pixel-perfect screenshot parity.

## Local setup notes

Keep secrets and environment-specific credentials out of source control. Supabase/Firebase client values are public client configuration, but server secrets must never be embedded in the app. Before release, verify package identifiers, iOS URL schemes, push-notification entitlements, signing, and live backend/provider configuration for the target environment.
