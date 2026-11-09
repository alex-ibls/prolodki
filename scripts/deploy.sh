#!/usr/bin/env bash
# Сборка и запуск через PM2. Запускать на сервере из любой директории:
#   scripts/deploy.sh
#   scripts/deploy.sh --pull
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

pull=0
for arg in "$@"; do
  case "$arg" in
    --pull) pull=1 ;;
    -h|--help)
      cat <<'EOF'
Usage: scripts/deploy.sh [--pull]

Ставит зависимости, собирает Next.js и запускает или перезагружает PM2-процесс prolodki.
Нужен файл .env в корне проекта. Схему базы скрипт не меняет.

  --pull   git pull --ff-only перед установкой

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
  git pull --ff-only
fi

npm ci --include=dev
npm run build

if pm2 describe prolodki >/dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --update-env
else
  pm2 start ecosystem.config.cjs
fi

pm2 save
echo "prolodki слушает ${HOSTNAME:-0.0.0.0}:3004"
