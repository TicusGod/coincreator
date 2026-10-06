#!/usr/bin/env bash
# One vault for reusable keys: ~/.secrets/<service>.env (Pinata, Supabase, Privy, OpenRouter…).
# Check here BEFORE asking the owner for a key. Values are never printed.
#
#   ops/secrets.sh list                          services + key names
#   ops/secrets.sh set <service> <KEY>           value read from stdin: printf %s "$V" | ops/secrets.sh set pinata PINATA_JWT
#   ops/secrets.sh use <service>                 copy into web/.env.local (existing keys kept)
#   ops/secrets.sh push [production|preview]     every key of web/.env.local → Vercel env
#   ops/secrets.sh missing                       keys in web/.env.example not in web/.env.local
. "$(dirname "$0")/_lib.sh"
VAULT="$HOME/.secrets"; LOCAL="$ROOT/$WEB_DIR/.env.local"
mkdir -p "$VAULT"; chmod 700 "$VAULT"
keys_of() { grep -E '^[A-Z0-9_]+=' "$1" 2>/dev/null | cut -d= -f1; }

case ${1:-list} in
  list)
    for f in "$VAULT"/*.env; do [ -e "$f" ] || { info "vault empty"; break; }
      printf '%-14s %s\n' "$(basename "$f" .env)" "$(keys_of "$f" | tr '\n' ' ')"; done ;;
  set)
    svc=${2:?usage: set <service> <KEY>}; key=${3:?usage: set <service> <KEY>}
    [[ "$key" =~ ^[A-Z0-9_]+$ ]] || die "KEY must be UPPER_SNAKE"
    val=$(cat); [ -n "$val" ] || die "empty value on stdin"
    f="$VAULT/$svc.env"; touch "$f"; chmod 600 "$f"
    grep -v "^$key=" "$f" > "$f.tmp" || true; printf '%s=%s\n' "$key" "$val" >> "$f.tmp"; mv "$f.tmp" "$f"; chmod 600 "$f"
    ok "$svc/$key stored (remind the owner to rotate it if it was pasted in the chat)" ;;
  use)
    f="$VAULT/${2:?usage: use <service>}.env"; [ -f "$f" ] || die "no service $2 — ops/secrets.sh list"
    touch "$LOCAL"; chmod 600 "$LOCAL"; n=0
    while IFS= read -r line; do k=${line%%=*}; [[ "$k" =~ ^[A-Z0-9_]+$ ]] || continue
      grep -q "^$k=" "$LOCAL" || { echo "$line" >> "$LOCAL"; n=$((n+1)); }; done < "$f"
    ok "$n keys from $2 added to $WEB_DIR/.env.local" ;;
  push)
    env=${2:-production}; [ -f "$LOCAL" ] || die "no $WEB_DIR/.env.local"
    cd "$ROOT/$WEB_DIR"
    while IFS= read -r line; do k=${line%%=*}; v=${line#*=}; [[ "$k" =~ ^[A-Z0-9_]+$ ]] || continue
      npx vercel env rm "$k" "$env" -y >/dev/null 2>&1 || true
      printf '%s' "$v" | npx vercel env add "$k" "$env" >/dev/null 2>&1 && ok "$k → $env" || echo "✗ $k"
    done < "$LOCAL"
    info "redeploy for the new values: ops/site.sh deploy" ;;
  missing)
    ex="$ROOT/$WEB_DIR/.env.example"; [ -f "$ex" ] || die "no $WEB_DIR/.env.example"
    miss=0; for k in $(keys_of "$ex"); do grep -q "^$k=." "$LOCAL" 2>/dev/null || { echo "missing $k"; miss=1; }; done
    [ $miss = 0 ] && ok "all keys present" || true ;;
  *) sed -n '2,10p' "$0"; exit 1 ;;
esac
