#!/usr/bin/env sh
# Resolves a Node 20+ binary matching the machine architecture (arm64 vs x64).
# Sets NODE_BIN and prepends its directory to PATH. Source from other scripts.

NODE_BIN=""
NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

MACHINE_ARCH=$(uname -m)
case "$MACHINE_ARCH" in
  arm64|aarch64) WANT_NODE_ARCH="arm64" ;;
  x86_64|amd64) WANT_NODE_ARCH="x64" ;;
  *) WANT_NODE_ARCH="" ;;
esac

node_arch_matches() {
  [ -x "$1" ] || return 1
  [ -z "$WANT_NODE_ARCH" ] && return 0
  ARCH=$("$1" -p "process.arch" 2>/dev/null) || return 1
  [ "$ARCH" = "$WANT_NODE_ARCH" ]
}

try_node() {
  if node_arch_matches "$1"; then
    NODE_BIN="$1"
    return 0
  fi
  return 1
}

# Homebrew: Apple Silicon vs Intel paths
if [ "$WANT_NODE_ARCH" = "arm64" ]; then
  for candidate in \
    /opt/homebrew/opt/node@20/bin/node \
    /opt/homebrew/opt/node/bin/node; do
    try_node "$candidate" && break
  done
elif [ "$WANT_NODE_ARCH" = "x64" ]; then
  for candidate in \
    /usr/local/opt/node@20/bin/node \
    /usr/local/opt/node/bin/node; do
    try_node "$candidate" && break
  done
fi

# nvm installs (no nvm CLI required) — only if arch matches
if [ -z "$NODE_BIN" ] && [ -f .nvmrc ] && [ -d "$NVM_DIR/versions/node" ]; then
  WANT=$(tr -d ' \n\r' < .nvmrc)
  for dir in "$NVM_DIR/versions/node"/v"${WANT}"*; do
    try_node "$dir/bin/node" && break
  done
fi

if [ -z "$NODE_BIN" ] && command -v fnm >/dev/null 2>&1 && [ -f .nvmrc ]; then
  FNM_BIN=$(fnm which 2>/dev/null || true)
  try_node "$FNM_BIN" || true
fi

if [ -z "$NODE_BIN" ]; then
  for candidate in \
    /opt/homebrew/opt/node@20/bin/node \
    /usr/local/opt/node@20/bin/node \
    /opt/homebrew/opt/node/bin/node \
    /usr/local/opt/node/bin/node; do
    try_node "$candidate" && break
  done
fi

if [ -z "$NODE_BIN" ] && [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "$NVM_DIR/nvm.sh"
  if [ -f .nvmrc ]; then
    nvm use --silent 2>/dev/null || nvm use
  fi
  NVM_BIN=$(nvm which current 2>/dev/null || nvm which 2>/dev/null || true)
  try_node "$NVM_BIN" || true
fi

if [ -z "$NODE_BIN" ]; then
  DEFAULT_NODE=$(command -v node 2>/dev/null || true)
  try_node "$DEFAULT_NODE" || NODE_BIN="$DEFAULT_NODE"
fi

if [ -z "$NODE_BIN" ] || [ ! -x "$NODE_BIN" ]; then
  echo "Could not find Node.js 20+ for ${MACHINE_ARCH}." >&2
  echo "Install Node 20 matching your Mac CPU, then reinstall deps:" >&2
  if [ "$WANT_NODE_ARCH" = "arm64" ]; then
    echo "  brew install node@20   # Apple Silicon (Homebrew in /opt/homebrew)" >&2
  else
    echo "  brew install node@20   # Intel (/usr/local)" >&2
  fi
  echo "  rm -rf node_modules && npm install" >&2
  exit 1
fi

export NODE_BIN
export PATH="$(dirname "$NODE_BIN"):$PATH"
