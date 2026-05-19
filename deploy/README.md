# Deploy Skyrim Alchemy Calculator

The app is one **Bun** process: JSON API under `/api/*` and the production **Vite** build from `web/dist` when `STATIC_ROOT` is set. The canonical runtime is the **root `Dockerfile`**.

## Local Docker (build + run)

Prerequisites: [Docker](https://docs.docker.com/get-docker/) with Compose v2.

From the **repository root**:

```bash
docker compose -f deploy/docker-compose.local.yml up --build
```

Or: `bun run docker:local`

Then open **http://localhost:3000** (override the host port with `LOCAL_PORT=3001 docker compose ...` if 3000 is busy).

This builds the root **`Dockerfile`** and runs a single **app** container (no Caddy). The bundled `data/alchemy.sqlite` inside the image is used unless you extend the compose file with a volume and `ALCHEMY_SQLITE_PATH`.

To run the **GHCR + Caddy** stack on your machine instead, copy `deploy/.env.example` to `deploy/.env`, set `APP_IMAGE`, `DATA_DIR`, and `SITE_ADDRESS`, then from `deploy/` run `docker compose up --build` (see below). You may need `tls internal` in a copy of `Caddyfile` when using `localhost` as `SITE_ADDRESS`.

## Railway (recommended)

1. Create a project at [railway.com](https://railway.com) and **Deploy from GitHub** using this repository.
2. Railway should detect the **root `Dockerfile`**. Set the **root directory** to the repo root if prompted.
3. Under **Variables**, set:
   - `STATIC_ROOT` = `/app/web/dist` (matches the image; Railway can override if you change the Dockerfile layout).
   - `ALCHEMY_SQLITE_PATH` = `/data/alchemy.sqlite`
4. Add a **Volume**: mount path **`/data`** (so the SQLite file survives redeploys).
5. **Custom domain**: in Railway, add your domain and follow their DNS instructions. At **Porkbun** (or your DNS host), create the **CNAME** or **TXT** records Railway shows. TLS is handled by Railway.
6. **Usage / cost**: see [Railway pricing](https://docs.railway.com/reference/pricing) for current free credits and plan limits.

On first boot with an empty volume, the server **copies** the bundled `data/alchemy.sqlite` from the image into `ALCHEMY_SQLITE_PATH`, then opens it read-only.

## Optional: GHCR image + Docker Compose (self-hosted)

If you prefer to pull a prebuilt image (e.g. from CI) instead of having Railway build from Git:

1. Ensure [`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml) runs on `main` (or trigger **workflow_dispatch**). Images are pushed to **GHCR** as `ghcr.io/<owner>/<repo>:latest` (lowercase path).
2. On a Linux host with Docker and Compose v2, copy `deploy/.env.example` to `deploy/.env` and set `APP_IMAGE`, `DATA_DIR` (host path for SQLite), and `SITE_ADDRESS`.
3. From `deploy/`: `docker compose up -d` (or `./up.sh` after `chmod +x up.sh`).

**Caddy** terminates HTTPS with Let’s Encrypt using `SITE_ADDRESS`. For local experiments you can use `SITE_ADDRESS=localhost`; use `tls internal` in Caddy only if you adjust the Caddyfile for that case.

## Environment reference

| Variable                   | Purpose                                                                                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                     | HTTP listen port (Railway sets this automatically).                                                                                                                       |
| `STATIC_ROOT`              | Absolute path to `web/dist` inside the container (`/app/web/dist` in the Dockerfile).                                                                                     |
| `ALCHEMY_SQLITE_PATH`      | Absolute path to the live SQLite file (e.g. `/data/alchemy.sqlite` on a Railway volume). When set and the file is missing, it is copied from the bundled DB in the image. |
| `INGREDIENT_ICON_BASE_URL` | Optional CDN origin for ingredient icons (see server code).                                                                                                               |

## Ingredient icons

Icons live under `web/public/` and are copied into `web/dist` at build time. If you use a CDN, set `INGREDIENT_ICON_BASE_URL` on the server to match.
