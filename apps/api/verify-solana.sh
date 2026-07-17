#!/usr/bin/env bash
# Stand up a local validator with the betting_market program and verify the
# SolanaChainGateway end-to-end (initialize -> faucet -> market -> bet ->
# resolve -> claim). Requires the Solana/Anchor toolchain on PATH.
set -euo pipefail

export PATH="$HOME/.nix-profile/bin:$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SO="$ROOT/anchor/target/deploy/betting_market.so"
PROGRAM_ID="2FTpj3gxeKv82Z8JKivPfajwcHLFeyZ5WpthzVyXSUgV"
LEDGER="${LEDGER:-/tmp/wc-test-ledger}"

[ -f "$SO" ] || (cd "$ROOT/anchor" && ~/.avm/bin/anchor-0.31.1 build)

solana-test-validator --reset --quiet --ledger "$LEDGER" \
  --bpf-program "$PROGRAM_ID" "$SO" &
VPID=$!
trap 'kill $VPID 2>/dev/null || true' EXIT

echo "waiting for validator..."
for _ in $(seq 1 60); do
  if curl -s http://127.0.0.1:8899 -X POST -H 'content-type: application/json' \
       -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' 2>/dev/null | grep -q '"result":"ok"'; then
    break
  fi
done

cd "$ROOT"
npx tsx apps/api/src/scripts/verifySolana.ts
