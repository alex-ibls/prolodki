#!/usr/bin/env bash
# Сборка и запуск через PM2. Запускать на сервере из любой директории:
#   scripts/deploy.sh
#   scripts/deploy.sh --no-pull
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

pull=1
for arg in "$@"; do
  case "$arg" in
    --pull) pull=1 ;;
    --no-pull) pull=0 ;;
    -h|--help)
      cat <<'EOF'
Usage: scripts/deploy.sh [--no-pull]

Забирает код из GitHub, ставит зависимости, применяет миграции из drizzle/,
собирает Next.js и запускает PM2. При каждом запуске процесс получает
актуальные переменные из .env.
Нужен файл .env в корне проекта. На сервере задают POSTGRESQL_*, без DATABASE_URL.

  --no-pull   не делать git pull --ff-only

Новые изменения схемы коммитят командой npm run db:generate.
Продакшен слушает порт 3004.

Переменные:
  HOSTNAME        адрес прослушивания, по умолчанию 0.0.0.0
  PM2_INSTANCES   число процессов, по умолчанию 1
  PM2_MAX_MEMORY  лимит памяти для перезапуска, по умолчанию 1G
EOF
      exit 0
      ;;
    *)
      echo "Неизвестный аргумент: $arg" >&2
      exit 1
      ;;
  esac
done

if [[ ! -f .env ]]; then
  echo "Нет .env. Скопируйте .env.example и заполните значения для сервера." >&2
  exit 1
fi

command -v node >/dev/null 2>&1 || { echo "Не найден node." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "Не найден npm." >&2; exit 1; }
command -v pm2 >/dev/null 2>&1 || { echo "Не найден pm2. Установите: npm install -g pm2" >&2; exit 1; }

if [[ "$pull" -eq 1 ]]; then
  command -v git >/dev/null 2>&1 || { echo "Не найден git." >&2; exit 1; }
  git pull --ff-only
fi

npm ci --include=dev
npm run db:migrate
npm run build

pm2 startOrReload ecosystem.config.cjs --update-env

pm2 save
echo "prolodki слушает ${HOSTNAME:-0.0.0.0}:3004"
