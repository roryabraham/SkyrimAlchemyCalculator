# Skyrim Alchemy Calculator

Web app and API for **The Elder Scrolls V: Skyrim Anniversary Edition** alchemy: enter ingredients and quantities, then see valid two- and three-ingredient brews ranked by estimated **gold value** (a practical proxy for alchemy XP, as described on [UESP: Alchemy](https://en.uesp.net/wiki/Skyrim:Alchemy)).

Data is scraped from UESP ([Ingredients](https://en.uesp.net/wiki/Skyrim:Ingredients), [Alchemy Effects](https://en.uesp.net/wiki/Skyrim:Alchemy_Effects)) into JSON, then loaded into a local **SQLite** database.

The **web** UI is **React 19** + **Vite 6** + **TypeScript**, styled with [**Radix Themes**](https://www.radix-ui.com/themes), with [**React Compiler**](https://react.dev/learn/react-compiler) enabled via `babel-plugin-react-compiler` in the Vite React Babel pipeline (no manual `useMemo` / `useCallback` required for typical UI code).

## Requirements

- **[Bun](https://bun.sh/)** — runs scrape/seed scripts, tests, and the API.
- **Node.js** matching [`.nvmrc`](.nvmrc) — used by Vite for the frontend build (e.g. `nvm use` before editor tooling or `npm`/`vite` if you run them directly).

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

## Scripts

| Script | Purpose |
|--------|---------|
| `bun run dev` | API + Vite in watch mode |
| `bun run build` | Production build of the web app (Vite + React Compiler) |
| `bun run test` | Bun unit tests (`tests/`) |
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
| [`web/`](web/) | Vite + React UI (`web/src/App.tsx` composes `web/src/components/`) |
| [`tests/`](tests/) | Bun tests for parsers, math, and potion engine |
