# Skyrim Alchemy Calculator

Web app and API for **The Elder Scrolls V: Skyrim Anniversary Edition** alchemy: enter ingredients and quantities, then see valid two- and three-ingredient brews ranked by estimated **gold value** (a practical proxy for alchemy XP, as described on [UESP: Alchemy](https://en.uesp.net/wiki/Skyrim:Alchemy)).

Data is scraped from UESP ([Ingredients](https://en.uesp.net/wiki/Skyrim:Ingredients), [Alchemy Effects](https://en.uesp.net/wiki/Skyrim:Alchemy_Effects)) into JSON, then loaded into a local **SQLite** database.

The **web** UI is **React 19** + **Vite 8** + **TypeScript**, styled with [**Radix Themes**](https://www.radix-ui.com/themes). HTTP data uses [**TanStack Query**](https://tanstack.com/query/latest) (**`@tanstack/react-query`**): debounced ingredient autocomplete is a **`useQuery`** keyed by the trimmed search string, and “Find potions” is a **`useMutation`** over `POST /api/potions`. A shared **`QueryClient`** is defined in [`web/src/query-client.ts`](web/src/query-client.ts) and wired in [`web/src/main.tsx`](web/src/main.tsx) via **`QueryClientProvider`**. **Vite 8** ships **[Rolldown](https://rolldown.rs/)** and **[Oxc](https://oxc.rs/)** as the unified bundler and transform pipeline (see the [Vite migration guide](https://vite.dev/guide/migration) for Rolldown-related behavior). [**React Compiler**](https://react.dev/learn/react-compiler) runs via **`@rolldown/plugin-babel`** and **`reactCompilerPreset()`** from **`@vitejs/plugin-react` v6** (no manual `useMemo` / `useCallback` required for typical UI code).

The repo uses **[Oxlint](https://oxc.rs/docs/guide/usage/linter)** with **[tsgolint](https://github.com/oxc-project/tsgolint)** (via [`oxlint-tsgolint`](https://www.npmjs.com/package/oxlint-tsgolint) and `oxlint --type-aware`) for type-aware rules on **typescript-go**, and **[Oxfmt](https://oxc.rs/docs/guide/usage/formatter)** at the workspace root (pinned in the root `package.json`), with config in [`.oxlintrc.json`](.oxlintrc.json) and [`.oxfmtrc.json`](.oxfmtrc.json). Type-only checking uses **`tsgo`** from [`@typescript/native-preview`](https://www.npmjs.com/package/@typescript/native-preview) instead of `tsc`. The web app sets **`jsx: "preserve"`** in [`web/tsconfig.json`](web/tsconfig.json) so `tsgo` matches Vite’s JSX pipeline (the native checker can otherwise fail to resolve `react/jsx-runtime` under `jsx: "react-jsx"`).

## Requirements

- **[Bun](https://bun.sh/)** — runs scrape/seed scripts, tests, and the API.
- **Node.js** matching [`.nvmrc`](.nvmrc) — use `nvm use` (or equivalent) for editor tooling and any commands you run with `node`/`npm` directly. Day-to-day scripts (`bun run build`, `typecheck`, `lint`, `fmt`, tests) run through **Bun** from the repo root.

## Setup

```bash
bun install
```

`postinstall` runs `bun run db:seed`, which creates [`data/alchemy.sqlite`](data/alchemy.sqlite) from [`data/ingredients.json`](data/ingredients.json) and [`data/effects.json`](data/effects.json). That file is gitignored; regenerate it anytime with `bun run db:seed`.

If you change UESP data or fix parsers, refresh artifacts and the database:

```bash
bun run scrape            # ingredients → data/ingredients.json + .raw.txt
bun run scrape:effects    # effects → data/effects.json
bun run db:seed           # rebuild data/alchemy.sqlite
```

## Development

Run API and Vite together (API on **3001**, web on **5173**; Vite proxies `/api` to the server):

```bash
bun run dev
```

Then open `http://localhost:5173`.

Run only the API:

```bash
bun run dev:server
```

Run only the frontend (expects the API on port 3001 for `/api`):

```bash
bun run dev:web
```

Override API port:

```bash
PORT=4000 bun run --cwd server start
```

(Adjust the Vite proxy in [`web/vite.config.ts`](web/vite.config.ts) if you use a non-default port without the proxy.)

## Linting and formatting

From the repo root (first-party paths under `web/`, `server/`, `scripts/`, and `tests/`, plus selected `package.json` / `tsconfig` files—see root `package.json` scripts). Run `bun run typecheck` before pushing when you change TypeScript.

```bash
bun run typecheck   # tsgo --noEmit (all TS projects)
bun run lint        # Oxlint + type-aware (tsgolint)
bun run lint:fix    # Oxlint with safe fixes
bun run fmt         # Oxfmt (write)
bun run fmt:check   # Oxfmt check only (e.g. CI)
```

## Scripts

| Script | Purpose |
|--------|---------|
| `bun run dev` | API + Vite in watch mode |
| `bun run build` | Production build of the web app (Vite 8 + React Compiler via `@rolldown/plugin-babel`) |
| `bun run test` | Bun unit tests (`tests/`) |
| `bun run typecheck` | [tsgo](https://github.com/microsoft/typescript-go) `--noEmit` over `web/`, `server/`, `scripts/`, and `tests/` tsconfigs |
| `bun run lint` | [Oxlint](https://oxc.rs/docs/guide/usage/linter) with `--type-aware` ([tsgolint](https://github.com/oxc-project/tsgolint)) on shared TypeScript/React sources |
| `bun run lint:fix` | Oxlint with `--type-aware` and `--fix` |
| `bun run fmt` | [Oxfmt](https://oxc.rs/docs/guide/usage/formatter) (format in place) |
| `bun run fmt:check` | Oxfmt `--check` (no writes) |
| `bun run scrape` | Fetch & parse ingredient tables from UESP |
| `bun run scrape:effects` | Fetch & parse alchemy effect stats from UESP |
| `bun run db:seed` | Recreate SQLite from JSON in `data/` |

## Testing

```bash
bun test
```

Coverage includes UESP HTML parsers, **alchemy math** (`effectGold`, `powerFactor`, perk flags), **potion ranking** (`expandInventory`, `rankPotions` against the seeded DB, sorting, truncation, potion vs poison labels), and **Damage Health** gold parity (UESP controlling ingredient priority and table values). Tests expect `data/alchemy.sqlite` to exist (run `bun install` or `bun run db:seed` first).

## API

- `GET /api/ingredients?q=` — substring search on normalized ingredient names (for autocomplete).
- `POST /api/potions` — JSON body:
  - `inventory`: `[{ "name": "Wheat", "count": 3 }, ...]` (names should match canonical ingredient names from search).
  - `params` (optional): `alchemySkill`, `fortifyAlchemy`, `alchemistPercent`, `hasPhysician`, `hasBenefactor`, `hasPoisoner`, `seekerOfShadowsPercent`.

Successful response: `{ "recipes": [...], "truncated": boolean }`. Each recipe includes `totalGold`, `mixtureKind` (`potion` \| `poison`), `dominantEffectKey`, `effects` with per-effect gold, and `ingredients` used.

On validation or inventory errors, the handler returns **HTTP 400** with `{ "error": string, "recipes": [], "truncated": false }`.

`GET /health` returns `{ "ok": true }`.

## Gold model and limitations

- **Most effects** use UESP-style `base_cost`, `base_mag`, `base_dur`, ingredient magnitude/duration multipliers, and the usual floor formula, with **PowerFactor** from skill, Fortify Alchemy, Alchemist, Physician, Benefactor / Poisoner (when mixing potions vs poisons), and Seeker of Shadows where applicable.

- **Damage Health** follows [UESP: Damage Health](https://en.uesp.net/wiki/Skyrim:Damage_Health) more closely: the controlling ingredient is chosen by **UESP priority** (then dominance as a tiebreaker), and gold uses that row’s pre-power magnitude, intrinsic duration for gold (including the 10s rule where the wiki notes it), and **gold mult**. Ingredients not in that table fall back to the generic path plus the row’s `gold_mult` from the database.

- Targets **Anniversary Edition** (base + DLC + Creation Club content reflected on the linked UESP pages). Values remain **approximate** versus the game engine (Purity, other special cases, and non–Damage Health effects without per-ingredient CK tables).

- Very large inventories may hit an internal combination cap (`MAX_RECIPES` in [`server/src/potion-engine.ts`](server/src/potion-engine.ts)); the API sets `truncated: true` when that happens.

## Project layout

| Path | Role |
|------|------|
| [`scripts/`](scripts/) | UESP scrapers and `seed-db.ts` |
| [`data/`](data/) | JSON sources; generated `alchemy.sqlite` |
| [`server/`](server/) | Bun HTTP server, SQLite access, potion enumeration and gold math (including [`server/src/damage-health-parity.ts`](server/src/damage-health-parity.ts) for Damage Health) |
| [`web/`](web/) | Vite 8 + React UI (TanStack Query, Radix Themes; `web/src/App.tsx` composes `web/src/components/`) |
| [`tests/`](tests/) | Bun tests for parsers, math, and potion engine |
| [`scripts/tsconfig.json`](scripts/tsconfig.json) | TypeScript project for root scrape/seed scripts (`tsgo` / editor) |
| [`tests/tsconfig.json`](tests/tsconfig.json) | TypeScript project for `tests/` (`tsgo` / editor) |
| [`web/tsconfig.scripts.json`](web/tsconfig.scripts.json) | TypeScript project for `web/scripts/` (e.g. React Compiler smoke check) |
| [`.oxlintrc.json`](.oxlintrc.json) | Oxlint config (plugins, React 19, `typeAware`, env overrides for web/server/scripts/tests) |
| [`.oxfmtrc.json`](.oxfmtrc.json) | Oxfmt config and ignore patterns |
