#!/usr/bin/env sh
set -e
# shellcheck source=scripts/resolve-node.sh
. "$(dirname "$0")/resolve-node.sh"
exec node "$(dirname "$0")/ensure-node.mjs"
