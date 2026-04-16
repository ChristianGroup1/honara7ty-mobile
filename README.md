This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Supabase Configuration (Required)

Before the **Reset Password** flow works end-to-end, you must configure the following in the
[Supabase Dashboard](https://supabase.com/dashboard) for your project:

## 1 — Add the app deep-link to Redirect URLs

`Authentication` → `URL Configuration` → **Redirect URLs** → click **Add URL**

```
honara7ty://reset-password
```

Without this entry, Supabase ignores the `redirectTo` value sent by the app and falls back to
the **Site URL** (which is `http://localhost:3000` by default), causing the email link to open
a browser page instead of the app.

## 2 — Apply the Reset Password email template

`Authentication` → `Email Templates` → **Reset Password**

1. Open `supabase/email-templates/reset-password.html` in this repository.
2. Copy the **entire file contents**.
3. In the Supabase Dashboard, clear the existing template body and paste the copied HTML.
4. Set the **Subject** field to:
   ```
   إعادة تعيين كلمة المرور – هنار حتي
   ```
5. Click **Save**.

The template uses the `{{ .ConfirmationURL }}` variable which Supabase replaces automatically
with the one-time reset link.

## 3 — Update the Site URL (optional but recommended)

`Authentication` → `URL Configuration` → **Site URL**

Change `http://localhost:3000` to a real URL for your project (e.g. your production domain, or
leave as-is for local development). This URL is only used as a fallback when no matching Redirect
URL is found.

---

# Analytics Configuration

The app now includes a single analytics integration point in
`lib/analyticsConfig.ts`.

To enable analytics for the full app:

1. Open `lib/analyticsConfig.ts`
2. Set `enabled` to `true`
3. Paste your PostHog project API key into `apiKey`
4. Keep `host` as `https://us.i.posthog.com` unless your project uses a different PostHog region

Once enabled, the app will automatically:

- identify signed-in users
- reset analytics identity on logout
- track screen changes from the root navigator

Feature-level events can be added later with `trackEvent(...)` from `lib/analytics.ts`.

---

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
