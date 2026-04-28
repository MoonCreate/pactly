#!/usr/bin/env bash
# Deploy script run on the production server (84.247.148.107) by GitHub Actions.
# Pull is performed by the workflow before this script runs.
set -euo pipefail

cd /var/www/pactly

echo "==> HEAD: $(git rev-parse --short HEAD)  ($(git log -1 --pretty=%s))"

echo "==> bun install"
bun install --frozen-lockfile

echo "==> compiling contracts"
(cd packages/contract && npx --yes hardhat compile)

echo "==> building frontend"
(cd packages/frontend && bun run build)

echo "==> restarting services"
systemctl restart pactly-backend pactly-frontend

# Wait briefly and confirm both came back
sleep 2
systemctl is-active pactly-backend pactly-frontend

echo "==> health check"
curl -fsS --max-time 10 http://127.0.0.1:3001/health
echo
curl -fsS -o /dev/null --max-time 10 -w "frontend SSR: HTTP %{http_code}\n" http://127.0.0.1:3000/

echo "==> deploy complete"
