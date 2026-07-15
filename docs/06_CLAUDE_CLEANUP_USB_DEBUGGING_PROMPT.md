# Claude Prompt: Cleanup, Rearrangement, And USB Debugging Setup

Use this prompt when calling Claude Code for the next maintenance pass.

```text
You are working in this existing Expo React Native monorepo for the Zeno household account book app.

Important: do not restart the project from zero. The app is already mostly built. Your task is to clean the repository, rearrange files into a maintainable structure, remove unnecessary/generated files, and set up Android physical-device testing through USB debugging instead of Expo Go.

Before cleanup, fix the current high-priority Android build blocker if it is still present:

- Error: `Could not use Gradle version 7.5.1 and Java version 26.0.1 to configure the build.`
- Do not downgrade to Gradle 7.5.1.
- The project wrapper should use `apps/mobile/android/gradle/wrapper/gradle-wrapper.properties`, expected `gradle-8.7-all.zip`.
- Use a supported Android development JDK, preferably JDK 17 for this Expo SDK 52 / React Native 0.76 stack.
- Check `java -version`, `$env:JAVA_HOME`, `where.exe java`, and `apps/mobile/android/gradlew.bat --version`.
- If Android Studio is using Gradle 7.5.1, set it to use the project Gradle wrapper and JDK 17.
- If the command is using a global Gradle instead of the wrapper, run the project scripts or `apps/mobile/android/gradlew.bat` from the correct folder.

Read these files first:

1. CLAUDE.md
2. docs/05_ENHANCEMENT_BRIEF_2026-07-06.md
3. docs/02_PROJECT_STRUCTURE.md
4. docs/04_TESTING_AND_RELEASE.md

## Main Goals

1. Remove unnecessary files and generated clutter.
2. Rearrange files so the codebase is clean and maintainable.
3. Stop relying on Expo Go for testing.
4. Set up and document Android USB debugging on a real phone.
5. Make sure the app can be built and installed on the phone with a development build/native Android run.

## Cleanup Rules

Before deleting anything, inspect the file and decide whether it is source, config, generated output, cache, backup, or temporary scratch work.

Safe deletion candidates to review:

- `apps/mobile/export/`
- `packages/shared/dist/`
- `apps/mobile/tsconfig.json.bak`
- `fix-typo.js`
- `fix-typo.cjs`
- `fx.js`
- `.expo/`
- `apps/mobile/.expo/`
- Android build/cache folders such as `apps/mobile/android/.gradle/` or `apps/mobile/android/app/build/` if present.
- IDE files such as `.idea/` and `*.iml`, unless the owner wants to keep IDE project metadata.

Do not delete these:

- `apps/mobile/android/`
- `apps/mobile/android/gradlew`
- `apps/mobile/android/gradlew.bat`
- `apps/mobile/android/gradle/wrapper/`
- `apps/mobile/android/app/src/`
- `apps/mobile/app/`
- `apps/mobile/src/`
- `apps/api/src/`
- `packages/shared/src/`
- `docs/`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `app.config.ts`
- `eas.json`
- `.env` files if any exist. Instead, list them and make sure they are gitignored.

If a file is ambiguous, do not delete it immediately. Add it to a "needs owner confirmation" list in your final response.

After deletion, update `.gitignore` if needed so generated folders do not come back.

## Rearrangement Rules

Keep the monorepo structure:

- `apps/mobile` for the React Native mobile app.
- `apps/api` for backend/API code.
- `packages/shared` for shared schemas, calculations, money utilities, and API contracts.
- `docs` for project instructions.

Rearrange only when it improves maintainability. Prefer moving code into these areas:

- Reusable UI components: `apps/mobile/src/components/ui/`
- App-wide hooks/services: `apps/mobile/src/services/`
- Feature-specific code: `apps/mobile/src/features/<feature>/`
- Shared calculations and formatting: `packages/shared/src/`
- Mobile-only utilities: `apps/mobile/src/utils/`

Do not move files only for style. If moving files, update all imports and run typecheck.

## USB Debugging Instead Of Expo Go

The owner does not want to use Expo Go for testing now. Set up the project to run on a physical Android phone through USB debugging. The current target device is a Poco F6.

Required behavior:

- Testing should use a development build/native Android install, not Expo Go QR scanning.
- The main Android command should build/install the app to a connected USB device.
- Metro should connect over USB using `adb reverse` where needed.

Recommended scripts to add or verify:

Root `package.json`:

- `android:device`: runs the mobile Android native build/install command.
- `dev:android-device`: starts the Android physical-device development flow.
- `adb:devices`: lists connected Android devices.
- `adb:reverse`: runs Metro/API port reverse commands.

Mobile `apps/mobile/package.json`:

- `android:device`: `expo run:android --device`
- `android`: may remain `expo run:android`
- `dev`: may remain `expo start`, but do not instruct the owner to use Expo Go.

Use commands like:

```powershell
adb devices
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3000 tcp:3000
pnpm --filter mobile android:device
```

If the API uses a different local port, update the reverse command to match the actual API port.

## Environment Setup Checklist

Set up or document these steps for the owner:

1. Install Android Studio if not already installed.
2. Install Android SDK Platform Tools.
3. Confirm `adb` works in PowerShell.
4. Confirm `ANDROID_HOME` is set.
5. Confirm the Android SDK `platform-tools` folder is in the Windows PATH.
6. On the phone, enable Developer Options.
7. On the phone, enable USB debugging.
8. Connect phone with USB cable.
9. Accept the RSA fingerprint prompt on the phone.
10. Run `adb devices` and confirm the phone status is `device`, not `unauthorized`.
11. Run `adb reverse tcp:8081 tcp:8081`.
12. Run API port reverse too if the mobile app calls local API.
13. Run `pnpm --filter mobile android:device`.

If `adb devices` shows `unauthorized`, tell the owner to unlock the phone and accept the USB debugging prompt.

If no device appears, tell the owner to check cable mode, USB drivers, Android Studio SDK Platform Tools, and phone developer settings.

Poco/Xiaomi-specific notes:

- Enable Developer Options by tapping the HyperOS/MIUI version several times.
- Enable `USB debugging`.
- If installation is blocked, also enable `Install via USB` and, if available, `USB debugging (Security settings)`.
- Use File Transfer/MTP mode if the phone asks for USB mode.
- If the RSA prompt does not appear, revoke USB debugging authorizations on the phone, reconnect, and restart adb with `adb kill-server` then `adb start-server`.

## Expo Go Removal Rules

- Do not remove Expo itself. This is still an Expo React Native app.
- Do not tell the owner to test with Expo Go.
- Remove or rewrite docs/scripts that say to scan a QR code with Expo Go.
- Keep EAS/dev build support because the app still needs Android/iOS builds for store release.
- Prefer "development build" or "USB debugging physical device" wording.

## Verification

After cleanup and setup:

1. Run `pnpm typecheck`.
2. Run `pnpm lint`.
3. Run `pnpm test`.
4. Run `adb devices`.
5. Run `adb reverse tcp:8081 tcp:8081`.
6. Run the app on the connected phone with `pnpm --filter mobile android:device`.

If any command fails, fix the issue if possible. If it requires owner action on the phone or Windows system settings, explain exactly what the owner must do.

## Final Response Requirements

When finished, report:

- Files/folders deleted.
- Files moved/rearranged.
- Scripts added or changed.
- USB debugging setup status.
- Exact command the owner should run to install the app on the phone.
- Any files you did not delete because they need owner confirmation.
- Test results.
```
