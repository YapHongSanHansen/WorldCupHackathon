"use client";

/**
 * Solana wallet-adapter provider (Phantom/Solflare) for devnet. In the mock-chain
 * MVP the connected wallet is cosmetic — bets settle server-side against
 * SIM_WALLET — but the real Phantom connect + signing flow is wired for when the
 * SolanaChainGateway is swapped in.
 */

import { useMemo, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";

export function SolanaWalletProvider({ children }: { children: ReactNode }) {
  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_SOLANA_RPC ?? clusterApiUrl("devnet"),
    [],
  );
  // Empty adapter list: modern wallet-adapter auto-detects Phantom / Solflare /
  // Backpack via the Wallet Standard, so no per-wallet packages (or their native
  // hardware-wallet deps) are needed.
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
