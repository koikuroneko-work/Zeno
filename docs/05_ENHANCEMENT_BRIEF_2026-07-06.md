# Enhancement Brief 2026-07-06

The app is nearly done. This brief is the priority list for the next Claude Code run. Do not restart the project. Work with the current Expo React Native codebase and make focused fixes.

## Current Files To Inspect First

- `apps/mobile/app/(tabs)/insights.tsx`
- `apps/mobile/app/(tabs)/ai.tsx`
- `apps/mobile/app/(tabs)/nearby.tsx`
- `apps/mobile/app/(tabs)/ledger.tsx`
- `apps/mobile/app/(tabs)/settings.tsx`
- `apps/mobile/src/store/settingsStore.ts`
- `apps/mobile/src/i18n/index.ts`
- `packages/shared/src/calculations/index.ts`
- `apps/mobile/src/i18n/locales/*.json`

## Priority Order

1. Fix broken navigation and duplicate UI first.
2. Fix language and currency defaults.
3. Fix Nearby permission and Settings toggle behavior.
4. Add Insights charts and comparison statements.
5. Add tests and run verification.

## Required Fixes And Acceptance Criteria

### 1. Ledger Empty State Duplicate Button

Problem:

- When there are no records, Ledger shows two Add Transaction buttons.

Required behavior:

- If transaction list is empty, show only one Add Transaction button.
- The button must navigate to `/(tabs)/add`.
- If transactions exist, it is acceptable to show the header Add Transaction button.
- Do not render both a header Add button and an empty-state Add button at the same time.

Acceptance criteria:

- Fresh install or empty store shows exactly one Add Transaction button on Ledger.
- Tapping it opens the Add page.

### 2. AI Page Add Button

Problem:

- The Add button on the AI page currently does not function.

Required behavior:

- On the AI page, when there is not enough data and the Add button is shown, tapping it must navigate to `/(tabs)/add`.
- Use Expo Router navigation consistently with the rest of the app.
- Remove any no-op handler.

Acceptance criteria:

- AI page with fewer than 3 transactions shows an Add button.
- Tapping the button opens the Add page.

### 3. Language Default And Manual Override

Required behavior:

- When the app opens and the user has not manually selected a language, use the phone language.
- If the phone language is unsupported, fall back to English.
- If the user manually changes language in Settings, that manual choice must persist and win on future launches.
- If the manual language is cleared/reset later, the app may follow the phone language again.
- All visible text must come from i18n files.
- Fix garbled text in labels, language names, symbols, arrows, and checkmarks.

Implementation notes:

- Keep a setting that distinguishes automatic language from manual override. Do not treat the first detected phone language as a permanent manual choice.
- Support language-region values such as `en-US`, `ms-MY`, `ja-JP`, and `ko-KR` by matching the language code first.
- Store locale files as UTF-8.

Acceptance criteria:

- Phone language Malay opens the app in Malay if no manual override exists.
- Phone language Japanese opens the app in Japanese if no manual override exists.
- Unsupported phone language opens English.
- Manual language selection persists after app restart.
- No mojibake/garbled labels appear in Settings or Nearby.

### 4. Currency Default And Manual Override

Required behavior:

- Default currency should be based on the user's current region/current location signal.
- Malaysia must default to MYR.
- The user can change currency later in Settings.
- Manual currency selection must persist and win on future launches.
- All pages must format money with the active currency, not hardcoded USD or bare numbers.

Implementation notes:

- Prefer device locale/region first because it does not require location permission.
- If location permission is already granted, the app may refine the default currency from the country code.
- Do not request location permission only for currency during app startup.
- Add a currency resolver utility with tests.
- Suggested resolver order:
  1. Manual currency override.
  2. Device locale currency code if available.
  3. Device region to currency map, for example `MY -> MYR`.
  4. Already-granted location country to currency map.
  5. Fallback `USD`.

Acceptance criteria:

- Malaysia region or `ms-MY` locale defaults to MYR.
- United States region or `en-US` locale defaults to USD.
- Japan region or `ja-JP` locale defaults to JPY.
- Korea region or `ko-KR` locale defaults to KRW.
- Manual currency change persists after app restart.
- Home, Ledger, Insights, AI, and Add pages use the selected currency format.

### 5. Nearby Permission And Settings Toggle

Required behavior:

- Nearby page must ask the user to allow foreground location permission before showing nearby results.
- If location permission is not granted, the Settings Nearby toggle must be greyed out and unpressable.
- If permission is denied but can be asked again, Nearby page should show an Allow Location button.
- If permission is denied permanently or cannot be asked again, show a button that opens the phone app settings.
- When permission becomes granted, Settings Nearby toggle becomes enabled.
- Nearby results must not show until permission is granted and the user has the feature enabled.

Implementation notes:

- Prefer `expo-location` permission APIs for both Android and iOS instead of separate Android-only permission logic.
- Create a small permission service/hook so Nearby and Settings read the same permission state.
- Store the user's Nearby feature preference separately from system permission status.
- A disabled Settings toggle should use disabled visual styling and should not call `setNearbyEnabled`.

Acceptance criteria:

- Fresh install: Settings Nearby toggle is greyed out and cannot be changed.
- Nearby page explains why location is needed and provides an Allow Location button.
- Denying permission keeps Settings toggle disabled.
- Granting permission enables the Settings toggle.
- If permission is revoked from phone settings, returning to the app disables Nearby toggle again.

### 6. Insights Charts And Comparison Statements

Required behavior:

- Insights page must show real data, not "coming soon" alerts.
- Add a category breakdown pie chart or chart-like visual.
- Add at least one trend/chart section for spending over time.
- Add statements comparing:
  - This month with last month.
  - This week with last week.
  - Today with yesterday.
- Handle empty data gracefully.

Implementation notes:

- Use existing transaction data and shared calculation utilities where possible.
- If a chart dependency is already installed, use it. If not, either add a small Expo-compatible chart dependency or build a simple chart-like visual with React Native views.
- Keep labels localized.
- Avoid text overlap on small Android screens.
- Use the active currency for all money values.

Comparison statement examples:

- "You spent RM 42.50 less than last month."
- "This week is 12% higher than last week."
- "Today is the same as yesterday."
- "No spending last month, so there is nothing to compare yet."

Acceptance criteria:

- Insights renders without alerts for monthly summary, category breakdown, daily trend, or compare sections.
- Chart/pie chart appears when there is category data.
- Empty state appears when there is no transaction data.
- Comparison statements are correct for higher, lower, equal, and missing previous-period data.

## Localization Keys To Add Or Verify

Add keys for every new visible string in all supported locale files:

- `insights.compare.month`
- `insights.compare.week`
- `insights.compare.day`
- `insights.compare.higher`
- `insights.compare.lower`
- `insights.compare.equal`
- `insights.compare.noPrevious`
- `insights.chart.categoryBreakdown`
- `insights.chart.spendingTrend`
- `settings.nearbyPermissionRequired`
- `nearby.permissionTitle`
- `nearby.permissionBody`
- `nearby.openSettings`
- `nearby.permissionDenied`
- `currency.autoDetected`
- `currency.manual`

## Verification Commands

Run these before handing back:

```powershell
pnpm typecheck
pnpm lint
pnpm test
```

If an Android emulator is available:

```powershell
pnpm --filter mobile android
```

or:

```powershell
pnpm --filter mobile dev
```

## Final Handoff Notes For Claude Code

When finished, report:

- Files changed.
- Which bug fixes were completed.
- Which tests ran and their result.
- Whether Android emulator testing was completed.
- Any remaining iOS parity risks.
