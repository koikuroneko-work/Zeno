# Claude Prompt: Urgent Gradle, Poco F6, Troubleshooting, And Translation Fixes

Use this prompt for the next Claude Code run. The owner wants clear, practical work, not unrelated output. Claude may choose its own implementation method, but it must satisfy the priority order and acceptance criteria below.

## Owner Request Summary

Current priorities, highest first:

1. High priority: fix the Android build blocker:
   - Error: `Could not use Gradle version 7.5.1 and Java version 26.0.1 to configure the build. Please consider either to change your Java Runtime or your Gradle settings.`
2. High priority: set up and verify USB debugging testing with the owner's Poco F6 Android phone.
3. Medium priority: troubleshoot the whole application, scan for current and likely problems, and fix verified issues.
4. Low priority: improve translations, especially pages like AI Suggest where visible text may show code-style keys such as `ai.suggest...`.

Do the high-priority build and phone-testing work before broad app fixes or translation polish.

## Required Project Context

Do not restart the project. Work in the existing Expo React Native monorepo.

Read these files before changing code:

1. `CLAUDE.md`
2. `docs/05_ENHANCEMENT_BRIEF_2026-07-06.md`
3. `docs/06_CLAUDE_CLEANUP_USB_DEBUGGING_PROMPT.md`
4. `docs/04_TESTING_AND_RELEASE.md`
5. `docs/01_PRODUCT_REQUIREMENTS.md`
6. `docs/02_PROJECT_STRUCTURE.md`
7. `docs/03_IMPLEMENTATION_PLAN.md`

Inspect before editing:

- `package.json`
- `apps/mobile/package.json`
- `apps/mobile/android/gradle/wrapper/gradle-wrapper.properties`
- `apps/mobile/android/build.gradle`
- `apps/mobile/android/gradle.properties`
- `apps/mobile/android/settings.gradle`
- `apps/mobile/android/local.properties`

## Operating Rules For Claude

- Keep output concise and useful.
- Do not give repeated generic explanations if a command result already shows the next action.
- Prefer focused fixes over broad rewrites.
- Do not delete ambiguous files without listing them for owner confirmation.
- Do not commit local machine paths, secrets, API keys, or store credentials.
- Do not tell the owner to use Expo Go. The current target is a development build installed through USB debugging.
- Use TypeScript for app/backend/shared code changes.
- All visible app text must come from localization files.
- If owner action is required on the phone or Windows settings, state exactly what the owner must do.

## High Priority A: Fix Gradle And Java Compatibility

Known error:

```text
Could not use Gradle version 7.5.1 and Java version 26.0.1 to configure the build.
```

Important facts:

- Gradle 7.5.1 cannot be used with Java 26.
- Java 26 is too new for this React Native/Expo Android development flow.
- This repository's expected wrapper should be `apps/mobile/android/gradle/wrapper/gradle-wrapper.properties` with `gradle-8.7-all.zip`.
- If a command reports Gradle 7.5.1, it is probably using the wrong Gradle installation, stale Android Studio settings, an old generated Android folder, or a different working directory.
- The first preferred fix is to use a supported JDK, normally JDK 17 for this Expo SDK 52 / React Native 0.76 Android stack. JDK 21 may work in some setups, but JDK 17 is the safest first target.
- Do not downgrade the project to Gradle 7.5.1.

Run diagnostics first:

```powershell
java -version
where.exe java
$env:JAVA_HOME
pnpm --version
node --version
Get-Content apps/mobile/android/gradle/wrapper/gradle-wrapper.properties
Set-Location apps/mobile/android
.\gradlew.bat --version
```

Optional, only to detect a conflicting global Gradle:

```powershell
gradle --version
```

Fix method suggestions:

1. If `java -version` or `.\gradlew.bat --version` shows Java 26:
   - Install or select JDK 17.
   - Set Windows `JAVA_HOME` to the JDK 17 folder.
   - Put `%JAVA_HOME%\bin` before Java 26 in `PATH`.
   - Reopen PowerShell/VS Code after changing environment variables.
   - In Android Studio, set `Settings > Build, Execution, Deployment > Build Tools > Gradle > Gradle JDK` to JDK 17.
2. If `.\gradlew.bat --version` shows Gradle 8.7 but Android Studio shows Gradle 7.5.1:
   - Configure Android Studio to use the Gradle wrapper from the project.
   - Open the Android project at `apps/mobile/android`, not a stale copied folder.
3. If the wrapper file itself points to Gradle 7.5.1:
   - Update the wrapper back to the supported wrapper version for this project, expected `gradle-8.7-all.zip`.
   - Then rerun `.\gradlew.bat --version`.
4. If `local.properties` has a wrong SDK path:
   - Fix the local SDK path on the owner's machine.
   - Do not commit owner-specific `local.properties` changes unless the repo intentionally tracks them.
5. If Gradle fails after the Java/Gradle version is fixed:
   - Treat the new error as the real next issue.
   - Fix app, dependency, SDK, NDK, or Android config errors based on the new stack trace.

Acceptance criteria:

- `.\gradlew.bat --version` from `apps/mobile/android` reports the project wrapper, preferably Gradle 8.7.
- The JVM shown by Gradle is JDK 17, or another confirmed supported JDK, not Java 26.
- `pnpm --filter mobile android:device` gets past Gradle configuration. If it fails later, report and fix the later concrete error.

## High Priority B: USB Debugging With Poco F6

Target device: owner's Poco F6 Android phone.

Use a development build/native Android install over USB. Do not use Expo Go QR scanning.

Owner-side phone setup checklist:

1. On the Poco F6, open Settings.
2. Enable Developer Options by tapping the HyperOS/MIUI version several times if Developer Options is not already enabled.
3. Enable `USB debugging`.
4. If install fails on Xiaomi/Poco, also enable `Install via USB` and, if present, `USB debugging (Security settings)`.
5. Connect the phone with a data-capable USB cable.
6. Set USB mode to File Transfer/MTP if the phone asks.
7. Unlock the phone and accept the RSA fingerprint prompt.

PC/project commands:

```powershell
pnpm adb:devices
pnpm adb:reverse
pnpm android:device
```

Equivalent direct commands:

```powershell
adb devices
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3000 tcp:3000
pnpm --filter mobile android:device
```

Troubleshooting device states:

- `unauthorized`: unlock the phone, accept the USB debugging prompt, or revoke USB debugging authorizations and reconnect.
- No device listed: try another cable/USB port, set USB mode to File Transfer, install/update Android SDK Platform Tools, install/update Android USB driver, restart adb with `adb kill-server` then `adb start-server`.
- More than one device listed: use the specific device serial with `adb -s <serial> reverse ...`, then select that device when Expo prompts.
- App installs but Metro cannot connect: rerun `adb reverse tcp:8081 tcp:8081`; also reverse the API port if the mobile app calls local API.

Acceptance criteria:

- `adb devices` shows the Poco F6 with status `device`.
- Metro port 8081 is reversed over adb.
- API port is reversed if the app uses the local backend, currently assumed `3000` unless the API config says otherwise.
- `pnpm --filter mobile android:device` installs and launches the app on the Poco F6, or reaches a concrete app error that Claude then fixes.

## Medium Priority: Troubleshoot And Fix The Whole Application

After the build/JDK/device path is stable, scan the application and fix verified issues.

Use this baseline:

```powershell
git status --short
pnpm install
pnpm typecheck
pnpm lint
pnpm test
```

Useful scans:

```powershell
rg -n "TODO|FIXME|console\.log|Alert\.alert|throw new Error|any" apps packages
rg -n "API_KEY|SECRET|TOKEN|PASSWORD|sk-|AIza|MAPS|OPENAI" apps packages .env* package.json
rg -n "Expo Go|QR code|scan.*QR" README.md CLAUDE.md docs apps packages
rg -n "ai\.|nearby\.|settings\.|insights\.|ledger\." apps/mobile/app apps/mobile/src
```

Fix suggestions:

- Fix TypeScript errors before UI polish.
- Fix broken tests or add missing focused tests where behavior is important.
- Keep calculation logic in `packages/shared`.
- Keep permission/location logic in services or hooks, not duplicated inside screens.
- Keep screens thin and avoid putting domain logic directly in UI components.
- Do not claim the whole app is fixed unless typecheck, lint, tests, and Android device launch have been attempted and reported.

Minimum verification after fixes:

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm --filter mobile android:device
```

## Low Priority: Translation And AI Suggest Page Cleanup

Problem to look for:

- Visible text on AI pages or other pages shows raw localization keys such as `ai.suggest...`, `ai.sugeest...`, or similar code words.
- Some locale strings may be missing, misspelled, or garbled.

Fix method suggestions:

1. Inspect `apps/mobile/app/(tabs)/ai.tsx` and all AI-related components/hooks.
2. Inspect `apps/mobile/src/i18n/index.ts`.
3. Inspect every locale file under `apps/mobile/src/i18n/locales/`.
4. If `t('ai.someKey')` renders `ai.someKey`, add the missing key to every supported locale JSON file.
5. If the key name is misspelled in code, either correct the code to the existing key or add a correctly named key and update all locale files.
6. Save locale JSON files as UTF-8.
7. Keep translations natural. If unsure for a language, use a clear English fallback temporarily and note it in the final response rather than leaving raw key names visible.
8. Do not hardcode visible strings directly in TSX.

Acceptance criteria:

- AI page does not show raw localization keys.
- Settings, Nearby, Insights, Ledger, Add, Home, and AI screens do not show mojibake or code-style key text.
- All new visible strings exist in every supported locale file.

## Final Response Requirements For Claude

Report in this order:

1. Gradle/JDK status:
   - Gradle wrapper version used.
   - Java/JDK version used.
   - Whether the Java 26 / Gradle 7.5.1 blocker is fixed.
2. Poco F6 USB debugging status:
   - `adb devices` result.
   - Whether port reverse succeeded.
   - Whether app installed/launched on the phone.
3. Files changed.
4. Issues fixed.
5. Tests and verification commands run, with pass/fail.
6. Remaining owner actions, if any.
7. Remaining risks, especially iOS parity or translations that need native speaker review.

