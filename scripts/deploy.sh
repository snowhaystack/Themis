#!/usr/bin/env bash
# Deploy Themis su un VPS Vultr già preparato con setup-vultr.sh.
# Uso:
#   DEPLOY_HOST=ip-o-dominio DEPLOY_USER=deploy ./scripts/deploy.sh
#
# Variabili richieste:
#   DEPLOY_HOST       — IP o hostname del VPS
#   DEPLOY_USER       — utente SSH (default: deploy)
#   DEPLOY_PATH       — path remota dove vive l'app (default: /opt/themis)
#   GEMINI_API_KEY    — chiave Gemini (verrà scritta in .env remoto)
set -euo pipefail

DEPLOY_HOST="${DEPLOY_HOST:?manca DEPLOY_HOST}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/themis}"
GEMINI_API_KEY="${GEMINI_API_KEY:?manca GEMINI_API_KEY}"

echo "==> rsync sorgenti su ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}"
rsync -az --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  --exclude .env \
  --exclude .env.local \
  --exclude '*.log' \
  ./ "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/"

echo "==> scrive .env remoto"
ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "cat > ${DEPLOY_PATH}/.env <<EOF
GEMINI_API_KEY=${GEMINI_API_KEY}
REDIS_URL=redis://redis:6379
NODE_ENV=production
EOF
chmod 600 ${DEPLOY_PATH}/.env"

echo "==> build + restart container"
ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "cd ${DEPLOY_PATH} && docker compose --env-file .env up -d --build"

echo "==> attendi healthcheck"
ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "
for i in {1..30}; do
  if curl -fsS http://localhost:3000/api/health > /dev/null 2>&1; then
    echo '✅ app healthy'
    exit 0
  fi
  echo \"… attendo (\$i/30)\"
  sleep 2
done
echo '❌ healthcheck fallito'
docker compose -f ${DEPLOY_PATH}/docker-compose.yml logs --tail=80 app || true
exit 1
"

echo "🚀 Deploy completato — http://${DEPLOY_HOST}:3000"
