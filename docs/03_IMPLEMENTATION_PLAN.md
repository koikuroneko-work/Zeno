# Implementation Plan

Follow this plan from start to store submission. Complete phases in order unless the owner explicitly changes priority.

The current app is already scaffolded and nearly done. For the next Claude Code run, complete Phase 17 first, then return to older phases only if a missing foundation blocks the requested fixes.

## Phase 0: Environment and Decisions

1. Confirm Node.js, pnpm, Git, VS Code, Android Studio, Android SDK, and an Android emulator are installed.
2. Confirm whether the owner has Apple Developer and Google Play Console accounts.
3. Confirm final app name, bundle identifiers, and default currency.
4. Confirm AI provider and nearby places provider before implementing live services.
5. If no provider is confirmed, build typed mock adapters and feature flags.

Expected result:

- Developer can run package scripts.
- Android emulator exists.
- Store account requirements are known.

## Phase 1: Scaffold Monorepo

1. Create `package.json` at repo root with pnpm workspaces.
2. Create `pnpm-workspace.yaml`.
3. Scaffold `apps/mobile` with Expo React Native and TypeScript.
4. Scaffold `apps/api` with Node.js TypeScript.
5. Scaffold `packages/shared` for shared schemas and calculations.
6. Add shared ESLint, Prettier, and TypeScript config.
7. Add scripts:
   - `pnpm dev:mobile`
   - `pnpm dev:api`
   - `pnpm test`
   - `pnpm lint`
   - `pnpm typecheck`

Expected result:

- `pnpm install` succeeds.
- `pnpm typecheck` succeeds.
- Mobile app opens with a basic shell.

## Phase 2: Design System and Navigation

1. Define design tokens:
   - Color.
   - Spacing.
   - Typography.
   - Radius.
   - Shadows/elevation.
2. Build reusable UI components:
   - Button.
   - IconButton.
   - Text.
   - AmountInput.
   - TextField.
   - Card.
   - ProgressBar.
   - Badge.
   - EmptyState.
   - Screen.
3. Add Expo Router layout and bottom tabs:
   - Home.
   - Ledger.
   - Add.
   - Insights.
   - Settings.
4. Add cute category icons through a maintained icon library or local assets.

Expected result:

- Navigation works.
- UI looks coherent on small and large Android screens.
- All static text already uses localization keys.

## Phase 3: Localization Foundation

1. Add i18n setup.
2. Detect device language at first launch.
3. Store manual language override in local settings.
4. Add locale files:
   - `en.json`
   - `ja.json`
   - `ko.json`
   - `ms.json`
   - `zh-Hans.json`
   - `zh-Hant.json`
5. Build Settings language selector.
6. Add tests for language fallback.

Expected result:

- App follows phone language by default.
- User can change language manually.
- Missing language keys are caught in tests or lint.

## Phase 4: Local Database and Core Models

1. Add SQLite setup.
2. Add migrations for household, members, accounts, categories, transactions, budgets, recurring rules, AI insights, and settings.
3. Add repositories for each core model.
4. Seed default categories per locale key.
5. Add tests for migrations and repository behavior.

Expected result:

- App can create and read local data offline.
- Default categories appear on first launch.

## Phase 5: Onboarding

1. Build onboarding flow:
   - Welcome.
   - Currency.
   - Monthly budget or income.
   - Household mode.
   - Optional AI/location explanation.
2. Save setup to local database/settings.
3. Allow skipping optional steps.
4. Route completed users to Home.

Expected result:

- First launch creates a household, account, default categories, and settings.

## Phase 6: Transaction Entry and Ledger

1. Build Add screen with amount keypad/input.
2. Add expense, income, transfer, and adjustment types.
3. Add category picker.
4. Add date picker.
5. Add optional note/merchant/member fields.
6. Save transaction through repository.
7. Build Ledger list with filters by month, category, and type.
8. Build transaction detail/edit/delete.
9. Add validation with shared schemas.

Expected result:

- User can enter breakfast, dinner, shopping, bills, and other expenses.
- Ledger updates instantly.
- Edit and delete work.

## Phase 7: Budget Calculations and Dashboard

1. Implement money utilities in `packages/shared`.
2. Implement monthly summary calculations in `packages/shared`.
3. Implement category budget usage calculations in `packages/shared`.
4. Add unit tests for:
   - Remaining monthly amount.
   - Category budget status.
   - Income and expense totals.
   - Deleted transaction exclusion.
   - Month boundary handling.
5. Build Home dashboard from calculation output.
6. Build planned spending preview for "amount left after this purchase".

Expected result:

- Home dashboard shows correct total spent and remaining amount.
- Planned breakfast/dinner/shopping preview works before saving.

## Phase 8: Reports

1. Build monthly category breakdown.
2. Build simple daily trend chart.
3. Build compare with previous month.
4. Add CSV export.
5. Add empty states for months without data.

Expected result:

- User can understand spending without needing AI.

## Phase 9: Backend API Foundation

1. Create health endpoint.
2. Add environment configuration validation.
3. Add request logging without sensitive data.
4. Add CORS/app-origin restrictions as appropriate.
5. Add shared API schemas.
6. Add basic API tests.

Expected result:

- Mobile can call backend health endpoint.
- API rejects invalid payloads.

## Phase 10: AI Monthly Suggestions

1. Create summarized monthly insight payload:
   - Month.
   - Currency.
   - Total income.
   - Total expenses.
   - Category totals.
   - Budget limits.
   - Optional previous month comparison.
2. Send the summary to backend only when user enables AI.
3. Backend calls AI provider using a structured JSON response schema.
4. Store generated insight locally with input hash to avoid duplicate calls.
5. Show AI suggestions in Insights screen.
6. Add non-advice disclaimer in localized text.
7. Add tests for payload minimization and schema validation.

Expected result:

- AI suggestions are useful, safe, explainable, and optional.

## Phase 11: Nearby Affordable Suggestions

1. Build feature flag for nearby suggestions.
2. Build permission explainer screen/card.
3. Request foreground location only after user action.
4. Mobile sends coarse coordinates or current coordinates according to chosen privacy level.
5. Backend calls selected places/price provider.
6. Rank options by distance, price signal, rating, and open status.
7. Return typed suggestions.
8. Show results with honest wording.
9. Add manual refresh and error states.

Expected result:

- User can find nearby affordable food/item options.
- App does not imply exact cheapest results unless exact price data exists.

## Phase 12: Settings, Privacy, and Data Ownership

1. Build settings screens:
   - Language.
   - Currency.
   - Month start day.
   - AI toggle.
   - Nearby toggle.
   - Export CSV.
   - Delete/reset data.
   - Privacy policy.
2. Add confirmation dialogs for destructive actions.
3. Draft privacy policy and data safety notes.

Expected result:

- User can control language, data, AI, and location features.

## Phase 13: Cross-Platform Polish

1. Check Android and iOS safe areas.
2. Check keyboard behavior.
3. Check date/time/month boundaries.
4. Check permission copy for Android and iOS.
5. Check layout on small phone, large phone, and tablet-like widths.
6. Check dark mode if included.
7. Review all visible strings for localization.

Expected result:

- Android and iOS share behavior and appearance as much as possible.

## Phase 14: Testing

1. Run unit tests.
2. Run component tests.
3. Run typecheck.
4. Run lint.
5. Run Android emulator smoke test.
6. Run mobile flow test:
   - Onboarding.
   - Add expense.
   - View remaining amount.
   - Change language.
   - Open Insights.
   - Open Nearby and deny permission.
   - Open Nearby and allow permission.
7. Run release build check.

Expected result:

- App is ready for store preparation.

## Phase 15: Build and Store Preparation

1. Configure app identifiers:
   - Android package name.
   - iOS bundle identifier.
2. Configure icons and splash screen.
3. Configure permissions:
   - Location foreground.
   - Camera/photos only if receipt feature is added.
4. Configure EAS build profiles:
   - development.
   - preview.
   - production.
5. Build Android internal test binary.
6. Build iOS TestFlight binary through EAS when Apple credentials are ready.
7. Prepare screenshots, descriptions, privacy policy, data safety, and app privacy answers.
8. Submit to internal testing before production.

Expected result:

- Android can be tested locally and through Google Play internal testing.
- iOS can be built and submitted through EAS/TestFlight even from Windows, once Apple credentials are ready.

## Phase 16: Production Release

1. Fix internal testing feedback.
2. Freeze release branch/version.
3. Run final checks.
4. Submit Android production release.
5. Submit iOS App Review.
6. Monitor crash reports, user reviews, and API errors.

Expected result:

- App is published safely and maintainably.

## Phase 17: Current Enhancement and Bugfix Pass

Complete this phase before adding unrelated features.

1. Read `docs/05_ENHANCEMENT_BRIEF_2026-07-06.md`.
2. Inspect current files:
   - `apps/mobile/app/(tabs)/insights.tsx`
   - `apps/mobile/app/(tabs)/ai.tsx`
   - `apps/mobile/app/(tabs)/nearby.tsx`
   - `apps/mobile/app/(tabs)/ledger.tsx`
   - `apps/mobile/app/(tabs)/settings.tsx`
   - `apps/mobile/src/store/settingsStore.ts`
   - `apps/mobile/src/i18n/index.ts`
   - `packages/shared/src/calculations/index.ts`
3. Add Insights charts:
   - Category breakdown pie chart or chart-like visual.
   - Daily/weekly/monthly comparison cards.
   - Statements comparing this month with last month, this week with last week, and today with yesterday.
4. Fix Nearby permissions:
   - Use one cross-platform foreground location permission service.
   - Nearby page requests permission before showing results.
   - Settings Nearby toggle is disabled and grey until permission is granted.
   - Permanently denied permission shows an action to open phone settings.
5. Fix Ledger empty state:
   - When there are no records, render exactly one Add Transaction button.
   - The button navigates to `/(tabs)/add`.
6. Fix AI page Add button:
   - The Add button must navigate to `/(tabs)/add`.
   - Remove any no-op button handler.
7. Fix default currency:
   - Resolve from device locale/region first.
   - Use location-derived country only when location permission is already granted.
   - Malaysia must default to MYR.
   - User manual currency selection must always win afterward.
8. Fix default language:
   - Resolve from phone language at app startup.
   - User manual language selection must always win afterward.
   - Fix any garbled localized labels or currency symbols.
9. Add or update tests for the new behavior.
10. Run verification commands:
    - `pnpm typecheck`
    - `pnpm lint`
    - `pnpm test`
    - Android emulator smoke test if available.

Expected result:

- Insights page shows real visual summaries and comparisons.
- Nearby permission and Settings toggle behavior matches the owner request.
- Ledger empty state has only one Add Transaction button.
- AI Add button works.
- Currency and language default correctly but remain user-changeable.
