#!/usr/bin/env sh
set -e
# shellcheck source=scripts/resolve-node.sh
. "$(dirname "$0")/resolve-node.sh"
exec "$@"
