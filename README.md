# Household Account Book Mobile App

This repository is prepared as a handoff workspace for building a cross-platform household account book app for Android and iOS.

Start here:

1. Read [CLAUDE.md](CLAUDE.md).
2. For the urgent Gradle/JDK, Poco F6 USB debugging, troubleshooting, and translation handoff, read [docs/07_CLAUDE_URGENT_GRADLE_USB_TROUBLESHOOTING_PROMPT.md](docs/07_CLAUDE_URGENT_GRADLE_USB_TROUBLESHOOTING_PROMPT.md).
3. For the current enhancement pass, read [docs/05_ENHANCEMENT_BRIEF_2026-07-06.md](docs/05_ENHANCEMENT_BRIEF_2026-07-06.md).
4. For cleanup and USB phone testing setup, read [docs/06_CLAUDE_CLEANUP_USB_DEBUGGING_PROMPT.md](docs/06_CLAUDE_CLEANUP_USB_DEBUGGING_PROMPT.md).
5. Read [docs/01_PRODUCT_REQUIREMENTS.md](docs/01_PRODUCT_REQUIREMENTS.md).
6. Read [docs/02_PROJECT_STRUCTURE.md](docs/02_PROJECT_STRUCTURE.md).
7. Follow [docs/03_IMPLEMENTATION_PLAN.md](docs/03_IMPLEMENTATION_PLAN.md).
8. Verify with [docs/04_TESTING_AND_RELEASE.md](docs/04_TESTING_AND_RELEASE.md).

Recommended stack: Expo React Native with TypeScript for the mobile app, plus a small backend API for AI and nearby-place integrations so secrets never live inside the mobile app.

## Current Android Testing Target

The current priority is a development build installed on the owner's Poco F6 through USB debugging, not Expo Go. If Gradle reports `Gradle 7.5.1` with `Java 26.0.1`, first make sure the project wrapper and a supported JDK are being used.

Useful commands:

```powershell
pnpm adb:devices
pnpm adb:reverse
pnpm android:device
```
