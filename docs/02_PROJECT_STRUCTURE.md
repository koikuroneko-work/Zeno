# Project Structure

Use a monorepo so the mobile app, backend, shared types, and documentation stay clean.

## Target Tree

```text
.
|-- README.md
|-- CLAUDE.md
|-- package.json
|-- pnpm-workspace.yaml
|-- docs/
|   |-- 01_PRODUCT_REQUIREMENTS.md
|   |-- 02_PROJECT_STRUCTURE.md
|   |-- 03_IMPLEMENTATION_PLAN.md
|   `-- 04_TESTING_AND_RELEASE.md
|-- apps/
|   |-- mobile/
|   |   |-- app/
|   |   |   |-- _layout.tsx
|   |   |   |-- (tabs)/
|   |   |   |   |-- index.tsx
|   |   |   |   |-- ledger.tsx
|   |   |   |   |-- add.tsx
|   |   |   |   |-- insights.tsx
|   |   |   |   `-- settings.tsx
|   |   |   |-- transactions/
|   |   |   |   |-- [id].tsx
|   |   |   |   `-- new.tsx
|   |   |   `-- modal.tsx
|   |   |-- assets/
|   |   |   |-- fonts/
|   |   |   |-- images/
|   |   |   `-- icons/
|   |   |-- src/
|   |   |   |-- app/
|   |   |   |   |-- providers/
|   |   |   |   `-- navigation/
|   |   |   |-- components/
|   |   |   |   |-- ui/
|   |   |   |   |-- charts/
|   |   |   |   `-- feedback/
|   |   |   |-- features/
|   |   |   |   |-- onboarding/
|   |   |   |   |-- dashboard/
|   |   |   |   |-- ledger/
|   |   |   |   |-- budgets/
|   |   |   |   |-- insights/
|   |   |   |   |-- nearby/
|   |   |   |   `-- settings/
|   |   |   |-- data/
|   |   |   |   |-- db/
|   |   |   |   |-- migrations/
|   |   |   |   `-- repositories/
|   |   |   |-- design/
|   |   |   |   |-- tokens.ts
|   |   |   |   |-- theme.ts
|   |   |   |   `-- icons.ts
|   |   |   |-- i18n/
|   |   |   |   |-- index.ts
|   |   |   |   `-- locales/
|   |   |   |       |-- en.json
|   |   |   |       |-- ja.json
|   |   |   |       |-- ko.json
|   |   |   |       |-- ms.json
|   |   |   |       |-- zh-Hans.json
|   |   |   |       `-- zh-Hant.json
|   |   |   |-- services/
|   |   |   |   |-- apiClient.ts
|   |   |   |   |-- aiService.ts
|   |   |   |   |-- nearbyService.ts
|   |   |   |   `-- permissionService.ts
|   |   |   |-- store/
|   |   |   |-- utils/
|   |   |   `-- test/
|   |   |-- app.config.ts
|   |   |-- eas.json
|   |   |-- package.json
|   |   `-- tsconfig.json
|   `-- api/
|       |-- src/
|       |   |-- index.ts
|       |   |-- config/
|       |   |-- routes/
|       |   |   |-- ai.routes.ts
|       |   |   `-- nearby.routes.ts
|       |   |-- services/
|       |   |   |-- ai/
|       |   |   |-- places/
|       |   |   `-- privacy/
|       |   |-- middleware/
|       |   `-- test/
|       |-- package.json
|       `-- tsconfig.json
|-- packages/
|   |-- shared/
|   |   |-- src/
|   |   |   |-- money/
|   |   |   |-- calculations/
|   |   |   |-- schemas/
|   |   |   |-- api/
|   |   |   `-- localization/
|   |   |-- package.json
|   |   `-- tsconfig.json
|   `-- config/
|       |-- eslint/
|       |-- prettier/
|       `-- tsconfig/
`-- scripts/
    |-- check-env.ps1
    `-- release-check.ps1
```

## Folder Responsibilities

### `apps/mobile/app`

Expo Router screens only. Keep screens thin. A screen can compose feature components and call feature hooks, but should not contain business calculations or API details.

### `apps/mobile/src/features`

Feature modules own UI, hooks, and feature-specific helpers. Each feature should expose a small public surface through an `index.ts` file when needed.

Recommended feature layout:

```text
features/ledger/
|-- components/
|-- hooks/
|-- services/
|-- types.ts
|-- validators.ts
`-- index.ts
```

### `apps/mobile/src/components/ui`

Reusable UI primitives: Button, IconButton, TextField, AmountInput, Card, Sheet, Tabs, EmptyState, Badge, ProgressBar.

These components must be localization-safe and responsive.

### `apps/mobile/src/design`

Design tokens and theme values. No hardcoded colors or spacing in feature screens unless there is a strong reason.

### `apps/mobile/src/data`

Local SQLite database setup, migrations, and repositories. UI components must not call SQLite directly.

### `apps/mobile/src/services`

Adapters for backend API, permissions, location, AI, nearby search, notifications, and platform capabilities.

### `apps/mobile/src/i18n`

Localization setup and JSON dictionaries. Every visible string must have a key.

### `apps/api`

Backend server. It protects AI provider keys and place API keys. It receives safe, minimal data from the mobile app and returns typed responses.

### `packages/shared`

Shared TypeScript utilities and schemas used by mobile and API:

- Money math.
- Budget calculations.
- Transaction schemas.
- AI request/response schemas.
- Nearby suggestion schemas.
- Localization key constants.

This package is important because it keeps Android and iOS behavior identical.

## Data Model Draft

Use stable IDs generated on device.

```text
Household
- id
- name
- defaultCurrency
- monthStartDay
- createdAt
- updatedAt

Member
- id
- householdId
- name
- color
- createdAt
- updatedAt

Account
- id
- householdId
- name
- type: cash | bank | ewallet | credit | other
- currency
- openingBalanceMinor
- archivedAt
- createdAt
- updatedAt

Category
- id
- householdId
- nameKey
- icon
- color
- type: expense | income
- parentId
- sortOrder
- archivedAt

Transaction
- id
- householdId
- accountId
- memberId
- categoryId
- type: expense | income | transfer | adjustment
- amountMinor
- currency
- occurredAt
- note
- merchantName
- locationLabel
- recurringRuleId
- createdAt
- updatedAt
- deletedAt

Budget
- id
- householdId
- categoryId
- period: monthly
- limitMinor
- currency
- startMonth
- endMonth
- createdAt
- updatedAt

RecurringRule
- id
- householdId
- frequency: daily | weekly | monthly | yearly
- interval
- nextRunAt
- endAt
- templateTransaction
- createdAt
- updatedAt

AiInsight
- id
- householdId
- month
- inputHash
- summary
- suggestionsJson
- createdAt

AppSetting
- key
- value
- updatedAt
```

## Money Rules

- Store money in minor units as integers, for example cents.
- Do not use floating point for stored money.
- Keep currency on every account, budget, and transaction.
- Add multi-currency conversion later only after a reliable exchange-rate source is chosen.
- Use locale-aware formatting in UI.

## API Boundary

Mobile should call backend endpoints like:

```text
POST /v1/ai/monthly-insights
POST /v1/nearby/affordable-options
GET /v1/health
```

All request and response payloads must be validated with shared Zod schemas.

## Platform Parity Rules

- Shared logic goes in `packages/shared` or non-platform-specific mobile files.
- UI should use React Native primitives/components that work on both platforms.
- Permissions must handle both Android and iOS messages.
- Any Android-only feature must be disabled or matched on iOS before release.
- Keep a parity checklist in PR notes or task summaries.

