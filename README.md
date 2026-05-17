# Skyrim Alchemy Calculator

Figure out what to brew from the ingredients you have—or what to buy—without tabbing out of a spreadsheet.

This project is a **Skyrim alchemy helper** aimed at **Anniversary Edition–style** ingredient lists (base game + DLC + Creation Club entries that appear on UESP). You enter **which ingredients you have and how many**, and it lists every **valid 2- and 3-ingredient** combination from that pool that shares at least one effect. Results are **sorted by total estimated gold**, which tracks [UESP’s alchemy write-up](https://en.uesp.net/wiki/Skyrim:Alchemy) as a practical stand-in for “how good is this for leveling / selling,” rather than mirroring every in-session septim total. Treat numbers as **guides**, especially if you use unusual mods or perks.

---

## How to use it

1. **Run the app** (see [Quick start](#quick-start)) and open the local URL in your browser (Vite prints the port; **5173** is default if it’s free).
2. **Build your bag:** Each row is one ingredient. Type in the search box, pick a name from the list, then set **Qty** to how many of that ingredient you want counted. Use **Add ingredient** for more rows. You need **at least two ingredients** in the bag (by total count) before **Find potions** turns on.
3. **Optional — Alchemy settings:** Skill, Fortify Alchemy, Alchemist, Physician, Benefactor / Poisoner, Seeker of Shadows, etc. change how **gold** is estimated so you can match your character.
4. **Find potions:** The **Best brews** section lists recipes that work, highest **total gold** first. Each card shows **potion** vs **poison**, the ingredient mix, per-effect gold, and a **dominant** effect used for the mixture label. If you throw in a huge inventory, you may see a **truncated** warning when the tool stops after an internal cap.

---

## Quick start

```bash
bun install          # installs deps and seeds data/alchemy.sqlite from JSON
bun run dev        # Bun API + Vite UI; open the URL Vite shows (proxies /api → API)
```

- API listens on **3001** by default; the web app talks to **`/api`** on the same origin in dev.
- Only the API: `bun run dev:server`. Only the UI (API must still be reachable): `bun run dev:web`.
- Custom API port: `PORT=4000 bun run --cwd server start` — point the Vite [`web/vite.config.ts`](web/vite.config.ts) proxy at the same host/port if the UI should call a non-default API in dev.
- Rebuild the DB from checked-in JSON: `bun run db:seed`. After changing UESP parsers or pages: `bun run scrape` and/or `bun run scrape:effects`, then `bun run db:seed`.
- **Ingredient icons:** `bun run fetch:ingredient-icons` downloads UESP wiki icons into `web/public/ingredient-icons/` and refreshes `data/ingredient-icons.json` (keys match `ingredients.name_normalized` in the DB). Run after `scrape` when ingredient names change. The script **resumes**: existing manifest entries with a non-empty local file skip UESP; it **persists the manifest after each success** and uses **exponential backoff** on timeouts / 429 / 5xx. One-shot full pipeline: `bun run data:refresh` (scrape → icons → seed). Commit the PNGs if you want a clone-and-build workflow; otherwise gitignore that folder and run the fetch after clone. Optional env: **`INGREDIENT_ICON_FETCH_CONCURRENCY`** (default **`4`**, max **`8`**) on the fetch script; **`INGREDIENT_ICON_BASE_URL`** on the API when icons are hosted on a CDN (no trailing slash).

---

## Data sources and attribution

Names, effects, magnitudes, durations, and related stats are scraped from **The Unofficial Elder Scrolls Pages** (UESP):

- [Skyrim:Ingredients](https://en.uesp.net/wiki/Skyrim:Ingredients)
- [Skyrim:Alchemy_Effects](https://en.uesp.net/wiki/Skyrim:Alchemy_Effects)

Wiki content is under [CC BY-SA 2.5](https://creativecommons.org/licenses/by-sa/2.5/); see [UESPWiki:Copyright and Ownership](https://en.uesp.net/wiki/UESPWiki:Copyright_and_Ownership). Ingredient **images** copied from UESP fall under the same license. *The Elder Scrolls* and related marks belong to ZeniMax Media Inc. This is an independent fan project.

---

## For developers

**Requirements:** [Bun](https://bun.sh/) for scripts, API, and tests. **Node.js** per [`.nvmrc`](.nvmrc) if your editor or tooling expects it.

**Quality checks** (from repo root): `bun run typecheck`, `bun run lint`, `bun run fmt` (see root [`package.json`](package.json) for `fmt:check` and `lint:fix`).

**Tests:** `bun test` (expects `data/alchemy.sqlite` after `bun install` or `bun run db:seed`).

**Production UI build:** `bun run build`.

### Common scripts

| Script | Purpose |
|--------|---------|
| `bun run dev` | API + Vite (watch) |
| `bun run build` | Production build of the web app |
| `bun run test` | Bun unit tests |
| `bun run typecheck` | Typecheck all TS projects (`tsgo`) |
| `bun run lint` / `lint:fix` | Oxlint (+ type-aware rules) |
| `bun run fmt` / `fmt:check` | Oxfmt |
| `bun run scrape` / `scrape:effects` | Refresh UESP JSON artifacts |
| `bun run fetch:ingredient-icons` | Download ingredient PNGs into `web/public/ingredient-icons/` + manifest |
| `bun run data:refresh` | `scrape` → `fetch:ingredient-icons` → `db:seed` |
| `bun run db:seed` | Rebuild `data/alchemy.sqlite` from JSON |

### HTTP API (for tools or custom frontends)

- `GET /api/ingredients?q=` — substring search for autocomplete. Each hit includes `iconUrl` (`string | null`) when `data/ingredient-icons.json` + static files are present.
- `POST /api/potions` — body: `{ "inventory": [{ "name": "…", "count": n }], "params": { …optional alchemy fields } }`. Success: `{ "recipes", "truncated" }`. Each recipe `ingredients[]` entry includes `iconUrl` when available. Validation / bad inventory: **400** with `{ "error", "recipes": [], "truncated": false }`.
- `GET /health` — `{ "ok": true }`.

### Accuracy note

Gold uses UESP-style formulas (including skill and perk knobs you send in `params`). **Damage Health** is modeled a bit more tightly to [UESP: Damage Health](https://en.uesp.net/wiki/Skyrim:Damage_Health) (which ingredient “wins” and how duration is counted for gold); other effects rely on the shared effect table plus ingredient multipliers. The implementation targets UESP-aligned behavior; **Purity**, some Creation Club edge cases, and full Creation Kit parity are outside what this repo tries to match.

### Repository layout

| Path | Role |
|------|------|
| [`web/`](web/) | React UI (Vite); static assets under `web/public/` (e.g. `ingredient-icons/`) |
| [`server/`](server/) | Bun HTTP API + potion / gold logic |
| [`data/`](data/) | JSON sources; `ingredient-icons.json` manifest; generated `alchemy.sqlite` (gitignored) |
| [`scripts/`](scripts/) | Scrapers and DB seed |
| [`libs/`](libs/) | Shared TypeScript (e.g. ingredient name keys, alchemy `params` shape) used by `web/`, `server/`, and `scripts/` |
| [`tests/`](tests/) | Automated tests |
