# Deploy Skyrim Alchemy Calculator

Production runs on **Oracle Cloud Infrastructure (OCI) Always Free**: an Ampere VM, Docker Compose, Caddy (HTTPS), and a persistent directory for SQLite. The runtime image is the root [`Dockerfile`](../Dockerfile), published to GHCR by [`.github/workflows/docker-publish.yml`](../.github/workflows/docker-publish.yml).

Local development can use [`docker-compose.local.yml`](docker-compose.local.yml) (`bun run docker:local` from the repo root).

---

## Oracle Cloud Always Free

Use **Always Free** resources only ([limits](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)): e.g. Ampere A1 within the free CPU/RAM caps and block storage within the free allowance.

### 1. Create the VM

1. Sign up at [Oracle Cloud](https://www.oracle.com/cloud/free/).
2. Create an **Ampere A1** compute instance (Ubuntu 22.04 or 24.04) in your **home region**.
3. Allow **ingress** on **80** and **443** (security list or network security group).
4. Note the instance **public IP**.

### 2. Install Docker

```bash
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2
sudo usermod -aG docker "$USER"
```

Log out and back in so `docker` works without `sudo`.

### 3. Persistent data directory

```bash
sudo mkdir -p /var/lib/skyrim-alchemy/data
sudo chown "$USER:$USER" /var/lib/skyrim-alchemy/data
```

### 4. Configure and start

On the VM, clone this repo (or copy the `deploy/` directory). From `deploy/`:

```bash
cp .env.example .env
```

Edit `.env`:

| Variable       | Example                                              |
| -------------- | ---------------------------------------------------- |
| `APP_IMAGE`    | `ghcr.io/roryabraham/skyrimalchemycalculator:latest` |
| `DATA_DIR`     | `/var/lib/skyrim-alchemy/data`                       |
| `SITE_ADDRESS` | `alchemy.yourdomain.com`                             |

`APP_IMAGE` must exist on GHCR (push to `main` runs **Docker publish**, or trigger that workflow manually).

```bash
docker compose pull
docker compose up -d
```

Or: `chmod +x up.sh && ./up.sh`

Caddy requests **Let’s Encrypt** certificates for `SITE_ADDRESS`. At **Porkbun** (or your DNS provider), point **A** and/or **AAAA** records for that hostname to the VM’s public IP.

### 5. Verify

- `https://alchemy.yourdomain.com/health` → `{"ok":true}`
- `https://alchemy.yourdomain.com/` → web UI

### 6. Deploy updates

After a new image is on GHCR:

```bash
cd deploy && docker compose pull && docker compose up -d
```

On first boot with an empty `DATA_DIR`, the app copies `data/alchemy.sqlite` from the image to `/data/alchemy.sqlite` (see `ALCHEMY_SQLITE_PATH` in compose).

---

## Local Docker (build + run)

Requires [Docker](https://docs.docker.com/get-docker/) with Compose v2.

From the **repository root**:

```bash
docker compose -f deploy/docker-compose.local.yml up --build
```

Or: `bun run docker:local`

Open **http://localhost:3000** (`LOCAL_PORT=3001` if port 3000 is in use). Uses the bundled SQLite file inside the image (no volume).

---

## Environment reference

| Variable                   | Purpose                                                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `PORT`                     | HTTP port inside the app container (`3000` in compose; Dockerfile default).                                |
| `STATIC_ROOT`              | Path to `web/dist` in the container (`/app/web/dist`).                                                     |
| `ALCHEMY_SQLITE_PATH`      | Live SQLite file (compose sets `/data/alchemy.sqlite`). If missing on startup, copied from the image once. |
| `INGREDIENT_ICON_BASE_URL` | Optional CDN origin for ingredient icons.                                                                  |

## Ingredient icons

Icons under `web/public/` are copied into `web/dist` at image build time. Set `INGREDIENT_ICON_BASE_URL` if icons are served from a CDN.
