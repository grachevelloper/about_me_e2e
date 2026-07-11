#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
E2E_REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="${ENV_FILE:-$E2E_REPO_ROOT/.env}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +a
fi

for env_name in \
  RUN_ID \
  COMPOSE_PROJECT \
  E2E_HTTP_PORT \
  E2E_STARTUP_TIMEOUT_SECONDS \
  E2E_RUN_ID \
  E2E_DB_CONTAINER \
  APP_REPO_PATH \
  APP_REPO_URL \
  APP_REPO_REF \
  JWT_SECRET \
  REFRESH_SECRET \
  S3_ACCESS_KEY \
  S3_SECRET_ACCESS_KEY \
  S3_PUBLIC_DOMAIN; do
  if [[ "${!env_name-}" == "" ]]; then
    unset "$env_name"
  fi
done

TEMP_DIR=""
APP_DIR=""
PLAYWRIGHT_ARGS=("$@")
FRESH=false
REBUILD=false
DOWN_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --fresh)
      FRESH=true
      ;;
    --rebuild)
      REBUILD=true
      ;;
    --down)
      DOWN_ONLY=true
      ;;
  esac
done

if [[ -n "${CI:-}" ]]; then
  FRESH=true
fi

if [[ "$DOWN_ONLY" == "true" ]]; then
  FRESH=false
  REBUILD=false
fi

case "${PLAYWRIGHT_ARGS[0]-}" in
  ui)
    PLAYWRIGHT_ARGS=(--ui "${PLAYWRIGHT_ARGS[@]:1}")
    ;;
  headed)
    PLAYWRIGHT_ARGS=(--headed "${PLAYWRIGHT_ARGS[@]:1}")
    ;;
esac

FILTERED_PLAYWRIGHT_ARGS=()
for arg in "${PLAYWRIGHT_ARGS[@]+"${PLAYWRIGHT_ARGS[@]}"}"; do
  case "$arg" in
    --fresh|--rebuild|--down)
      ;;
    *)
      FILTERED_PLAYWRIGHT_ARGS+=("$arg")
      ;;
  esac
done
PLAYWRIGHT_ARGS=("${FILTERED_PLAYWRIGHT_ARGS[@]+"${FILTERED_PLAYWRIGHT_ARGS[@]}"}")

has_playwright_arg() {
  local expected=$1
  local arg

  for arg in "${PLAYWRIGHT_ARGS[@]+"${PLAYWRIGHT_ARGS[@]}"}"; do
    if [[ "$arg" == "$expected" ]]; then
      return 0
    fi
  done

  return 1
}

run_playwright() {
  local base_url=$1

  if ((${#PLAYWRIGHT_ARGS[@]})); then
    BASE_URL="$base_url" E2E_RUN_ID="$E2E_RUN_ID" E2E_DB_CONTAINER="$E2E_DB_CONTAINER" npx playwright test -c e2e/playwright.config.ts "${PLAYWRIGHT_ARGS[@]}"
    return
  fi

  BASE_URL="$base_url" E2E_RUN_ID="$E2E_RUN_ID" E2E_DB_CONTAINER="$E2E_DB_CONTAINER" npx playwright test -c e2e/playwright.config.ts
}

validate_playwright_args() {
  if has_playwright_arg --ui; then
    return
  fi

  if ((${#PLAYWRIGHT_ARGS[@]})); then
    BASE_URL="http://127.0.0.1:1" npx playwright test -c e2e/playwright.config.ts --list "${PLAYWRIGHT_ARGS[@]}" >/dev/null
    return
  fi

  BASE_URL="http://127.0.0.1:1" npx playwright test -c e2e/playwright.config.ts --list >/dev/null
}

find_free_port() {
  if command -v python3 >/dev/null 2>&1; then
    python3 - <<'PY'
import socket

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    s.bind(("127.0.0.1", 0))
    print(s.getsockname()[1])
PY
    return
  fi

  local port
  for _ in $(seq 1 50); do
    port=$((18080 + RANDOM % 10000))
    if ! nc -z 127.0.0.1 "$port" >/dev/null 2>&1; then
      echo "$port"
      return
    fi
  done

  echo "Failed to find a free HTTP port" >&2
  return 1
}

resolve_app_dir() {
  if [[ -n "${APP_REPO_PATH:-}" ]]; then
    cd "$APP_REPO_PATH"
    pwd
    return
  fi

  if [[ -n "${APP_REPO_URL:-}" ]]; then
    TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/about-me-e2e-app.XXXXXX")"
    git clone "$APP_REPO_URL" "$TEMP_DIR/app"
    cd "$TEMP_DIR/app"
    if [[ -n "${APP_REPO_REF:-}" ]]; then
      git checkout "$APP_REPO_REF"
    fi
    pwd
    return
  fi

  cd "$E2E_REPO_ROOT/../fullstack_exemplary_app"
  pwd
}

cleanup() {
  local exit_code=$?

  if [[ "$FRESH" == "true" && -n "$APP_DIR" ]]; then
    (
      cd "$APP_DIR"
      docker compose -p "$COMPOSE_PROJECT" -f docker-compose.e2e.yaml down -v --remove-orphans
    ) || true
  fi

  if [[ -n "$TEMP_DIR" ]]; then
    rm -rf "$TEMP_DIR"
  fi

  exit "$exit_code"
}

wait_for_app() {
  local url=$1
  local deadline=$((SECONDS + ${E2E_STARTUP_TIMEOUT_SECONDS:-120}))

  until curl -fsS "$url" >/dev/null 2>&1; do
    if (( SECONDS >= deadline )); then
      echo "Application did not become ready at $url" >&2
      docker compose -p "$COMPOSE_PROJECT" -f docker-compose.e2e.yaml ps >&2 || true
      docker compose -p "$COMPOSE_PROJECT" -f docker-compose.e2e.yaml logs --no-color --tail=200 >&2 || true
      return 1
    fi

    sleep 2
  done
}

trap cleanup EXIT INT TERM

if [[ "$DOWN_ONLY" != "true" ]]; then
  validate_playwright_args
fi

RUN_ID="${RUN_ID:-$(date +%Y%m%d%H%M%S)-$$-$RANDOM}"

if [[ "$FRESH" == "true" ]]; then
  COMPOSE_PROJECT="${COMPOSE_PROJECT:-about-me-e2e-${RUN_ID}}"
  E2E_HTTP_PORT="${E2E_HTTP_PORT:-$(find_free_port)}"
  REBUILD=true
else
  COMPOSE_PROJECT="${COMPOSE_PROJECT:-about-me-e2e-local}"
  E2E_HTTP_PORT="${E2E_HTTP_PORT:-18080}"
fi

E2E_RUN_ID="${E2E_RUN_ID:-$RUN_ID}"
E2E_DB_CONTAINER="${E2E_DB_CONTAINER:-${COMPOSE_PROJECT}-db-1}"

APP_DIR="$(resolve_app_dir)"

if [[ ! -f "$APP_DIR/docker-compose.e2e.yaml" ]]; then
  echo "docker-compose.e2e.yaml was not found in app repo: $APP_DIR" >&2
  exit 1
fi

if [[ "$DOWN_ONLY" == "true" ]]; then
  echo "Stopping E2E app: project=$COMPOSE_PROJECT app=$APP_DIR"
  (
    cd "$APP_DIR"
    docker compose -p "$COMPOSE_PROJECT" -f docker-compose.e2e.yaml down -v --remove-orphans
  )
  exit 0
fi

echo "Starting E2E app: project=$COMPOSE_PROJECT port=$E2E_HTTP_PORT app=$APP_DIR fresh=$FRESH rebuild=$REBUILD"

(
  cd "$APP_DIR"
  if [[ "$REBUILD" == "true" ]]; then
    E2E_HTTP_PORT="$E2E_HTTP_PORT" docker compose -p "$COMPOSE_PROJECT" -f docker-compose.e2e.yaml up --build -d
  else
    E2E_HTTP_PORT="$E2E_HTTP_PORT" docker compose -p "$COMPOSE_PROJECT" -f docker-compose.e2e.yaml up -d
  fi
  wait_for_app "http://localhost:$E2E_HTTP_PORT"
)

cd "$E2E_REPO_ROOT"
run_playwright "http://localhost:$E2E_HTTP_PORT"
