#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

node_major() {
  node -p "process.versions.node.split('.')[0]"
}

# Prefer Homebrew Node 20 (matches .nvmrc; avoids nvm under npm)
for dir in /usr/local/opt/node@20/bin /opt/homebrew/opt/node@20/bin; do
  if [[ -x "${dir}/node" ]]; then
    export PATH="${dir}:${PATH}"
    break
  fi
done

if [[ "$(node_major)" -ge 20 ]]; then
  exec "$@"
fi

# Fall back to nvm when Homebrew Node 20 is not on PATH
if [[ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]]; then
  # npm injects npm_config_prefix; nvm refuses to load until it is cleared
  unset npm_config_prefix npm_config_global_prefix 2>/dev/null || true
  # shellcheck source=/dev/null
  source "${NVM_DIR:-$HOME/.nvm}/nvm.sh"
  if [[ -f "$ROOT/.nvmrc" ]]; then
    nvm use --silent
  fi
fi

if [[ "$(node_major)" -lt 20 ]]; then
  echo "Node.js >= 20.9.0 is required (current: $(node -v))." >&2
  echo "Install Node 20 (brew install node@20) or run: nvm use" >&2
  exit 1
fi

exec "$@"
