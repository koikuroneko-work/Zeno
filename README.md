# Zeno — Household Account Book

Zeno is a cross-platform (Android + iOS) household account book built with Expo
React Native and a small backend API. It focuses on fast spending entry,
remaining-balance calculations, monthly insights, multilingual settings, AI
usage suggestions, and nearby affordable food/item suggestions — all working
offline for the core flows.

> Secrets never live in the mobile app. AI provider keys, map/place keys, and
> store credentials stay on the backend and are read from environment variables.

## Features

- **Ledger** — quick spending entry with categories and an offline-first store.
- **Remaining balance** — monthly remaining balance and category budget math in a
  single shared calculation engine (unit-tested).
- **Insights** — monthly charts and comparison statements.
- **AI suggestions** — personalized advice via the backend (safe mock when no key
  is configured).
- **Nearby** — estimated low-cost nearby options; location permission is only
  requested when the feature is opened.
- **Localization** — 14+ languages, defaulting to the phone language with an
  in-app override.
- **Currency** — defaults from device region signal (e.g. MYR for Malaysia) with
  an in-app override.

## Monorepo layout

```
apps/
  mobile/     Expo React Native app (Expo Router, TypeScript)
  api/        Node.js + Fastify backend (AI + nearby routes)
packages/
  shared/     Zod schemas, money/calculation utils, API contracts, i18n keys
  config/     Shared TypeScript config
docs/         Product, structure, implementation, testing & release docs
```

## Tech stack

- **Mobile**: Expo React Native, Expo Router, TypeScript, Zustand, TanStack
  Query, `expo-sqlite`, React Hook Form + Zod, i18next.
- **Backend**: Node.js + Fastify (TypeScript).
- **Shared**: Zod schemas + money/calculation utilities.
- **Tooling**: pnpm workspaces, Jest, EAS Build/Submit.

## Getting started

```bash
pnpm install

pnpm dev:api        # start the backend API
pnpm dev:mobile     # start Metro / the mobile app
```

### Android on a physical device (USB debugging)

The current testing target is a development build installed on a physical device
over USB debugging (not Expo Go). The project ships a Gradle 8.10.2 wrapper and
targets JDK 17.

```bash
pnpm adb:devices    # confirm the phone is connected
pnpm adb:reverse    # adb reverse tcp:8081 + tcp:3000
pnpm android:device # build & install the dev client
```

### Useful scripts

| Command            | Description                          |
| ------------------ | ------------------------------------ |
| `pnpm build`       | Build all workspaces                 |
| `pnpm test`        | Run all tests                        |
| `pnpm typecheck`   | Type-check all workspaces            |
| `pnpm lint`        | Lint all workspaces                  |

## Environment variables

The backend reads secrets from the environment. Copy these into a `.env` file in
`apps/api/` (never commit it):

| Variable            | Purpose                                            |
| ------------------- | -------------------------------------------------- |
| `ANTHROPIC_API_KEY` | Enables real AI advice; a safe mock is used if unset |

## Documentation

- [CLAUDE.md](CLAUDE.md) — build instructions and non-negotiable rules
- [docs/01_PRODUCT_REQUIREMENTS.md](docs/01_PRODUCT_REQUIREMENTS.md)
- [docs/02_PROJECT_STRUCTURE.md](docs/02_PROJECT_STRUCTURE.md)
- [docs/03_IMPLEMENTATION_PLAN.md](docs/03_IMPLEMENTATION_PLAN.md)
- [docs/04_TESTING_AND_RELEASE.md](docs/04_TESTING_AND_RELEASE.md)

## License

Released under the [MIT License](LICENSE).
