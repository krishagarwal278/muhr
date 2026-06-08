#!/usr/bin/env sh
set -e
ROOT="$(CDPATH= cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck source=scripts/resolve-node.sh
. "$ROOT/scripts/resolve-node.sh"
export PATH="$ROOT/node_modules/.bin:$PATH"

node "$ROOT/scripts/ensure-node.mjs"
sh "$ROOT/scripts/install-native-bindings.sh"

eslint .
tsc --noEmit
vitest run
