#!/usr/bin/env bash
# This project's own wallets (never reused across projects). Keys stay in $KEYS_DIR, mode 600.
# Only public addresses are ever printed.
#
#   ops/wallet.sh new <name> [evm|solana]     e.g. new deployer · new funder
#   ops/wallet.sh list                        names + addresses + balances
#   ops/wallet.sh address <name>
#   ops/wallet.sh send <from> <to-address> <amount>   amount in ETH / SOL (fan-out from the funder)
#   ops/wallet.sh sweep <from> <to-address>   send everything minus the fee, prints the tx
#
# Default kind = CHAIN from ops/project.env (robinhood → evm).
. "$(dirname "$0")/_lib.sh"
cmd=${1:-list}

kind_of() { [ -f "$KEYS_DIR/$1.sol.json" ] && echo solana || { [ -f "$KEYS_DIR/$1.json" ] && echo evm || die "no wallet named $1 in $KEYS_DIR"; }; }
addr_of() { cat "$KEYS_DIR/$1.addr"; }
evm_rpc() { echo "$RH_RPC"; }

balance_of() { # name → human balance
  local n=$1
  if [ "$(kind_of "$n")" = solana ]; then solana balance "$(addr_of "$n")" --url "$SOL_RPC" 2>/dev/null || echo "?";
  else echo "$(cast balance "$(addr_of "$n")" --ether --rpc-url "$(evm_rpc)" 2>/dev/null || echo "?") ETH"; fi
}

case $cmd in
  new)
    name=${2:?usage: wallet.sh new <name> [evm|solana]}
    kind=${3:-$([ "$CHAIN" = solana ] && echo solana || echo evm)}
    mkdir -p "$KEYS_DIR"; chmod 700 "$KEYS_DIR"
    [ -e "$KEYS_DIR/$name.addr" ] && die "$name already exists: $(addr_of "$name")"
    if [ "$kind" = solana ]; then
      solana-keygen new --no-bip39-passphrase --silent -o "$KEYS_DIR/$name.sol.json" >/dev/null
      solana-keygen pubkey "$KEYS_DIR/$name.sol.json" > "$KEYS_DIR/$name.addr"
    else
      pw=$(openssl rand -base64 24); printf '%s' "$pw" > "$KEYS_DIR/$name.pw"
      tmp=$(mktemp -d)
      out=$(cast wallet new "$tmp" --unsafe-password "$pw")
      mv "$tmp"/* "$KEYS_DIR/$name.json"; rmdir "$tmp"
      echo "$out" | grep -oE '0x[0-9a-fA-F]{40}' | head -1 > "$KEYS_DIR/$name.addr"
    fi
    chmod 600 "$KEYS_DIR/$name".*
    ok "$name ($kind) = $(addr_of "$name")"
    info "keys in $KEYS_DIR — record the public address in docs/01_STATUS.md › Wallets" ;;
  list)
    [ -d "$KEYS_DIR" ] || { info "no wallets yet ($KEYS_DIR)"; exit 0; }
    printf '| Wallet | Kind | Address | Balance |\n|---|---|---|---|\n'
    for f in "$KEYS_DIR"/*.addr; do [ -e "$f" ] || continue; n=$(basename "$f" .addr)
      printf '| %s | %s | `%s` | %s |\n' "$n" "$(kind_of "$n")" "$(addr_of "$n")" "$(balance_of "$n")"; done ;;
  address) addr_of "${2:?usage: wallet.sh address <name>}" ;;
  send|sweep)
    from=${2:?usage}; to=${3:?usage}; kind=$(kind_of "$from")
    if [ "$kind" = solana ]; then
      is_sol_addr "$to" || die "not a Solana address: $to"
      amount=${4:-ALL}; [ "$cmd" = sweep ] && amount=ALL
      info "balance $(balance_of "$from") → sending $amount to $to"
      solana transfer --keypair "$KEYS_DIR/$from.sol.json" --fee-payer "$KEYS_DIR/$from.sol.json" \
        --url "$SOL_RPC" --allow-unfunded-recipient "$to" "$amount"
    else
      is_evm_addr "$to" || die "not an EVM address: $to"
      rpc=$(evm_rpc); src=$(addr_of "$from")
      bal=$(cast balance "$src" --rpc-url "$rpc"); [ "$bal" != 0 ] || die "$from is empty ($src)"
      price=$(cast gas-price --rpc-url "$rpc"); price=$(( price * 3 / 2 ))
      gas=$(cast estimate --from "$src" "$to" --value 0 --rpc-url "$rpc"); gas=$(( gas * 6 / 5 ))
      if [ "$cmd" = sweep ]; then
        value=$(python3 -c "print(max(0, $bal - $gas * $price))")
        [ "$value" != 0 ] || die "balance too low to cover the fee"
      else value=$(cast to-wei "${4:?usage: wallet.sh send <from> <to> <amount>}"); fi
      info "sending $(cast from-wei "$value") ETH from $from to $to (fee cap $(cast from-wei $(( gas * price ))) ETH)"
      cast send "$to" --value "$value" --legacy --gas-price "$price" --gas-limit "$gas" --rpc-url "$rpc" \
        --keystore "$KEYS_DIR/$from.json" --password-file "$KEYS_DIR/$from.pw" | grep -E '^(status|transactionHash)'
    fi
    ok "left in $from: $(balance_of "$from")" ;;
  *) sed -n '2,12p' "$0"; exit 1 ;;
esac
