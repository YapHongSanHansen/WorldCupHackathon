# Handoff — World Cup Betting Agent (Solana)

Practical continuation guide. Read `README.md` for the product spec and
[`docs/SOLANA.md`](docs/SOLANA.md) for the authoritative chain design.

## TL;DR

Simulation-only World Cup betting agent, built to the repo's `README.md` spec **but on
Solana** (the spec's EVM/Hardhat/MetaMask stack was intentionally dropped — hackathon
requires Solana). All five phases are built; only the real on-chain gateway is
unverified in this environment (no Solana toolchain on PATH — see 3c below).

| Phase | Status | Where |
|---|---|---|
| 1 — TxLINE replay engine (chain-agnostic) | ✅ done, verified | `apps/replay-engine`, `packages/shared-types` |
| 2 — Anchor betting program + SPL WCDT | ✅ done, verified | `anchor/` |
| 3a — Rule-based agent (`PressureEdgeV1`) + state machine | ✅ done, verified | `packages/agent-core`, `packages/shared-types` |
| 3b — API + orchestrator + mock-chain oracle | ✅ done, verified (HTTP + WS) | `apps/api` |
| 3c — Web app (match centre / confirm / portfolio / wallet) | ✅ done, verified (build + live WS) | `apps/web` |
| 3c — Real Solana chain gateway (`CHAIN=solana`) | ⚠️ built, not on-chain-verified | `apps/api/src/chain/solanaChain.ts` |
| 4 — Telegram bot (briefing/recommend/confirm/settle) | ✅ done, verified (getMe @WorldcupTayBot) | `apps/api/src/bot` |
| 5 — Portfolio + polish + tests | ✅ done (52 tests, tsc, replay:verify, next build green) | across |

## Environment / toolchain (IMPORTANT — not preinstalled)

Installed this session; future shells need this PATH:

```bash
export PATH="$HOME/.nix-profile/bin:$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
```

- **Rust** 1.97 (rustup, `rustup default stable`), **Solana CLI** 4.1.1 (Agave), **Anchor** 0.31.1.
- **gcc 15.2** installed via **Nix** (`nix profile add nixpkgs#gcc`) because no `cc` and no passwordless sudo. `cc`/`ld` come from `~/.nix-profile/bin`.
- **Gotcha 1 — use the real anchor binary:** run **`~/.avm/bin/anchor-0.31.1`**, NOT `anchor`. The avm proxy tries to auto-switch Solana to 2.1.0 and fails.
- **Gotcha 2 — active_release symlink:** avm's failed switch repointed `~/.local/share/solana/install/active_release` at a missing dir. It must point at `releases/stable-*/solana-release`. If `solana-keygen`/`cargo-build-sbf` "not found", fix the symlink.
- Deployer keypair: `~/.config/solana/id.json`.

## Build / test / run

```bash
# Phase 1 — replay engine (Node)
npm install                    # workspace root
npm run replay:verify          # all 6 fixtures -> real final scores
npx vitest run                 # unit + golden tests
npx tsc --noEmit -p tsconfig.json

# Phase 2 — Anchor program (needs the PATH above)
cd anchor
npm install
~/.avm/bin/anchor-0.31.1 build
~/.avm/bin/anchor-0.31.1 test  # local validator: initialize/faucet/bet/resolve/claim
```

### Run the full demo stack (mock chain — no validator needed)

```bash
npm install                                  # workspace root (installs api + web deps too)

# Terminal 1 — API + Socket.IO + Telegram bot (bot auto-starts if TELEGRAM_BOT_TOKEN in .env.local)
PORT=4000 npx tsx apps/api/src/server.ts

# Terminal 2 — web app
cd apps/web && npm run dev                   # http://localhost:3000
```

Then: open the web app → **Start** a fixture (try 30×) → wait for a `PressureEdgeV1`
recommendation card → **Confirm** to place a simulated on-chain bet → let the match finish
→ the oracle resolves and the bet settles → **Claim** a winner in the Portfolio. The Telegram
bot pushes the same recommendations with Confirm/Skip buttons + a `/confirm/[id]` deep link.

Fast headless walk-through (no browser): `POST /api/fixtures/:id/replay {"action":"step"}` to
advance to the next recommendation, `POST /api/recommendations/:id/confirm`, step to the end,
then `POST /api/recommendations/:id/claim`.

### Real chain (`CHAIN=solana`) — built, not yet on-chain-verified here

Deploy + `initialize` the program (see `anchor/tests/betting-market.ts` for the canonical
init/faucet/bet/resolve/claim flow), fund the role keypairs, set `PROGRAM_ID`, `SOLANA_RPC_URL`,
`ORACLE_KEYPAIR_PATH` (+ optional `ADMIN_KEYPAIR_PATH`/`BETTOR_KEYPAIR_PATH`), then start the API
with `CHAIN=solana`. The orchestrator is unchanged — only the `ChainGateway` swaps.

## Program facts (Phase 2)

- Program id: **`2FTpj3gxeKv82Z8JKivPfajwcHLFeyZ5WpthzVyXSUgV`** (`declare_id!`, Anchor.toml localnet+devnet).
- Instructions: `initialize`, `faucet`, `create_market`, `close_market`, `place_bet`, `resolve_market`, `claim_winnings`.
- PDAs: `["config"]`, WCDT mint `["mint"]`, treasury = ATA(mint, config), `["market", id_le_u64]`, `["bet", id_le_u64, bettor]` (one bet per market per wallet), `["faucet", user]`.
- WCDT: 6 decimals, faucet 1,000. Fixed-odds payout `stake * odds_bps / 10_000` from a treasury seeded at `initialize`.
- Outcome: 0 Pending · 1 Home · 2 Draw · 3 Away.
- `opens_at` **is enforced** in `place_bet` (user decision): `require!(now >= opens_at)`.

## Key decisions

- **Solana, not EVM.** Solidity/Hardhat removed. `docs/SOLANA.md` supersedes README §12–14.
- **Admin/oracle/prize wallet:** `2n8wmUm5h2XhrK1c2QfsPQMHyLkHkMEsaPbfbTocrT68` (public address only; deploy uses the local devnet keypair; move authority to a wallet-controlled keypair/multisig for prod).
- **Simulation-only.** WCDT has no value; treasury is pre-seeded because fixed-odds payouts can exceed pooled stakes. Not a solvent real book.
- **Odds are caller-supplied** with only a `>= 1.0` floor — acceptable for the sim; the economic trust boundary to close before any real-money use.
- Team names beyond FRA-MAR are participant-ID placeholders (dataset only names fixture 18209181). Fill `packages/shared-types/src/fixtures.ts` when a real map is available.

## Dataset

6 World Cup fixtures at `data/exact-match-txline-raw-inspect/txline-raw/` (already tracked;
identical md5 to the Downloads bundle). Engine reads it via `TXLINE_DATA_DIR` (overridable),
defaulting to that path. Fixtures: 18209181 (FRA-MAR 2-0), 18213979 (1-2 ET), 18218149 (2-1),
18222446 (3-1 ET), 18237038 (0-2), 18241006 (1-2).

## no-mistakes gate (per user directive: gate throughout building)

- Repo is initialized (`no-mistakes init`). Push target = `YapHongSanHansen/WorldCupHackathon` (you have WRITE). Pipeline agent = `claude`.
- Workflow per verified chunk: feature branch → commit → `no-mistakes axi run --intent "..."` → respond to gates → `checks-passed`.
- **Current branch `foundation-replay-and-solana-program`:** review step found 3 findings — `opens-at-not-enforced` (fixed, enforced), `setspeed-while-paused-corrupts-clock` (fixed), `caller-supplied-odds-unbounded` (no-op, by design). The pipeline's fix-agent crashed once (infra), so fixes were applied by hand; **re-run the gate** after committing.

## Next steps (Phase 3)

1. ✅ **Agent core** (`packages/agent-core`) — DONE (commit `9ebae94`). `PressureEdgeV1`
   (spec §11.7): Poisson goal model from a Bayesian-shrunk recent-pressure share + scoreline
   vs de-vigged market implied probs, highest positive edge wins; mandatory SKIP gates (§11.5)
   incl. a 5' warmup; stake sizing (§11.6); recommendation state machine (§28) in shared-types.
   Domain types (`UserPreferences`, `AgentDecision`, `AgentContext`, `Selection`) live in
   `@wc/shared-types`. 42 vitest tests (unit + full replay-driven invariant run) green; `tsc`
   and `replay:verify` green. Entry: `import { pressureEdgeV1, DEFAULT_PREFERENCES } from "@wc/agent-core"`.
   Telegram bot token (Phase 4) stored in gitignored `.env.local` (`TELEGRAM_BOT_TOKEN`); see `.env.example`.
2. ✅ **API + orchestrator + oracle** (`apps/api`) — DONE (commit `3e371b0`). Fastify + Socket.IO.
   `SimulationEngine` drives replay → `pressureEdgeV1` → recommendation FSM (§28) → confirm →
   `place_bet` → terminal state → oracle `resolve_market` → settle WON/LOST → `claim`. All chain
   effects go through a `ChainGateway` seam; default `MockChainGateway` runs with **no validator**
   (mirrors the program: one market/fixture, one bet/market/bettor, oracle-gated resolve, fixed-odds
   payout). In-memory single-wallet portfolio. REST: `/api/fixtures`, `/api/fixtures/:id/replay`
   (start/pause/resume/setSpeed/**step**), `/api/recommendations/:id/{confirm,reject,stake,claim}`,
   `/api/preferences`, `/api/faucet`, `/api/portfolio`; Socket.IO streams `state|recommendation|bet|
   settlement|portfolio`. Run: `PORT=4000 npx tsx apps/api/src/server.ts`. Verified end-to-end over
   HTTP (step→confirm→settle→claim). 52 vitest tests total; `tsc` green.
3. ✅ **Real Solana gateway** (`apps/api/src/chain/solanaChain.ts`) — BUILT (commit `f3d38a7`).
   `SolanaChainGateway implements ChainGateway` via `@coral-xyz/anchor` (bundled IDL + type);
   derives config/mint/market/bet PDAs + treasury ATA; admin opens markets, oracle signs
   `resolve_market`, a server-held bettor keypair signs `place_bet`/`claim`. Selected by `CHAIN=solana`
   in `server.ts`; mock stays default. ⚠️ **Not yet run on a live validator here** (no Solana
   toolchain on PATH) — see the "Real chain" runbook above.
4. ✅ **Web** (`apps/web`) — DONE (commit `b2ee14c`). Next.js App Router + Tailwind + wallet-adapter
   (Wallet Standard auto-detect — no native hardware-wallet deps). Match centre (live via Socket.IO),
   `/confirm/[id]`, portfolio, faucet, Phantom connect. `next build` + live-WS verified.
5. ✅ **Telegram** (`apps/api/src/bot`) — DONE (commit `947a095`). grammy bot in-process on the
   orchestrator; /start, /briefing, /portfolio, inline Confirm/Skip + web deep-link, settlement
   messages. Auto-starts with `TELEGRAM_BOT_TOKEN`. getMe → @WorldcupTayBot.

### Genuinely remaining

- **On-chain verification of `CHAIN=solana`**: deploy to localnet/devnet, `initialize`, fund roles,
  and drive the API against it (the mock path already proves the orchestration; this proves the
  real signatures). Follow the runbook above.
- **Per-user wallets**: the MVP is single-wallet (`SIM_WALLET`). Real multi-user needs a wallet→user
  map + browser-side signing for `place_bet`/`claim` (the web wallet connect is already wired).
- Optional: persistence (spec §17 DB) instead of in-memory stores; richer analytics on Portfolio.

Gate each phase through no-mistakes.
