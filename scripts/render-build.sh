#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

echo "==> Installing Python dependencies"
pip install --upgrade pip
pip install -r "$BACKEND/requirements.txt"

echo "==> Building frontend"
cd "$FRONTEND"
npm install
export VITE_API_URL=""
npm run build

echo "==> Copying frontend to backend/static"
rm -rf "$BACKEND/static"
mkdir -p "$BACKEND/static"
cp -r dist/. "$BACKEND/static/"

test -f "$BACKEND/static/index.html"
echo "==> Build OK ($(wc -c < "$BACKEND/static/index.html") bytes index.html)"
