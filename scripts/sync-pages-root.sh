#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cp "$ROOT_DIR/public/index.html" "$ROOT_DIR/index.html"
cp "$ROOT_DIR/public/app.js" "$ROOT_DIR/app.js"
cp "$ROOT_DIR/public/styles.css" "$ROOT_DIR/styles.css"

if [[ ! -f "$ROOT_DIR/.nojekyll" ]]; then
  : > "$ROOT_DIR/.nojekyll"
fi

echo "Root Pages files synchronized from public/."
