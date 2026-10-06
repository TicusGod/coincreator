#!/usr/bin/env bash
# After a chain conversion: every mention of the OLD chain still in the project, grouped by file.
#
#   ops/leftovers.sh robinhood          (converted RH → Solana: find RH leftovers)
#   ops/leftovers.sh solana             (converted Solana → RH)
#   ops/leftovers.sh robinhood --lines  (every matching line)
. "$(dirname "$0")/_lib.sh"
case ${1:?usage: leftovers.sh <robinhood|solana> [--lines]} in
  robinhood) pat='robinhood|\bpons\b|usdg|4663|blockscout|wagmi|\bviem\b|foundry|\bforge\b|\b0x[0-9a-fA-F]{40}\b' ;;
  solana)    pat='solana|pump\.fun|pumpfun|raydium|launchlab|lamports|solscan|phantom|anchor|\bSOL\b' ;;
  *) die "robinhood or solana" ;;
esac
cd "$ROOT"
hits=$(grep -rniE "$pat" . \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git --exclude-dir=target --exclude-dir=out \
  --exclude-dir=dist --exclude-dir=cache --exclude-dir=broadcast --exclude-dir=lib --exclude-dir=ops \
  --exclude=package-lock.json --exclude=SPEC_CHAIN.md --exclude=README_FROM_SOURCE.md \
  --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' --include='*.json' --include='*.md' \
  --include='*.mdx' --include='*.css' --include='*.html' --include='*.sol' --include='*.rs' --include='*.toml' \
  --include='*.sh' --include='.env.example' 2>/dev/null || true)
# web/lib is app code, not a vendored lib: scan it separately
[ -d "$WEB_DIR/lib" ] && hits="$hits
$(grep -rniE "$pat" "./$WEB_DIR/lib" --exclude-dir=ops 2>/dev/null || true)"
# the kit itself and conversion notes legitimately name both chains
hits=$(echo "$hits" | grep -v '^$' | grep -vE '^\./(docs/SPEC_CHAIN\.md|docs/README_FROM_SOURCE\.md|README\.md|'"$WEB_DIR"'/lib/site-config\.ts):' || true)
if [ -z "$hits" ]; then ok "no $1 leftovers"; exit 0; fi
if [ "${2:-}" = --lines ]; then echo "$hits"; else
  echo "$hits" | cut -d: -f1 | sort | uniq -c | sort -rn | awk '{printf "%5d  %s\n", $1, $2}'
fi
info "$(echo "$hits" | wc -l | tr -d ' ') lines in $(echo "$hits" | cut -d: -f1 | sort -u | wc -l | tr -d ' ') files — ops/leftovers.sh $1 --lines for details"
