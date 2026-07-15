# Claude Prompt: Phone Run Fix For Unable To Load Script

Use this prompt for the next Claude Code run from `C:\Homepouch`. The owner has the app installed on a real Android phone, but opening it shows:

```text
Unable to load script.
Make sure you're either running Metro (run 'npx react-native start') or that your bundle 'index.android.bundle' is packaged correctly for release.
```

Do not restart the project. Do not recreate the Expo app from zero. Work with the existing Expo React Native monorepo and fix the phone run path.

## Required Context To Read First

Read these files before changing code:

1. `CLAUDE.md`
2. `docs/09_CLAUDE_PHONE_UNABLE_TO_LOAD_SCRIPT_FIX.md`
3. `docs/07_CLAUDE_URGENT_GRADLE_USB_TROUBLESHOOTING_PROMPT.md`
4. `docs/08_CLAUDE_FINDINGS_2026-07-09.md`
5. `docs/05_ENHANCEMENT_BRIEF_2026-07-06.md`
6. `docs/06_CLAUDE_CLEANUP_USB_DEBUGGING_PROMPT.md`
7. `docs/04_TESTING_AND_RELEASE.md`

## Current Facts From Codex Check On 2026-07-10

- Current shell `java -version` reports Temurin OpenJDK `17.0.19`.
- `JAVA_HOME` is `C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot`.
- `where.exe java` shows JDK 17 first, then Oracle Java path, then Java `26.0.1` later in PATH.
- `apps/mobile/android/gradlew.bat --version` reports Gradle `8.10.2` with JVM `17.0.19`.
- `apps/mobile/android/gradle/wrapper/gradle-wrapper.properties` points to `gradle-8.10.2-all.zip`.
- The older docs mention expected Gradle `8.7`, but the current checked wrapper is `8.10.2` and works with JDK 17. Do not downgrade it just because an older note says `8.7`.
- `adb devices` currently sees the phone as `e31bb5ff device`.
- `adb reverse tcp:8081 tcp:8081` succeeded.
- `adb reverse tcp:3000 tcp:3000` succeeded.
- Root scripts already exist: `pnpm adb:devices`, `pnpm adb:reverse`, and `pnpm android:device`.

## What The Phone Error Means

This error has two valid fixes depending on the build type:

1. Development/debug build:
   - Metro must be running on the PC.
   - The phone must be able to reach Metro, normally through `adb reverse tcp:8081 tcp:8081`.
   - The app should be launched as an Expo development build/native Android run, not Expo Go.

2. Release build:
   - The JavaScript bundle and assets must be packaged into the APK/AAB.
   - The app must not depend on Metro at launch.

For the owner right now, prefer the development build over USB first. Only switch to release APK testing when the debug path is proven healthy or the owner specifically asks for a standalone APK.

## Priority Order

1. Confirm Gradle/JDK is not in the bad state.
2. Confirm the phone is connected and authorized through ADB.
3. Start Metro for an Expo development build.
4. Reverse Metro and API ports over USB.
5. Build/install/launch the native Android app on the phone.
6. If the phone still shows `Unable to load script`, collect logs and fix the concrete cause.
7. Only edit Gradle files when diagnostics prove a Gradle file is wrong.

## Step 1: Confirm Gradle And JDK

Run:

```powershell
java -version
where.exe java
$env:JAVA_HOME
Get-Content apps/mobile/android/gradle/wrapper/gradle-wrapper.properties
Set-Location apps/mobile/android
.\gradlew.bat --version
Set-Location C:\Homepouch
```

Passing state:

- `java -version` uses JDK 17.
- `.\gradlew.bat --version` uses Gradle 8.x and JVM 17.
- The command is using the project wrapper at `apps/mobile/android/gradlew.bat`, not a global Gradle 7.5.1 install.

If Gradle reports `7.5.1` with Java `26.0.1`, fix the environment first:

```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
```

Then reopen PowerShell/VS Code after setting the same values in Windows environment variables. In Android Studio, set:

```text
Settings > Build, Execution, Deployment > Build Tools > Gradle > Gradle JDK = JDK 17
```

Do not change random Gradle files to hide the Java 26 issue. Do not downgrade the wrapper to Gradle 7.5.1.

## Step 2: Confirm Phone Connection

Run:

```powershell
pnpm adb:devices
```

Passing state:

```text
List of devices attached
e31bb5ff    device
```

Troubleshooting:

- `unauthorized`: unlock the phone, accept the RSA prompt, or revoke USB debugging authorizations and reconnect.
- No device: use a data-capable cable, set USB mode to File Transfer/MTP, install Android SDK Platform Tools, and restart ADB with `adb kill-server` then `adb start-server`.
- Poco/Xiaomi install failures: enable `USB debugging`, `Install via USB`, and if present `USB debugging (Security settings)`.

## Step 3: Run The Development Build Correctly

Use two PowerShell terminals.

Terminal 1, start Metro for the Expo development build:

```powershell
cd C:\Homepouch
pnpm --filter mobile dev -- --dev-client --localhost --clear
```

Terminal 2, reverse ports and install/launch on the phone:

```powershell
cd C:\Homepouch
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

If the app is already installed and you only need to relaunch it after starting Metro:

```powershell
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3000 tcp:3000
adb shell am force-stop com.zeno.app
adb shell monkey -p com.zeno.app 1
```

Do not instruct the owner to scan a QR code with Expo Go.

## Step 4: If Unable To Load Script Still Appears

Collect logs while launching:

```powershell
adb logcat -c
adb shell am force-stop com.zeno.app
adb shell monkey -p com.zeno.app 1
adb logcat -d ReactNative:V ReactNativeJS:V Expo:V AndroidRuntime:E *:S
```

Check these concrete causes:

- Metro is not running in Terminal 1.
- `adb reverse tcp:8081 tcp:8081` was not run after reconnecting the phone.
- More than one Android device/emulator is connected and the reverse was applied to the wrong target.
- The installed app is a release build, but the release JS bundle task failed.
- The app package was installed from an older broken build; reinstall with `pnpm android:device`.
- Metro cache is stale; rerun `pnpm --filter mobile dev -- --dev-client --localhost --clear`.

## Step 5: Release APK Path If Standalone Testing Is Needed

Only use this path if the owner wants the app to open without Metro.

```powershell
cd C:\Homepouch\apps\mobile\android
.\gradlew.bat :app:assembleRelease --stacktrace
adb install -r app\build\outputs\apk\release\app-release.apk
adb shell monkey -p com.zeno.app 1
```

Notes:

- This local release build currently uses the debug signing config in `apps/mobile/android/app/build.gradle`, so it is only for local testing.
- Store release signing must be handled separately through EAS/production signing.
- If release bundling fails, fix the bundle error. Do not disable bundling to silence it.

## Gradle File Guardrails

Inspect these files before editing:

- `apps/mobile/android/settings.gradle`
- `apps/mobile/android/build.gradle`
- `apps/mobile/android/app/build.gradle`
- `apps/mobile/android/gradle.properties`
- `apps/mobile/android/gradle/wrapper/gradle-wrapper.properties`
- `apps/mobile/app.config.ts`

Do not remove these Expo/React Native pieces unless a verified error requires a targeted change:

- `apply plugin: "com.facebook.react.rootproject"`
- `apply plugin: "com.facebook.react"`
- `entryFile = file(["node", "-e", "require('expo/scripts/resolveAppEntry')", ...])`
- `cliFile = new File(["node", "--print", "require.resolve('@expo/cli', ...])`
- `bundleCommand = "export:embed"`
- `useExpoModules()`
- Expo autolinking blocks in `settings.gradle`

Do not run `expo prebuild --clean` unless the owner approves it, because it can overwrite native Android changes.

## Known Repo Issues To Keep In Mind

- `apps/mobile/app.config.ts` references `./assets/splash.png`, `./assets/notification-icon.png`, and `./assets/notification.wav`; previous findings said these files may be missing. If Gradle/Expo config fails on assets, either add real assets or update the config to existing assets.
- `pnpm test` previously failed because `packages/shared/__tests__/calculations.test.ts` imported `../dist/calculations` while `dist` is generated/ignored. Fix tests to use source or build before testing.
- Keep the owner-focused phone run fix higher priority than broad app cleanup.

## Verification Commands

Run these before handing back:

```powershell
pnpm typecheck
pnpm test
pnpm lint
pnpm adb:devices
pnpm adb:reverse
pnpm android:device
```

If Android install/build fails, also run:

```powershell
cd C:\Homepouch\apps\mobile\android
.\gradlew.bat :app:assembleDebug --stacktrace
```

Passing phone-run criteria:

- `adb devices` shows the Poco F6 as `device`.
- Metro is running with `--dev-client`.
- `adb reverse tcp:8081 tcp:8081` succeeds.
- `pnpm android:device` installs and launches `com.zeno.app`.
- The app opens past the `Unable to load script` screen.

## Final Response Requirements For Claude

Report in this order:

1. Gradle/JDK status, including wrapper version and JVM version.
2. Phone ADB status, including device serial/status.
3. Metro status and whether port reverse succeeded.
4. Exact install/launch command used.
5. Whether the app opened past `Unable to load script`.
6. Files changed.
7. Tests and verification commands run, with pass/fail.
8. Remaining owner actions, if any.

