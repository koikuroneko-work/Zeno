# Testing and Release Checklist

Last updated: 2026-07-06

This file explains how Claude Code should prove the app works before the owner tests it in Visual Studio Code with an Android phone. The current primary target is the owner's Poco F6 through USB debugging. Emulator testing remains useful, but physical-device testing is the priority for the current pass.

## Local Android Testing Goal

The final development flow should let the owner open VS Code, run the project, and see the app installed on the connected Poco F6 through a development build/native Android run.

Expected command options:

```powershell
pnpm adb:devices
pnpm adb:reverse
pnpm android:device
```

or directly:

```powershell
adb devices
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3000 tcp:3000
pnpm --filter mobile android:device
```

Do not use Expo Go QR scanning for the current physical-device flow.

## Gradle And JDK Compatibility Gate

Before Android testing, confirm Gradle is using a supported Java runtime.

The known bad state is:

```text
Gradle 7.5.1 with Java 26.0.1
```

That combination cannot configure the build. The preferred fix is to use JDK 17 and the project Gradle wrapper. The wrapper file is `apps/mobile/android/gradle/wrapper/gradle-wrapper.properties`, expected to point at Gradle 8.7.

Useful checks:

```powershell
java -version
where.exe java
$env:JAVA_HOME
Get-Content apps/mobile/android/gradle/wrapper/gradle-wrapper.properties
Set-Location apps/mobile/android
.\gradlew.bat --version
```

Passing gate:

- Gradle uses the project wrapper, not a stale global Gradle 7.5.1 install.
- Gradle JVM is JDK 17, or another confirmed supported JDK, not Java 26.
- Android Studio Gradle JDK is also set to JDK 17 if Android Studio is used.

## Android Emulator Setup Notes

Physical-device testing on the Poco F6 is the priority for this pass. Emulator testing is still useful as a secondary check. Use Android Studio Device Manager to create an emulator when emulator coverage is needed. A recent Pixel device profile is a good default.

As of 2026-07-02, Expo's Android emulator guide says Android Studio should install Android SDK tooling and, for current React Native compilation, Android 16 / API 36 SDK is required. Google Play's current target API policy page says new apps and updates must target Android 15 / API 35 or higher from 2025-08-31.

Before marking the app ready for Android physical-device testing:

- `ANDROID_HOME` is configured on Windows.
- `adb` is available in PowerShell.
- The Poco F6 appears in `adb devices` with status `device`.
- `adb reverse tcp:8081 tcp:8081` succeeds.
- The app installs and launches on the Poco F6 through `pnpm android:device`.
- The app can save local SQLite data and reload after app restart.

Useful checks:

```powershell
adb devices
adb reverse tcp:8081 tcp:8081
pnpm typecheck
pnpm lint
pnpm test
pnpm android:device
```

## Required Automated Tests

### Shared Calculation Tests

Test these in `packages/shared`:

- Remaining monthly amount.
- Category budget percentage.
- Budget warning status.
- Income, expense, transfer, and adjustment handling.
- Deleted transactions are ignored.
- Month start day other than day 1.
- Integer minor-unit money math.

### Mobile Tests

Test these in `apps/mobile`:

- Onboarding saves settings.
- Transaction form validates required fields.
- Ledger renders saved transactions.
- Dashboard uses shared calculation output.
- Language selector changes visible text.
- Phone language is used by default when no manual override exists.
- Currency defaults from device region/current location signal when no manual override exists.
- Location permission denied state is friendly and recoverable.
- Nearby Settings toggle is disabled while location permission is not granted.
- Nearby Settings toggle becomes enabled after foreground location permission is granted.
- AI disabled state hides AI calls.
- AI page Add button navigates to Add page.
- Ledger empty state renders exactly one Add Transaction button.
- Insights comparison cards handle empty, positive, negative, and equal comparison data.
- Insights chart/pie chart renders without text overlap.

### API Tests

Test these in `apps/api`:

- Health endpoint.
- AI endpoint rejects invalid payloads.
- Nearby endpoint rejects invalid payloads.
- AI endpoint returns schema-valid mocked response in development.
- Nearby endpoint returns schema-valid mocked response in development.

## Manual Smoke Test Script

Run this before telling the owner the app is ready:

1. Connect the Poco F6 with USB debugging enabled and confirm `adb devices` shows status `device`.
2. Start API in development mode.
3. Run `adb reverse tcp:8081 tcp:8081` and reverse the API port if needed.
4. Install and start the mobile app with `pnpm android:device`.
5. Complete onboarding with English.
6. Add income for the month.
7. Add breakfast expense.
8. Add dinner expense.
9. Add shopping expense.
10. Confirm Home remaining amount changes correctly.
11. Open Ledger and edit one expense.
12. Confirm Home recalculates.
13. Open Settings and change language.
14. Confirm tabs and main screens change language.
15. Reset language override or install fresh, then confirm the phone language is used by default.
16. Confirm default currency matches device region/current location signal, for example Malaysia shows MYR.
17. Open Ledger with no records and confirm exactly one Add Transaction button appears.
18. Tap that button and confirm it opens the Add page.
19. Open AI page with fewer than 3 transactions.
20. Tap the AI page Add button and confirm it opens the Add page.
21. Add enough transactions to create current month, previous month, this week, last week, today, and yesterday data.
22. Open Insights and confirm chart/pie chart renders.
23. Confirm Insights shows statements comparing this month with last month, this week with last week, and today with yesterday.
24. Open Settings before location permission is granted and confirm Nearby toggle is greyed out and cannot be pressed.
25. Open Nearby, deny location, and confirm friendly denied state.
26. Return to Settings and confirm Nearby toggle is still disabled.
27. Open Nearby, allow location, use mock nearby provider, and confirm suggestions render.
28. Return to Settings and confirm Nearby toggle is now enabled.
29. Enable AI with mock API and confirm suggestions render.
30. Close and reopen app.
31. Confirm data, manual language, and manual currency settings still exist.

## iOS Parity Checklist

The owner cannot test iOS locally, so Claude Code must protect iOS compatibility through process:

- Avoid Android-only packages unless there is an iOS equivalent.
- Keep calculations in shared TypeScript.
- Keep UI in React Native components.
- Use Expo-compatible libraries.
- Use iOS permission copy in `app.config.ts`.
- Run typecheck and tests for all packages.
- Create an EAS iOS preview/TestFlight build when Apple credentials are available.
- If a platform-specific file is required, write both Android and iOS versions or a shared fallback.

## Store Readiness Checklist

### Google Play

Before production submission:

- Google Play Console account exists.
- Android package name is final.
- App signing is configured.
- Target API level satisfies current Google Play policy.
- Data Safety form is prepared.
- Privacy policy URL is ready.
- Store listing text and screenshots are ready.
- Internal testing is completed.
- Location and AI usage are disclosed.

Current official policy reference checked on 2026-07-02:

- Google Play target API policy: https://support.google.com/googleplay/android-developer/answer/11926878

### Apple App Store

Before production submission:

- Apple Developer account exists.
- Bundle identifier is final.
- App Store Connect app record exists.
- App privacy answers are prepared.
- Age rating answers are prepared.
- Privacy policy URL is ready.
- TestFlight build is tested if possible.
- Location and AI usage are disclosed.
- If distributing in the EU, trader status requirements are reviewed.
- Build uses the currently required Xcode/iOS SDK through EAS or macOS.

Current official requirement reference checked on 2026-07-02:

- Apple upcoming requirements: https://developer.apple.com/news/upcoming-requirements/

Apple's requirements page currently states that since 2026-04-28, apps uploaded to App Store Connect must be built with Xcode 26 or later using an SDK for iOS 26, iPadOS 26, tvOS 26, visionOS 26, or watchOS 26.

## EAS Build and Submit Notes

Expo's official docs describe EAS Build as a hosted service for building Expo and React Native app binaries. EAS Submit can upload Android and iOS binaries to Google Play and Apple App Store from the command line. This is useful because iOS upload workflows can otherwise require macOS tooling.

References checked on 2026-07-02:

- EAS Build: https://docs.expo.dev/build/introduction/
- EAS Submit: https://docs.expo.dev/submit/introduction/
- Expo Android emulator setup: https://docs.expo.dev/workflow/android-studio-emulator/

## Release Gates

Do not submit to stores until all gates pass:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- Android Poco F6 physical-device smoke test
- Android emulator smoke test when available
- Privacy policy drafted
- Data Safety/App Privacy answers drafted
- AI provider and nearby provider terms reviewed
- No secrets in mobile app bundle
- Production API environment configured
- Crash/error monitoring decision confirmed by owner
