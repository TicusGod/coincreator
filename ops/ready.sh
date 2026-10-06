#!/usr/bin/env bash
# The answer to "il manque quoi ?" — always this table, never prose.
#
#   ops/ready.sh            fast checks
#   ops/ready.sh --build    also npm run build + forge test (slower)
. "$(dirname "$0")/_lib.sh"
cd "$ROOT"
BUILD=0; [ "${1:-}" = --build ] && BUILD=1
W="$ROOT/$WEB_DIR"
printf '| Check | State | Who |\n|---|---|---|\n'
r() { printf '| %s | %s | %s |\n' "$1" "$2" "$3"; }

# 1. build + tests
if [ -f "$W/package.json" ]; then
  if [ $BUILD = 1 ]; then (cd "$W" && npm run build >/tmp/ready-build.log 2>&1) && r "Web build" "✅" agent || r "Web build" "❌ see /tmp/ready-build.log" agent
  else r "Web build" "— (run with --build)" agent; fi
else r "Web" "❌ no $WEB_DIR/package.json" agent; fi
if [ -f contracts/foundry.toml ]; then
  if [ $BUILD = 1 ]; then t=$(cd contracts && forge test 2>&1 | grep -E 'Ran [0-9]+ test suites' | tail -1)
    echo "$t" | grep -q ' 0 tests failed' && r "Contract tests" "✅ ${t#*: }" agent || r "Contract tests" "❌ ${t:-failed}" agent
  else r "Contract tests" "— (run with --build)" agent; fi
fi

# 2. env vars
if [ -f "$W/.env.example" ]; then
  miss=$("$OPS_DIR/secrets.sh" missing 2>/dev/null | grep -c '^missing' || true)
  [ "$miss" = 0 ] && r "Env .env.local" "✅ complete" agent || r "Env .env.local" "❌ $miss missing (ops/secrets.sh missing)" "agent / owner (key)"
  if [ -d "$W/.vercel" ]; then
    names=$(cd "$W" && npx vercel env ls production 2>/dev/null || true); vm=""
    for k in $(grep -E '^[A-Z0-9_]+=' "$W/.env.example" | cut -d= -f1); do echo "$names" | grep -qw "$k" || vm="$vm $k"; done
    [ -z "$vm" ] && r "Env on Vercel (production)" "✅" agent || r "Env on Vercel (production)" "❌ missing:$vm" agent
  else r "Vercel project" "❌ not linked (cd $WEB_DIR && npx vercel link)" agent; fi
fi

# 3. contracts / program
if [ -f contracts/ADDRESSES.md ]; then
  n=$(grep -cE '0x[0-9a-fA-F]{40}|[1-9A-HJ-NP-Za-km-z]{43,44}' contracts/ADDRESSES.md || true)
  [ "$n" -gt 0 ] && r "Contracts deployed" "✅ $n addresses in ADDRESSES.md (verified?)" agent || r "Contracts deployed" "❌ ADDRESSES.md empty" "agent (needs funded wallet)"
elif [ -d contracts ] || [ -d program ]; then r "Contracts deployed" "❌ no contracts/ADDRESSES.md" agent; fi

# 4. wallets
if ls "$KEYS_DIR"/*.addr >/dev/null 2>&1; then
  r "Wallets" "$(ls "$KEYS_DIR"/*.addr | wc -l | tr -d ' ') in $KEYS_DIR — ops/wallet.sh list for balances" "owner funds (ops/estimate.sh)"
else r "Wallets" "— none yet (ops/wallet.sh new deployer)" agent; fi

# 5. launch values
if [ -f "$CONFIG" ]; then
  url=$(cfg_get url)
  [ -n "$url" ] && r "Domain / URL" "✅ $url" owner || r "Domain / URL" "❌ ops/site.sh url https://…" owner
  [ -n "$(cfg_get x)" ] && r "X account on the site" "✅" owner || r "X account on the site" "❌ ops/site.sh x @handle" owner
  [ -n "$(cfg_get logo)" ] && r "Logo + favicon" "✅" owner || r "Logo + favicon" "❌ ops/site.sh logo <file>" "owner / agent"
  ca=$(cfg_get ca); r "Official CA" "${ca:-none yet}" "owner sends it at launch → ops/site.sh ca"
  r "Site status" "$(cfg_get status)" owner
  if [ -n "$url" ]; then code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$url" || true); code=${code:-000}
    [ "$code" = 200 ] && r "Live site" "✅ 200" agent || r "Live site" "❌ HTTP $code" agent; fi
else r "site.config.json" "❌ ops/site.sh install-web" agent; fi

# 6. mock / preview text visible to users
if [ -d "$W" ]; then
  mock=$(grep -rniE '\b(mock|lorem|sample data|preview|proposed|placeholder|dummy|coming soon|TODO)\b' "$W/app" "$W/components" "$W/lib" \
    --include=*.{ts,tsx,md,mdx} 2>/dev/null | grep -v '/components/ops/' | grep -v 'placeholder=' | wc -l | tr -d ' ')
  [ "$mock" = 0 ] && r "No mock / preview / proposed text" "✅" agent || r "No mock / preview / proposed text" "❌ $mock lines (grep mock|preview|proposed|sample…)" agent
fi

# 7. personal info (pattern kept OUTSIDE the project so it never leaks into it)
P="$HOME/.secrets/personal.pattern"
if [ -f "$P" ]; then
  hits=$(grep -rniE "$(cat "$P")" . --exclude-dir={node_modules,.next,.git,target,.vercel} -l 2>/dev/null | wc -l | tr -d ' ')
  [ "$hits" = 0 ] && r "No personal info" "✅" agent || r "No personal info" "❌ $hits files" agent
else r "No personal info" "— create ~/.secrets/personal.pattern (regex)" owner; fi

# 8. git
if [ -d .git ]; then d=$(git status --short | wc -l | tr -d ' ')
  [ "$d" = 0 ] && r "Snapshot" "✅ clean" agent || r "Snapshot" "⚠️ $d uncommitted — ops/snapshot.sh" agent
else r "Snapshot" "❌ no git — ops/snapshot.sh baseline" agent; fi

r "Real end-to-end test (one real user path)" "manual — say which path was run" agent
