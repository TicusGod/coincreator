#!/usr/bin/env bash
# Real cost BEFORE asking the owner for money. Prints the table to paste to the owner.
#
#   ops/estimate.sh evm [script/Deploy.s.sol] [extra forge args, e.g. --sender 0x…]
#   ops/estimate.sh solana [target/deploy/<prog>.so]
#
# Never ask for a round "safety" amount: send the table.
. "$(dirname "$0")/_lib.sh"
mode=${1:-$([ "$CHAIN" = solana ] && echo solana || echo evm)}; shift || true

row() { printf '| %s | %s | %s |\n' "$1" "$2" "$3"; }

case $mode in
  evm)
    script=${1:-script/Deploy.s.sol}; shift || true
    cd "$ROOT/contracts" || die "no contracts/ folder"
    info "simulating $script on Robinhood Chain (no broadcast)…"
    out=$(forge script "$script" --rpc-url "$RH_RPC" "$@" 2>&1) || { echo "$out" | tail -20; die "simulation failed (a script reading PRIVATE_KEY needs --sender <deployer address>)"; }
    gas=$(echo "$out" | grep -oE 'Estimated total gas used for script: [0-9]+' | grep -oE '[0-9]+$' || true)
    [ -n "$gas" ] || { echo "$out" | tail -15; die "no transactions in the simulation (pass --sender?)"; }
    price=$(cast gas-price --rpc-url "$RH_RPC")
    wei=$(( gas * price ))
    margin=$(( wei * 3 / 10 ))
    printf '\n| Item | Amount | Spent or recoverable? |\n|---|---|---|\n'
    row "Deployment ($gas gas × $(cast from-wei "$price" gwei) gwei)" "$(cast from-wei $wei) ETH" "spent"
    row "Margin 30 %" "$(cast from-wei $margin) ETH" "stays in the wallet"
    row "**To send**" "**$(cast from-wei $(( wei + margin ))) ETH**" "" ;;
  solana)
    so=${1:-}
    if [ -z "$so" ]; then for f in "$ROOT"/program/target/deploy/*.so "$ROOT"/target/deploy/*.so; do [ -f "$f" ] && { so=$f; break; }; done; fi
    [ -f "$so" ] || die "no .so found — build first or pass the path"
    size=$(stat -f%z "$so")
    lam() { # live rent-exempt minimum for an account of N bytes (rent was cut in 2026: never hardcode it)
      local v; v=$(solana rent "$1" --lamports --url "$SOL_RPC" 2>/dev/null | grep -oE '[0-9]+' | head -1 || true)
      [ -n "$v" ] && echo "$v" || echo $(( ($1 + 128) * 6960 )); }
    sol() { python3 -c "print(f'{$1/1e9:.4f}')"; }
    pdata=$(lam $(( size + 45 ))); prog=$(lam 36); buffer=$(lam $(( size + 37 )))
    fees=$(( (size / 1000 + 2) * 5000 ))
    printf '\nProgram %s = %s KB\n\n| Item | Amount | Spent or recoverable? |\n|---|---|---|\n' "$(basename "$so")" $(( size / 1024 ))
    row "ProgramData rent (--max-len = real size)" "$(sol $pdata) SOL" "recoverable (solana program close)"
    row "Program account rent" "$(sol $prog) SOL" "recoverable"
    row "Deploy transactions (~$(( size / 1000 + 2 )) writes)" "$(sol $fees) SOL" "spent"
    row "Temporary buffer during deploy" "$(sol $buffer) SOL" "refunded at the end of the deploy"
    row "**To send**" "**$(sol $(( pdata + prog + fees + buffer ))) SOL**" "≈ $(sol $(( pdata + prog ))) SOL comes back when the program is closed"
    if [ "$size" -gt 300000 ]; then
      info "over 300 KB: check Anchor/IDL/logs/heavy crates before deploying (SLEEVES: 630 KB → 172 KB without Anchor, 3.20 → 0.876 SOL)"; fi
    info "deploy with: solana program deploy $so --max-len $size" ;;
  *) sed -n '2,8p' "$0"; exit 1 ;;
esac
