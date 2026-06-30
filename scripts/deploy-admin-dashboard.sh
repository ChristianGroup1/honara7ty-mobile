#!/usr/bin/env bash
# Deploy admin-dashboard to Vercel (preview or production).
#
# First-time setup:
#   1. npm i -g vercel   (optional — script uses npx if missing)
#   2. ./scripts/deploy-admin-dashboard.sh --setup
#   3. Add env vars in Vercel dashboard (see admin-dashboard/.env.example)
#
# For GitHub auto-deploy, add these repository secrets:
#   VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID
#   Run --print-ci-secrets after --setup to print org/project IDs from .vercel/project.json

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/admin-dashboard"
VERCEL_BIN="${VERCEL_BIN:-}"

resolve_vercel() {
  if [[ -n "$VERCEL_BIN" ]]; then
    echo "$VERCEL_BIN"
    return
  fi
  if command -v vercel >/dev/null 2>&1; then
    command -v vercel
    return
  fi
  echo "npx --yes vercel@latest"
}

usage() {
  cat <<'EOF'
Usage: ./scripts/deploy-admin-dashboard.sh [options]

Options:
  --prod              Deploy to production (default: preview)
  --setup             Link this folder to a Vercel project (first time only)
  --print-ci-secrets  Print VERCEL_ORG_ID / VERCEL_PROJECT_ID for GitHub Actions
  --skip-install      Skip npm ci when node_modules is missing
  -h, --help          Show this help

Examples:
  ./scripts/deploy-admin-dashboard.sh --setup
  ./scripts/deploy-admin-dashboard.sh
  ./scripts/deploy-admin-dashboard.sh --prod
EOF
}

MODE="preview"
RUN_SETUP=false
PRINT_SECRETS=false
SKIP_INSTALL=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prod)
      MODE="production"
      shift
      ;;
    --setup)
      RUN_SETUP=true
      shift
      ;;
    --print-ci-secrets)
      PRINT_SECRETS=true
      shift
      ;;
    --skip-install)
      SKIP_INSTALL=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ ! -d "$APP_DIR" ]]; then
  echo "admin-dashboard directory not found at: $APP_DIR" >&2
  exit 1
fi

cd "$APP_DIR"

VERCEL="$(resolve_vercel)"

print_ci_secrets() {
  local project_file="$APP_DIR/.vercel/project.json"
  if [[ ! -f "$project_file" ]]; then
    echo "Missing $project_file — run: ./scripts/deploy-admin-dashboard.sh --setup" >&2
    exit 1
  fi

  python3 - <<'PY' "$project_file"
import json, sys
data = json.load(open(sys.argv[1]))
print("Add these GitHub repository secrets for auto-deploy:")
print(f"VERCEL_ORG_ID={data.get('orgId', '')}")
print(f"VERCEL_PROJECT_ID={data.get('projectId', '')}")
print("")
print("Also create a Vercel token: https://vercel.com/account/tokens")
print("GitHub secret name: VERCEL_TOKEN")
PY
}

if [[ "$PRINT_SECRETS" == true ]]; then
  print_ci_secrets
  exit 0
fi

if [[ "$RUN_SETUP" == true ]]; then
  echo "Linking admin-dashboard to Vercel..."
  eval "$VERCEL link"
  echo ""
  print_ci_secrets
  echo ""
  echo "Set environment variables in Vercel (Production + Preview):"
  echo "  NEXT_PUBLIC_SUPABASE_URL"
  echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY"
  exit 0
fi

if [[ "$SKIP_INSTALL" == false && ! -d node_modules ]]; then
  echo "Installing dependencies..."
  npm ci
fi

echo "Running local build check..."
npm run build

DEPLOY_ARGS=(deploy --yes)
if [[ "$MODE" == "production" ]]; then
  DEPLOY_ARGS+=(--prod)
  echo "Deploying admin-dashboard to Vercel production..."
else
  echo "Deploying admin-dashboard to Vercel preview..."
fi

if [[ -n "${VERCEL_TOKEN:-}" ]]; then
  DEPLOY_ARGS+=(--token "$VERCEL_TOKEN")
fi

eval "$VERCEL" "${DEPLOY_ARGS[@]}"


echo "Done."


