# Claude Findings Handoff 2026-07-09

Use this file as a focused starting point for the next Claude Code pass. Do not restart the project. The app is an existing Expo React Native monorepo and needs targeted cleanup, bug fixes, and Android USB device verification.

## Current Diagnostics Already Run

From `C:\Homepouch`:

- `java -version` reports Temurin OpenJDK 17.0.19.
- `JAVA_HOME` is `C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot`.
- `where.exe java` still shows Java 26 later in PATH, but JDK 17 is first in this PowerShell session.
- `apps/mobile/android/gradlew.bat --version` reports Gradle 8.10.2 with JVM 17.0.19.
- `pnpm typecheck` passed for shared, api, and mobile.
- `pnpm test` failed in `packages/shared` because `packages/shared/__tests__/calculations.test.ts` imports `../dist/calculations`, but `dist` is generated/ignored and not present.

## Gradle And USB Status

The known bad state, Gradle 7.5.1 with Java 26.0.1, is not active in this shell. The project wrapper is currently Gradle 8.10.2, not the 8.7 mentioned in older docs, and it works with JDK 17 for `gradlew --version`.

Still verify Android Studio uses:

- Project Gradle wrapper from `apps/mobile/android`.
- JDK 17, not Java 26.

USB device testing was not completed in this pass because the user interrupted before `adb devices`, `adb reverse`, and `pnpm android:device` were run.

## Highest Priority Fixes Found

1. Fix shared test script or test imports.

   `pnpm test` fails because shared tests require compiled output from `../dist/calculations`. Either:

   - Change shared test setup to compile before Jest, or
   - Point tests to source with a proper Jest TypeScript transform/setup.

   The simplest short-term fix may be changing `packages/shared/package.json` test script to build first, but cleanup docs also say `packages/shared/dist/` is generated and should not be kept as source.

2. Normalize transaction amount sign handling.

   `packages/shared/src/schemas/index.ts` defines `transactionSchema.amountMinor` as nonnegative. Shared tests also use positive expense amounts.

   But these screens save expenses as negative:

   - `apps/mobile/app/(tabs)/add.tsx`
   - `apps/mobile/app/edit/[id].tsx`
   - `apps/mobile/app/transactions/new.tsx`

   Current shared calculations assume positive expense values. Decide one convention and apply it everywhere. Recommended convention: store `amountMinor` as positive integer and use `type` to determine income vs expense. Then update Ledger/Home/Insights/AI display formatting to add signs at render time.

3. Fix month boundary logic.

   `packages/shared/src/calculations/index.ts` has `isInMonth()` that only checks the same calendar month and `day >= monthStartDay`. It does not correctly include dates in the next calendar month when `monthStartDay > 1`.

   Example: for a monthly period starting July 15, the July period should normally include July 15 through August 14. Current logic misses August 1 through August 14.

4. Fix Home screen behavior.

   `apps/mobile/app/(tabs)/index.tsx` currently gates the entire Home screen behind AI state:

   - If `aiEnabled` is false, Home shows the AI disabled screen.
   - If fewer than 3 transactions exist, Home shows the AI need-more-data screen.

   This is likely copied from the AI page and should be removed. Home should always show the dashboard and core account book overview.

5. Fix missing localization keys and hardcoded strings.

   Typecheck passes, but several `t(...)` keys used in screens appear missing from locale JSON files. Missing keys can render raw code-style labels in the app.

   Examples to verify/add in every locale:

   - `common.saving`
   - `common.retry`
   - `common.open`
   - `common.done`
   - `dashboard.notePlaceholder`
   - `dashboard.reminder`
   - `dashboard.setReminder`
   - `insights.topCategory`
   - `insights.topCategoryPercent`
   - `insights.tips`
   - `insights.chart.categoryBreakdown`
   - `insights.chart.spendingTrend`
   - `transactions.notFound`
   - `transactions.detailTitle`
   - `transactions.amountPlaceholder`
   - `transactions.notePlaceholder`
   - `transactions.merchantPlaceholder`
   - `transactions.datePlaceholder`
   - `transactions.confirm`
   - `settings.nearbyPermissionRequired`
   - `currency.autoDetected`
   - `currency.manual`

   Important: Japanese and Korean locale files are valid UTF-8. PowerShell displayed mojibake, but a Node code-point check showed strings like `保存`, `日本語`, and `한국어` are stored correctly. Do not rewrite the locale files solely because PowerShell renders them badly.

6. Fix app config missing assets.

   `apps/mobile/app.config.ts` references files that are not present under `apps/mobile/assets/`:

   - `./assets/splash.png`
   - `./assets/notification-icon.png`
   - `./assets/notification.wav`

   Existing assets currently found:

   - `apps/mobile/assets/icon.png`
   - `apps/mobile/assets/adaptive-icon.png`

   Either add real assets or remove/update those config references so Expo config/build does not fail.

7. Fix Nearby permission flow.

   Files:

   - `apps/mobile/app/(tabs)/nearby.tsx`
   - `apps/mobile/src/services/permissionService.ts`
   - `apps/mobile/app/(tabs)/settings.tsx`

   Problems to address:

   - `nearby.tsx` imports unused `PermissionsAndroid` and `Platform`.
   - `fetchLocation()` calls `Location.requestForegroundPermissionsAsync()` again instead of using the shared permission service state.
   - Some error messages are hardcoded English strings.
   - `fetchMockPlaces()` reads `location` state immediately after `setLocation`, so it may use stale `null` state and show no places.
   - Settings toggle is disabled when permission is not granted, which is good, but its helper text layout should be checked because it is placed inside the row with the switch.
   - Use Expo Location permission APIs consistently for Android and iOS where possible.

8. Fix currency defaults and manual override semantics.

   Files:

   - `apps/mobile/src/store/settingsStore.ts`
   - `apps/mobile/src/utils/currencyResolver.ts`
   - `apps/mobile/src/utils/currencyFormatter.ts`

   Current store has `currencyInitialized`, but it does not clearly track manual override separately. Requirements say manual currency selection must persist and win over automatic detection.

   Also update currency formatting to use `Intl.NumberFormat` where available or at least correct symbols. Current code is valid UTF-8, but the terminal renders symbols badly. Verify in app on device.

9. Fix language default and manual override semantics.

   Files:

   - `apps/mobile/src/i18n/index.ts`
   - `apps/mobile/src/store/settingsStore.ts`
   - `packages/shared/src/localization/index.ts`

   Current i18n only loads `en`, `ja`, `ko`, and `ms`, while shared `LOCALES` includes `zh-Hans` and `zh-Hant`. Either add the missing Chinese locale JSON files or reduce `LOCALES` until supported.

   Store should distinguish automatic phone language from manual override. Current `language` is initialized from i18n and persisted, which can accidentally turn the first auto-detected language into a permanent manual value.

10. Fix Insights calculations and chart labels.

   `apps/mobile/app/(tabs)/insights.tsx` has chart-like bars and comparison statements, but verify after amount sign normalization. It currently casts transactions as `any` and has a local currency formatter duplicate. Move reusable comparison/calculation logic into shared/mobile helpers and use `apps/mobile/src/utils/currencyFormatter.ts`.

## Items That Already Look Partly Fixed

- Ledger empty state appears to show only one Add Transaction button when `transactions.length === 0`.
- AI page Add button already calls `router.push('/add')`, which should route to the tabs Add screen in Expo Router.
- `pnpm typecheck` currently passes.
- Gradle wrapper/JDK status is healthy in the current shell.

Still verify these manually on device after fixes.

## Cleanup Candidates

Safe generated folders/files to remove after confirming no active process is using them:

- `apps/mobile/.expo/`
- `apps/mobile/android/.gradle/`
- `apps/mobile/android/build/`
- `apps/mobile/android/app/build/`
- `apps/mobile/android/app/.cxx/`
- `packages/shared/dist/`

Ambiguous files requiring owner confirmation before deletion:

- `.idea/`
- `Household-account-bank (android & IOS).iml`
- Root `app.json` if `apps/mobile/app.config.ts` is the real Expo config.

Do not delete:

- `apps/mobile/android/`
- Gradle wrapper files
- `apps/mobile/app/`
- `apps/mobile/src/`
- `apps/api/src/`
- `packages/shared/src/`
- `docs/`
- workspace package/config files

## Recommended Verification Order For Claude

Run/fix in this order:

```powershell
pnpm typecheck
pnpm test
pnpm lint
pnpm adb:devices
pnpm adb:reverse
pnpm android:device
```

If `pnpm lint` fails because ESLint is not configured, either add the expected repo lint config or report it clearly. Do not mark lint as passed unless it actually runs successfully.

For Poco F6 USB debugging, if `adb devices` shows `unauthorized`, the owner must unlock the phone and accept the RSA debugging prompt. If no device appears, check cable, USB mode, Android platform tools, and Xiaomi/Poco Developer Options such as `Install via USB`.

