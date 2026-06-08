#!/usr/bin/env sh
# Ensures Rollup native bindings exist for the current machine (npm optional-deps bug).
set -e

ROOT="$(CDPATH= cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

[ -d node_modules/rollup ] || [ -d node_modules/rolldown ] || exit 0

# shellcheck source=scripts/resolve-node.sh
. "$ROOT/scripts/resolve-node.sh"

install_binding() {
  PKG=$1
  VERSION=$2
  if [ -d "node_modules/$PKG" ]; then
    return 0
  fi
  echo "Installing native binding $PKG@${VERSION}…" >&2
  npm install "${PKG}@${VERSION}" --no-save --no-fund --no-audit >/dev/null 2>&1 || \
    npm install "${PKG}@${VERSION}" --no-save --no-fund --no-audit >&2
}

case "$(uname -s)" in
  Darwin)
    if [ -d node_modules/rollup ]; then
      ROLLUP_VERSION=$(node -e "console.log(require('rollup/package.json').version)" 2>/dev/null || echo "4.61.0")
      install_binding "@rollup/rollup-darwin-arm64" "$ROLLUP_VERSION"
      install_binding "@rollup/rollup-darwin-x64" "$ROLLUP_VERSION"
    fi
    if [ -d node_modules/rolldown ]; then
      ROLLDOWN_VERSION=$(node -e "console.log(require('rolldown/package.json').version)" 2>/dev/null || echo "1.0.3")
      install_binding "@rolldown/binding-darwin-arm64" "$ROLLDOWN_VERSION"
      install_binding "@rolldown/binding-darwin-x64" "$ROLLDOWN_VERSION"
    fi
    ;;
  Linux)
    if [ -d node_modules/rollup ]; then
      ROLLUP_VERSION=$(node -e "console.log(require('rollup/package.json').version)" 2>/dev/null || echo "4.61.0")
      install_binding "@rollup/rollup-linux-x64-gnu" "$ROLLUP_VERSION"
    fi
    if [ -d node_modules/rolldown ]; then
      ROLLDOWN_VERSION=$(node -e "console.log(require('rolldown/package.json').version)" 2>/dev/null || echo "1.0.3")
      install_binding "@rolldown/binding-linux-x64-gnu" "$ROLLDOWN_VERSION"
    fi
    ;;
esac
