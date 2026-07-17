/**
 * On-chain verification of SolanaChainGateway against a local validator.
 *
 * Assumes a running `solana-test-validator` with the betting_market program
 * loaded and the default keypair funded. Does the one-time setup that lives
 * outside the gateway (initialize + faucet), then drives the gateway's real
 * transactions: ensureMarket -> placeBet -> resolveMarket -> claimWinnings, and
 * checks the winner is paid stake * odds.
 *
 * Run: tsx apps/api/src/scripts/verifySolana.ts   (see verify-solana.sh)
 */
import { AnchorProvider, BN, Program, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { readFileSync } from "node:fs";
import { Outcome } from "@wc/shared-types";
import { SolanaChainGateway } from "../chain/solanaChain.js";
import idlJson from "../chain/idl/betting_market.json" with { type: "json" };
import type { BettingMarket } from "../chain/idl/betting_market.js";

const RPC = process.env.SOLANA_RPC_URL ?? "http://127.0.0.1:8899";

async function main(): Promise<void> {
  const connection = new Connection(RPC, "confirmed");
  const signer = loadKeypair(`${process.env.HOME}/.config/solana/id.json`);
  console.log(`signer: ${signer.publicKey.toBase58()}`);

  // Fund the signer if needed.
  const bal = await connection.getBalance(signer.publicKey);
  if (bal < 2e9) {
    const sig = await connection.requestAirdrop(signer.publicKey, 5e9);
    await connection.confirmTransaction(sig, "confirmed");
  }

  const provider = new AnchorProvider(connection, new Wallet(signer), { commitment: "confirmed" });
  const program: Program<BettingMarket> = new Program(idlJson as unknown as BettingMarket, provider);

  const [config] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);
  const [mint] = PublicKey.findProgramAddressSync([Buffer.from("mint")], program.programId);

  // 1) initialize (once) — oracle = admin = signer for the sim.
  const cfg = await program.account.config.fetchNullable(config);
  if (!cfg) {
    await program.methods
      .initialize(signer.publicKey, new BN(0))
      .accountsPartial({
        admin: signer.publicKey,
        mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("✓ initialize: config + WCDT mint + funded treasury");
  } else {
    console.log("· config already initialized");
  }

  // 2) faucet WCDT to the signer so it can stake.
  const userToken = getAssociatedTokenAddressSync(mint, signer.publicKey);
  const [faucetRecord] = PublicKey.findProgramAddressSync(
    [Buffer.from("faucet"), signer.publicKey.toBuffer()],
    program.programId,
  );
  await program.methods
    .faucet()
    .accountsPartial({
      config,
      mint,
      user: signer.publicKey,
      userToken,
      faucetRecord,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  const before = await connection.getTokenAccountBalance(userToken);
  console.log(`✓ faucet: balance ${before.value.uiAmount} WCDT`);

  // 3) drive the gateway exactly as the orchestrator would.
  const gw = new SolanaChainGateway({ connection, admin: signer, oracle: signer, bettor: signer });
  const now = Date.now();
  const market = await gw.ensureMarket({
    fixtureId: "18209181",
    label: "France v Morocco",
    opensAt: now - 60_000,
    closesAt: now + 3_600_000,
  });
  console.log(`✓ ensureMarket: id ${market.marketId} pda ${market.marketPda}`);

  const stake = 20;
  const oddsBps = 17_500; // 1.75x
  const placed = await gw.placeBet({
    marketId: market.marketId,
    bettor: signer.publicKey.toBase58(),
    selection: "Home",
    stakeWcdt: stake,
    oddsBps,
  });
  console.log(`✓ placeBet: ${placed.signature}`);

  const resolved = await gw.resolveMarket(market.marketId, Outcome.Home); // 18209181 = 2-0 Home
  console.log(`✓ resolveMarket(Home): ${resolved.signature}`);

  const claim = await gw.claimWinnings(market.marketId);
  console.log(`✓ claimWinnings: ${claim.signature} payout ${claim.payoutWcdt} WCDT`);

  const after = await connection.getTokenAccountBalance(userToken);
  const expectedPayout = (stake * oddsBps) / 10_000; // 35
  const netDelta = (after.value.uiAmount ?? 0) - (before.value.uiAmount ?? 0);
  console.log(`token balance ${before.value.uiAmount} -> ${after.value.uiAmount} (net ${netDelta})`);

  // Staked 20, won back 35 -> net +15 vs pre-bet balance.
  const ok = claim.payoutWcdt === expectedPayout && Math.abs(netDelta - (expectedPayout - stake)) < 1e-6;
  if (!ok) {
    console.error(`✗ FAIL: expected payout ${expectedPayout}, net ${expectedPayout - stake}`);
    process.exit(1);
  }
  console.log(`\nPASS — SolanaChainGateway verified on-chain (payout ${claim.payoutWcdt} WCDT, net +${netDelta}).`);
}

function loadKeypair(path: string): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(path, "utf8")) as number[]));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
