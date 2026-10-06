# Shared helpers for ops/*.sh (bash 3.2 compatible, macOS default).
set -euo pipefail
OPS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$OPS_DIR/.." && pwd)"
# shellcheck disable=SC1091
. "$OPS_DIR/project.env"
CONFIG="$ROOT/$WEB_DIR/site.config.json"

die()  { printf '\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }
ok()   { printf '\033[32m✓ %s\033[0m\n' "$*"; }
info() { printf '· %s\n' "$*"; }
lower() { tr '[:upper:]' '[:lower:]'; }

rpc() { if [ "$CHAIN" = solana ]; then echo "$SOL_RPC"; else echo "$RH_RPC"; fi; }

is_evm_addr() { [[ "$1" =~ ^0x[0-9a-fA-F]{40}$ ]]; }
is_sol_addr() { [[ "$1" =~ ^[1-9A-HJ-NP-Za-km-z]{32,44}$ ]]; }
is_addr() { if [ "$CHAIN" = solana ]; then is_sol_addr "$1"; else is_evm_addr "$1"; fi; }

cfg_get() { [ -f "$CONFIG" ] || die "no $WEB_DIR/site.config.json — run: ops/site.sh install-web"; jq -r ".$1 // empty" "$CONFIG"; }
cfg_set() { # cfg_set key json-value
  local tmp; tmp="$(mktemp)"
  jq --argjson v "$2" ".$1 = \$v" "$CONFIG" > "$tmp" && mv "$tmp" "$CONFIG"
}
