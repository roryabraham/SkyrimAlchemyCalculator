# Skyrim Alchemy Calculator

Web app and API for **The Elder Scrolls V: Skyrim Anniversary Edition** alchemy: enter ingredients and quantities, then see valid two- and three-ingredient brews ranked by estimated **gold value** (a practical proxy for alchemy XP, as described on [UESP: Alchemy](https://en.uesp.net/wiki/Skyrim:Alchemy)).

Data is scraped from UESP ([Ingredients](https://en.uesp.net/wiki/Skyrim:Ingredients), [Alchemy Effects](https://en.uesp.net/wiki/Skyrim:Alchemy_Effects)) into JSON, then loaded into a local **SQLite** database.

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
| `bun run build` | Production build of the web app |
| `bun run test` | Bun unit tests |
| `bun run scrape` | Fetch & parse ingredient tables from UESP |
| `bun run scrape:effects` | Fetch & parse alchemy effect stats from UESP |
| `bun run db:seed` | Recreate SQLite from JSON in `data/` |

## API

- `GET /api/ingredients?q=` — substring search on normalized ingredient names (for autocomplete).
- `POST /api/potions` — JSON body:
  - `inventory`: `[{ "name": "Wheat", "count": 3 }, ...]` (names should match canonical ingredient names from search).
  - `params` (optional): `alchemySkill`, `fortifyAlchemy`, `alchemistPercent`, `hasPhysician`, `hasBenefactor`, `hasPoisoner`, `seekerOfShadowsPercent`.

Response: `{ "recipes": [...], "truncated": boolean }`. Each recipe includes `totalGold`, `mixtureKind` (`potion` \| `poison`), `effects` with per-effect gold, and `ingredients` used.

`GET /health` returns `{ "ok": true }`.

## Scope and limitations

- Targets **Anniversary Edition** (base + DLC + Creation Club content reflected on the linked UESP pages). Gold and effect ordering are **approximate** versus the game engine (perks, Purity, some Creation Kit edge cases). Defaults skew to early-game alchemy unless you pass `params` on `/api/potions`.

- Very large inventories may hit an internal combination cap; the API sets `truncated: true` when that happens.

## Project layout

| Path | Role |
|------|------|
| [`scripts/`](scripts/) | UESP scrapers and `seed-db.ts` |
| [`data/`](data/) | JSON sources; generated `alchemy.sqlite` |
| [`server/`](server/) | Bun HTTP server, DB access, potion math |
| [`web/`](web/) | Vite + React + TypeScript UI |
