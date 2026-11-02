import { Connection, clusterApiUrl, PublicKey } from "@solana/web3.js";

export type SolanaNetwork = "devnet" | "mainnet-beta";

export const DEVNET_RPC =
  process.env.NEXT_PUBLIC_DEVNET_RPC_URL || clusterApiUrl("devnet");

export const MAINNET_RPC =
  process.env.NEXT_PUBLIC_MAINNET_RPC_URL || "https://solana-rpc.publicnode.com";

export function getRpcUrl(network: SolanaNetwork): string {
  return network === "mainnet-beta" ? MAINNET_RPC : DEVNET_RPC;
}

export function getConnection(network: SolanaNetwork): Connection {
  return new Connection(getRpcUrl(network), "confirmed");
}

export function getExplorerUrl(
  identifier: string,
  type: "address" | "tx" = "address",
  network: SolanaNetwork = "devnet"
): string {
  const clusterQuery = network === "devnet" ? "?cluster=devnet" : "";
  return `https://solscan.io/${type}/${identifier}${clusterQuery}`;
}

export function getDexScreenerUrl(
  tokenOrPoolAddress: string,
  network: SolanaNetwork = "mainnet-beta"
): string {
  if (network === "devnet") {
    return `https://solscan.io/address/${tokenOrPoolAddress}?cluster=devnet`;
  }
  return `https://dexscreener.com/solana/${tokenOrPoolAddress}`;
}

export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

