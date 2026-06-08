#!/usr/bin/env sh
set -e
ROOT="$(CDPATH= cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/resolve-node.sh
. "$ROOT/scripts/resolve-node.sh"
echo "Using $NODE_BIN ($("$NODE_BIN" -p 'process.version + " " + process.arch'))"

# Block only dev-related locks (ignore Spotlight mdworker, etc.).
if command -v lsof >/dev/null 2>&1 && [ -d node_modules ]; then
  BLOCKERS=$(lsof +D "$ROOT/node_modules" 2>/dev/null | awk 'NR>1 {print $1}' | sort -u | grep -E '^(node|next|webpack|tsserver|vitest)$' || true)
  if [ -n "$BLOCKERS" ]; then
    echo "Stop these before reinstalling: $BLOCKERS" >&2
    echo "Usually: quit npm run dev, then npm run reinstall" >&2
    exit 1
  fi
fi

# Rename aside so install can proceed even if deletion is slow (macOS file locks).
if [ -d node_modules ]; then
  TRASH="node_modules._trash.$$"
  echo "Moving node_modules → $TRASH …" >&2
  chmod -R u+w node_modules 2>/dev/null || true
  mv node_modules "$TRASH"
  (rm -rf "$TRASH" &) 2>/dev/null || true
fi

# Remove stale trash from prior failed installs.
for old in node_modules._trash.*; do
  [ -e "$old" ] || continue
  rm -rf "$old" 2>/dev/null &
done

if [ -f package-lock.json ]; then
  npm ci --no-fund
else
  npm install --no-fund
fi

echo "Done. Run: npm run check" >&2
