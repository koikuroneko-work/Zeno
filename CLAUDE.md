# Claude Code Instructions

You are building a production-ready cross-platform mobile application for Android and iOS. The app is a household account book with spending entry, remaining-balance calculations, monthly insights, multilingual settings, AI usage suggestions, and nearby affordable food/item suggestions.

Before writing code, read these files in order:

1. `docs/09_CLAUDE_PHONE_UNABLE_TO_LOAD_SCRIPT_FIX.md`
2. `docs/07_CLAUDE_URGENT_GRADLE_USB_TROUBLESHOOTING_PROMPT.md`
3. `docs/08_CLAUDE_FINDINGS_2026-07-09.md`
4. `docs/05_ENHANCEMENT_BRIEF_2026-07-06.md`
5. `docs/06_CLAUDE_CLEANUP_USB_DEBUGGING_PROMPT.md`
6. `docs/01_PRODUCT_REQUIREMENTS.md`
7. `docs/02_PROJECT_STRUCTURE.md`
8. `docs/03_IMPLEMENTATION_PLAN.md`
9. `docs/04_TESTING_AND_RELEASE.md`

## Primary Goal

Create a maintainable Expo React Native app that works the same on Android and iOS. The owner can test Android only, so every shared feature must avoid Android-only assumptions unless the file is explicitly platform-specific and documented.

## Current Enhancement Priority

The app is nearly done. Do not restart the project or rebuild the structure from zero. Continue from the current codebase and complete the 2026-07-06 enhancement pass:

- First confirm the Android build blocker is not active. The known bad state is Gradle 7.5.1 with Java 26.0.1. The current checked wrapper is Gradle 8.10.2 with JDK 17, so do not downgrade the wrapper just because older notes mention Gradle 8.7.
- Fix the installed-phone `Unable to load script` red screen by using a proper USB development-build flow: Metro running with `--dev-client`, `adb reverse tcp:8081 tcp:8081`, and `pnpm android:device`, or by creating a bundled release APK when standalone testing is explicitly needed.
- Set up and verify USB debugging physical-device testing on the owner's Poco F6. Use a development build/native install, not Expo Go.
- Add real Insights charts and comparison statements.
- Fix Nearby location permission flow and disable the Settings Nearby toggle until location permission is granted.
- Fix the Ledger empty state so only one Add Transaction button appears when there are no records.
- Fix the AI page Add button so it navigates to the Add page.
- Default currency from the user's device region/current location signal, for example Malaysia should default to MYR.
- Default language from the user's phone language unless the user manually changes it.
- Fix any visible mojibake/garbled localized labels while touching language and settings work.
- Fix raw localization-key text on AI Suggest or other pages, for example visible `ai.suggest...` style labels.
- Clean unnecessary generated/temporary files and set up Android USB debugging physical-device testing instead of Expo Go when requested.

## Non-Negotiable Rules

- Use TypeScript everywhere.
- Keep the mobile app and backend API separated.
- Never place AI provider keys, map/place API keys, or store credentials in mobile source code.
- Keep domain logic out of UI components. Use feature services, repositories, hooks, and shared types.
- Use one shared calculation engine for Android and iOS.
- Use one shared localization system for Android and iOS.
- Use platform-specific files only when necessary: `*.android.ts`, `*.ios.ts`, `*.android.tsx`, or `*.ios.tsx`.
- Every platform-specific implementation needs the same public interface and a short parity note in the file header.
- Ask before adding paid services, paid APIs, analytics, ads, subscriptions, or account systems.
- If an external API is unavailable during development, use a typed adapter with mocked development data behind a feature flag.
- Do not claim a result is the cheapest unless the data source provides real prices. Otherwise call it "nearby affordable suggestions" or "estimated low-cost options".

## Recommended Stack

- Monorepo: pnpm workspaces.
- Mobile: Expo React Native, Expo Router, TypeScript.
- Mobile state: Zustand for local UI/app state, TanStack Query for server state.
- Local data: SQLite through `expo-sqlite`, with migrations.
- Forms: React Hook Form plus Zod validation.
- Localization: i18next or react-i18next with device-locale default and in-app override.
- Styling: a token-based component layer. Use a cute, warm, modern visual style without making the finance app feel childish.
- Backend: Node.js TypeScript API, preferably Fastify or NestJS depending on project size.
- Shared package: Zod schemas, money/calculation utilities, API contracts, localization keys.
- Testing: Jest for unit tests, React Native Testing Library for components, Maestro or Detox for mobile flows.
- Build and submission: EAS Build and EAS Submit.

## Working Style

- Build in the phases from `docs/03_IMPLEMENTATION_PLAN.md`.
- End each phase with tests or a clear verification command.
- Keep commits/changes small and understandable.
- When a task touches data, update schemas, migrations, seed data, tests, and docs together.
- When a task touches UI, verify small Android and large Android layouts. iOS parity must be checked through shared code review and, when available, EAS/TestFlight.
- Keep accessibility in mind: text must not overlap, touch targets should be comfortable, color should not be the only signal, and all text must come from localization files.
- For this enhancement pass, prefer focused fixes in the existing files over broad rewrites.
- Keep owner-facing output concise and practical. If an issue requires phone or Windows settings, give exact owner actions instead of generic build advice.

## Definition of Done

The app is not considered done until:

- Android launches from VS Code/terminal onto the owner's Poco F6 through USB debugging. Emulator testing is useful but secondary for the current pass.
- Gradle uses the project wrapper and a supported JDK. Do not leave the build using Java 26 with Gradle 7.5.1.
- Core household account book flows work offline.
- Monthly remaining balance and category budget calculations have unit tests.
- Language follows the phone setting by default and can be overridden in settings.
- Currency defaults from device region/current location signal and can be overridden in settings.
- AI suggestions work through the backend or are safely hidden behind a disabled feature flag.
- Nearby suggestions request location permission only when the user opens that feature.
- Nearby Settings toggle is disabled/greyed out until location permission is granted.
- Android and iOS build configs exist.
- Store privacy/data documents are drafted.
- A release checklist has been completed for Google Play and Apple App Store.
