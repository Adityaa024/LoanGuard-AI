#!/usr/bin/env bash
# One-command Railway deploy for THE HIVE.
# Requires: `railway login` (interactive) OR RAILWAY_TOKEN exported / in .env.
set -euo pipefail
cd "$(dirname "$0")/.."

# Load .env if present (for RAILWAY_TOKEN / ANTHROPIC_API_KEY).
if [ -f .env ]; then set -a; . ./.env; set +a; fi

if ! railway whoami >/dev/null 2>&1; then
  echo "Not authenticated. Run 'railway login' or set RAILWAY_TOKEN in .env." >&2
  exit 1
fi

# Link or create the project/service if not linked yet.
if ! railway status >/dev/null 2>&1; then
  echo "No linked project. Creating one (the-hive)…"
  railway init -n the-hive
fi

# Push ANTHROPIC_API_KEY to the service env if we have one locally.
if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
  railway variables --set "ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY" >/dev/null 2>&1 || true
  railway variables --set "HIVE_MODEL=${HIVE_MODEL:-claude-opus-4-8}" >/dev/null 2>&1 || true
fi

echo "Deploying…"
railway up --detach
echo "Done. Fetch the public URL with: railway domain"
