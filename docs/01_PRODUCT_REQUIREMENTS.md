# Product Requirements

Last updated: 2026-07-06

## App Summary

Build a household account book app for families, couples, roommates, and individuals who want a friendly way to track daily spending, understand monthly usage, and make better small money decisions.

The app should feel cute, warm, and encouraging, but it is still a finance tool. The design should be pleasant and soft, not childish or cluttered.

Working app name until the owner chooses a final name: `Zeno`.

## Target Platforms

- Android: publish to Google Play.
- iOS: publish to Apple App Store.
- Codebase must be shared as much as possible so the Android version and iOS version behave the same.
- The owner can test Android locally. iOS parity must be protected by shared code, tests, EAS iOS builds, and TestFlight when an Apple account/device is available.

## Core User Goals

- Quickly enter spending after breakfast, dinner, shopping, bills, transport, groceries, and other normal household expenses.
- See how much money is left for the current month.
- See category usage and warnings before overspending.
- Receive monthly AI suggestions based on the user's entered data.
- Find nearby affordable food or shopping suggestions based on the user's current location.
- Use the app in the phone language by default, with a manual language setting available.
- Use the local currency by default based on the user's device region/current location signal, with a manual currency setting available.

## Current Enhancement Requirements

The current app is already partly built. The next implementation pass must complete these items before new unrelated work:

- Insights page must show useful charts instead of "coming soon" cards.
- Insights page must include plain-language comparison statements for:
  - This month compared with last month.
  - This week compared with last week.
  - Today compared with yesterday.
- Nearby page must request foreground location permission from the phone before showing nearby results.
- Settings Nearby toggle must be greyed out and unpressable while location permission is not granted.
- Ledger page must show only one Add Transaction button when there are no records.
- AI page Add button must navigate to the Add page.
- Currency must default from the user's region/current location signal, for example Malaysia defaults to MYR, and must be changeable later.
- Language must follow the phone language when the app opens unless the user has manually selected another language.
- Localized labels must render correctly without garbled text.

## MVP Features

### 1. Onboarding

- Default currency from device region/current location signal, then allow the user to change it.
- Ask for monthly income or starting monthly budget.
- Ask whether the user wants a simple personal book or household mode.
- Use phone language automatically by default.
- Let the user skip optional setup and edit later.

### 2. Dashboard

- Show current month overview:
  - Starting budget or income.
  - Total spent.
  - Total remaining.
  - Today spending.
  - Top categories.
  - Upcoming recurring expenses.
- Show a friendly status message, for example "You are doing fine this week" or "Dining is close to the limit".

### 3. Transaction Entry

- Add expense, income, transfer, and adjustment records.
- Required fields:
  - Amount.
  - Category.
  - Date/time.
  - Account or wallet.
- Optional fields:
  - Note.
  - Merchant.
  - Photo receipt later, not required for MVP.
  - Household member.
  - Recurring rule.
- Quick buttons for common categories: breakfast, lunch, dinner, groceries, shopping, transport, bills, entertainment, health, education, other.

### 4. Budget and Remaining Amount

- Monthly budget per category.
- Monthly overall budget.
- Remaining amount formula must be consistent and tested:
  - `remaining = startingBalance + income - expenses - savingsReserved + adjustments`
- Planned spending preview:
  - Example: if the user enters a planned dinner amount, show what will remain after that dinner before saving.
- Warning levels:
  - Safe: below 70 percent of category budget.
  - Attention: 70 to 89 percent.
  - High: 90 to 99 percent.
  - Over budget: 100 percent or more.

### 5. Reports

- Month summary.
- Category breakdown chart or pie chart.
- Daily spending trend.
- Compare this month with last month.
- Compare this week with last week.
- Compare today with yesterday.
- Export CSV for user ownership of data.

### 6. AI Monthly Suggestions

- AI should analyze the user's own entered data and return helpful suggestions:
  - Overspending categories.
  - Safer monthly target.
  - Unusual spending.
  - Possible savings.
  - Simple next actions.
- AI must be explainable:
  - Show which categories caused the suggestion.
  - Avoid scary or judgmental wording.
- AI must not be presented as professional financial advice.
- Send only the minimum required summarized data to the backend.
- Users must be able to turn AI suggestions off.

### 7. Nearby Affordable Suggestions

- Ask location permission only when the user opens the nearby feature.
- Settings Nearby toggle is disabled and grey while foreground location permission is not granted.
- If permission is denied permanently, show a clear action to open phone app settings.
- Search nearby food or shopping places based on:
  - Distance.
  - Price level or available price estimate.
  - Rating.
  - Open now status.
  - User category preference.
- The wording must be honest:
  - Use "nearby affordable options" if only price level/rating data exists.
  - Use "cheapest" only if the provider gives reliable item-level prices.
- Include a manual refresh button.
- Include a privacy note before requesting location.

### 8. Localization

- Default language follows the phone language when the app opens unless the user has chosen a manual override.
- User can override in settings.
- All visible text must come from localization files.
- Initial languages:
  - English (`en`)
  - Japanese (`ja`)
  - Korean (`ko`)
  - Malay (`ms`)
  - Simplified Chinese (`zh-Hans`)
  - Traditional Chinese (`zh-Hant`)
- Add more languages later through locale JSON files.
- Use locale-aware number, currency, and date formatting.

### 9. Settings

- Language.
- Currency.
- Month start day.
- AI suggestions toggle.
- Nearby suggestions toggle.
- Nearby suggestions toggle must be disabled until location permission is granted.
- Data export.
- Data deletion/reset.
- Privacy policy link.
- App version.

## Design Direction

Use a "cute household helper" style:

- Warm but readable color palette: soft mint, coral, butter yellow, ink, and neutral surfaces.
- Rounded UI is okay, but keep cards at 8px radius or less unless the design system needs otherwise.
- Cute category icons and small illustrations can be used, but do not let decoration cover the numbers.
- Main dashboard must be easy to scan.
- Finance numbers should have strong contrast and clear hierarchy.
- No text overlap on small Android screens.
- Use bottom tabs for primary navigation.

Main tabs:

- Home
- Ledger
- Add
- Insights
- Settings

Nearby can live inside Insights or as a Home card in MVP, then become its own tab later if usage is high.

## Privacy and Safety Requirements

- Do not store secrets in the app bundle.
- Do not upload raw transactions unless needed and consented.
- Prefer summarized AI payloads, for example monthly category totals.
- Location is foreground-only and feature-specific.
- Allow data export and data deletion.
- Draft privacy policy before store submission.
- Store descriptions must disclose AI and location use.

## Out of Scope for MVP

- Bank account linking.
- Automatic receipt scanning.
- Real-time item price comparison across all nearby shops unless a reliable price provider is chosen.
- Subscriptions or paid plans.
- Multi-device sync unless the owner requests accounts/cloud sync.
