# Pactly Deployment

Production: **https://love.goon4.site**

## Architecture

```
                       [ Internet :443 ]
                              │
              ┌───────────────┴────────────────┐
              ▼                                ▼
  [ Nginx — love.goon4.site ]      [ Nginx — be-love.goon4.site ]
  │ TLS (Let's Encrypt)            │ TLS (Let's Encrypt)
  │                                │
  │ /assets/*  /favicon.ico        │ proxy_pass → 127.0.0.1:3001
  │   serve static from            │     pactly-backend.service
  │   packages/frontend/dist/client│     Bun + tRPC
  │                                │     endpoints:
  │ /  (everything else) ──►       │       /health
  │   127.0.0.1:3000               │       /trpc/<procedure>
  │     pactly-frontend.service    │       /storage/blob/<rootHash>
  │     Bun + TanStack Start SSR   │
  └────────────────────────────────┘
```

**URLs:**
- Frontend (browser-facing): `https://love.goon4.site`
- Backend (called by frontend, also externally reachable): `https://be-love.goon4.site`

**Server:** `root@84.247.148.107` (Ubuntu 24.04)
**Repo on server:** `/var/www/pactly`

## CI/CD

Push to `main` → GitHub Actions SSHes to the server → runs `scripts/deploy.sh`.

- Workflow: `.github/workflows/deploy.yml`
- Deploy script: `scripts/deploy.sh` (runs on the server)
- Triggers on changes to: `packages/**`, `package.json`, `bun.lock`, the deploy script, the workflow itself
- Manual run: GitHub → **Actions → Deploy → Run workflow**, or `gh workflow run Deploy --repo MoonCreate/pactly --ref main`

GitHub secrets (already configured):

| Secret | Value |
|---|---|
| `DEPLOY_HOST` | `84.247.148.107` |
| `DEPLOY_USER` | `root` |
| `DEPLOY_SSH_KEY` | dedicated ed25519 private key (paired pubkey is in server's `~/.ssh/authorized_keys`) |

The deploy script:
1. `bun install --frozen-lockfile`
2. `cd packages/contract && npx hardhat compile` — produces `artifacts/` consumed by the frontend
3. `cd packages/frontend && bun run build` — emits `dist/server` (SSR handler) and `dist/client` (static assets)
4. `systemctl restart pactly-backend pactly-frontend`
5. Hits `/health` and `/` to confirm the services came back

## Updating environment variables

Two `.env` files, both on the server:

### Backend — runtime, picked up on service restart
**Path:** `/var/www/pactly/packages/backend/.env`

Loaded by systemd via `EnvironmentFile=`. Edit and restart the service.

```bash
ssh root@84.247.148.107
nano /var/www/pactly/packages/backend/.env
systemctl restart pactly-backend
journalctl -u pactly-backend -n 20 --no-pager   # confirm clean startup
```

Keys currently set:
- `PORT=3001`, `CORS_ORIGIN=https://love.goon4.site`, `NODE_ENV=production`
- `DATABASE_URL` (Neon Postgres)
- `ZG_STORAGE_PRIVATE_KEY`, `ZG_COMPUTE_BASE_URL`, `ZG_COMPUTE_API_KEY`, `ZG_COMPUTE_MODEL`

### Frontend — **build-time**, baked into the bundle
**Path:** `/var/www/pactly/packages/frontend/.env`

Vite reads this at build time and inlines `VITE_*` values into the JS bundle. **A restart alone is not enough** — you must rebuild.

```bash
ssh root@84.247.148.107
nano /var/www/pactly/packages/frontend/.env
cd /var/www/pactly/packages/frontend && bun run build
systemctl restart pactly-frontend
```

Or just push a no-op commit / dispatch the workflow — the deploy script rebuilds:
```bash
gh workflow run Deploy --repo MoonCreate/pactly --ref main
```

Keys currently set:
- `VITE_PACTLY_API_URL=https://be-love.goon4.site` — backend URL the browser hits (no `/api` prefix; the tRPC client appends `/trpc` itself)
- `VITE_REOWN_PROJECT_ID` — Reown WalletConnect project ID

## Checking logs

systemd services log to journald.

```bash
# Tail backend (live)
journalctl -u pactly-backend -f

# Last N lines
journalctl -u pactly-backend -n 100 --no-pager
journalctl -u pactly-frontend -n 100 --no-pager

# Errors only across both services since boot
journalctl -u pactly-backend -u pactly-frontend -p err -b --no-pager

# Quick health snapshot
systemctl status pactly-backend pactly-frontend --no-pager

# nginx access / error logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## Manual deploy / rollback

```bash
# Manual deploy (same script CI runs)
ssh root@84.247.148.107
cd /var/www/pactly
git fetch origin main && git reset --hard origin/main
bash scripts/deploy.sh

# Rollback to a previous commit
git reset --hard <sha>
bash scripts/deploy.sh
```

## Common operations

```bash
systemctl restart pactly-backend pactly-frontend  # restart both
systemctl restart nginx                           # reload nginx fully
nginx -t && systemctl reload nginx                # config-only reload
certbot renew --dry-run                           # verify cert renewal
```

## Files & locations cheat sheet

| Thing | Path |
|---|---|
| Repo on server | `/var/www/pactly` |
| Backend env | `/var/www/pactly/packages/backend/.env` |
| Frontend env | `/var/www/pactly/packages/frontend/.env` |
| Frontend SSR launcher | `/var/www/pactly/packages/frontend/serve.ts` |
| Built static assets | `/var/www/pactly/packages/frontend/dist/client/` |
| systemd units | `/etc/systemd/system/pactly-{backend,frontend}.service` |
| Nginx site (frontend) | `/etc/nginx/sites-available/love.goon4.site` |
| Nginx site (backend) | `/etc/nginx/sites-available/be-love.goon4.site` |
| TLS cert (frontend) | `/etc/letsencrypt/live/love.goon4.site/` |
| TLS cert (backend) | `/etc/letsencrypt/live/be-love.goon4.site/` |
| Server's GitHub deploy key (read-only) | `/root/.ssh/id_ed25519` |

## Notes

- Frontend currently logs `notFoundError on route __root__` warnings — purely cosmetic, fix by adding a `notFoundComponent` to the root route.
- Backend listens on `0.0.0.0:3001` — reachable directly from the internet, bypassing nginx/HTTPS/CORS. Tighten by either binding to `127.0.0.1` in `packages/backend/src/server.ts` or enabling ufw with rules for 22/80/443 only.
