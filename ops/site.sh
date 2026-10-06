#!/usr/bin/env bash
# Launch-day micro-edits: one command, deployed and verified on the live site.
#
#   ops/site.sh show
#   ops/site.sh ca <address|none>           CA in navbar + hero (none = removed everywhere)
#   ops/site.sh x <https://x.com/handle|none>
#   ops/site.sh logo <path/to/logo.svg|png>  also becomes the favicon
#   ops/site.sh status <prelaunch|live|paused>
#   ops/site.sh url <https://domain>         live URL used for verification
#   ops/site.sh deploy | verify
#   ops/site.sh install-web                  copy the web kit into web/ (after create-next-app)
#
# NO_DEPLOY=1 edits the config only.
. "$(dirname "$0")/_lib.sh"
cmd=${1:-show}; arg=${2:-}

deploy() {
  [ "${NO_DEPLOY:-0}" = 1 ] && { info "NO_DEPLOY=1: config edited, not deployed"; return; }
  (cd "$ROOT/$WEB_DIR" && npx vercel deploy --prod --yes) | tail -3
  verify
}

ca_ok() { # the CA must be on the page, or absent everywhere when none
  if [ -z "$2" ]; then ! echo "$1" | grep -q 'data-contract-address'; else echo "$1" | grep -qi "$2"; fi
}

verify() {
  local url html i ca status
  url=$(cfg_get url); [ -n "$url" ] || die "no url in site.config.json — ops/site.sh url https://…"
  ca=$(cfg_get ca); status=$(cfg_get status)
  for i in 1 2 3 4 5 6; do
    html=$(curl -sL --max-time 15 -H 'Cache-Control: no-cache' "$url?v=$(date +%s)" || true)
    if echo "$html" | grep -q "data-site-status=\"$status\"" && ca_ok "$html" "$ca"; then
      ok "live $url · status=$status · ca=${ca:-none}"; return 0; fi
    sleep 5
  done
  die "live site does not show status=$status ca=${ca:-none} yet — open $url"
}

case $cmd in
  show) cat "$CONFIG" ;;
  ca)
    [ -n "$arg" ] || die "usage: ops/site.sh ca <address|none>"
    if [ "$arg" = none ]; then cfg_set ca null; ok "CA removed";
    else is_addr "$arg" || die "not a $CHAIN address: $arg"; cfg_set ca "\"$arg\""; ok "CA set $arg"; fi
    deploy ;;
  x)
    [ -n "$arg" ] || die "usage: ops/site.sh x <url|none>"
    if [ "$arg" = none ]; then cfg_set x null; else
      case $arg in https://x.com/*|https://twitter.com/*) ;; @*) arg="https://x.com/${arg#@}";; *) die "expected https://x.com/<handle> or @handle";; esac
      cfg_set x "\"$arg\""; fi
    ok "X = $arg"; deploy ;;
  logo)
    [ -f "$arg" ] || die "file not found: $arg"
    ext="${arg##*.}"; ext=$(echo "$ext" | lower)
    case $ext in svg|png|webp|jpg|jpeg) ;; *) die "logo must be svg/png/webp/jpg";; esac
    mkdir -p "$ROOT/$WEB_DIR/public/brand"
    cp "$arg" "$ROOT/$WEB_DIR/public/brand/logo.$ext"
    cfg_set logo "\"/brand/logo.$ext\""
    if [ -d "$ROOT/$WEB_DIR/app" ] && { [ "$ext" = svg ] || [ "$ext" = png ]; }; then
      rm -f "$ROOT/$WEB_DIR/app/icon."* "$ROOT/$WEB_DIR/app/favicon.ico"
      cp "$arg" "$ROOT/$WEB_DIR/app/icon.$ext"; ok "favicon = logo"
    fi
    ok "logo = /brand/logo.$ext (the logo replaces the text wordmark)"; deploy ;;
  status)
    case $arg in prelaunch|live|paused) ;; *) die "usage: ops/site.sh status <prelaunch|live|paused>";; esac
    cfg_set status "\"$arg\""; ok "status = $arg"; deploy ;;
  url)
    case $arg in https://*|http://localhost*) cfg_set url "\"${arg%/}\""; ok "url = ${arg%/}";; *) die "usage: ops/site.sh url https://…";; esac ;;
  deploy) deploy ;;
  verify) verify ;;
  install-web)
    [ -f "$ROOT/$WEB_DIR/package.json" ] || die "no $WEB_DIR/package.json — scaffold first: npx create-next-app@latest $WEB_DIR"
    mkdir -p "$ROOT/$WEB_DIR/lib" "$ROOT/$WEB_DIR/components/ops"
    cp -n "$OPS_DIR/web-kit/lib/site-config.ts" "$ROOT/$WEB_DIR/lib/" || true
    cp -n "$OPS_DIR/web-kit/components/ops/"*.tsx "$ROOT/$WEB_DIR/components/ops/" || true
    [ -f "$CONFIG" ] || sed -e "s/__SLUG__/$PROJECT/g" -e "s/__CHAIN__/$CHAIN/g" "$OPS_DIR/web-kit/site.config.json" > "$CONFIG"
    L="$ROOT/$WEB_DIR/app/layout.tsx"
    if [ -f "$L" ] && ! grep -q SiteGate "$L" && grep -q '>{children}<' "$L"; then
      python3 - "$L" <<'PY'
import sys
p=sys.argv[1]; s=open(p).read()
s='import { SiteGate } from "@/components/ops/SiteGate";\n'+s
s=s.replace(">{children}<", "><SiteGate>{children}</SiteGate><", 1)
open(p,"w").write(s)
PY
      ok "SiteGate wired in app/layout.tsx"
    fi
    ok "web kit installed: site.config.json, lib/site-config.ts, components/ops/*"
    info "wire once: <SiteGate> around {children} in app/layout.tsx, <ContractAddress/> in navbar + hero, <SocialLinks/> in navbar + footer, <BrandMark/> in navbar" ;;
  *) sed -n '2,15p' "$0"; exit 1 ;;
esac
