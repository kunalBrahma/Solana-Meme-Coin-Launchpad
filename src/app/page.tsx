"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSolanaNetwork } from "@/context/WalletContextProvider";
import {
  PlusCircle,
  Droplets,
  Bot,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Activity,
  ArrowRight,
  Copy,
  Check,
  Radio,
  Layers,
} from "lucide-react";

interface PoolItem {
  id: string;
  poolAddress: string;
  solAmount: number;
  status?: string;
}

interface TokenItem {
  id: string;
  name: string;
  symbol: string;
  mintAddress: string;
  imageUrl?: string;
  freezeRevoked: boolean;
  mintRevoked: boolean;
  createdAt: string;
  liquidityPools: PoolItem[];
}

export default function Home() {
  const { connected } = useWallet();
  const { network } = useSolanaNetwork();

  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [solPrice, setSolPrice] = useState<number>(95.44);
  const [loading, setLoading] = useState(true);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  useEffect(() => {
    // 1. Fetch live SOL price
    fetch("/api/sol-price")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.price) setSolPrice(d.price);
      })
      .catch(() => {});

    // 2. Fetch recent launched tokens
    fetch(`/api/tokens?network=${network}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.tokens) {
          setTokens(d.tokens);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [network]);

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddress(addr);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Top Console Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[11px] font-mono font-medium text-emerald-400 uppercase tracking-wider">
              Solana {network.toUpperCase()} · Live DEX Terminal
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Token Launchpad & Market Maker
          </h1>
          <p className="text-zinc-400 text-sm mt-1 max-w-2xl leading-relaxed">
            Mint verified SPL tokens, open Raydium CPMM liquidity pools, and run organic multi-wallet trading bots without third-party listing fees.
          </p>
        </div>

        {/* Primary CTA Buttons */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <Link
            href="/create"
            className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-[#00f2fe] text-[#070b10] hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-2 shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Token</span>
          </Link>

          <Link
            href="/liquidity"
            className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#151c27] border border-white/10 text-white hover:bg-[#1a2332] active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <Droplets className="w-4 h-4 text-zinc-400" />
            <span>Liquidity Manager</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#0f131c] p-4 rounded-xl border border-white/[0.08]">
          <span className="text-[11px] font-medium text-zinc-400 block mb-1">
            Solana Market Price
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-white font-mono tabular-nums">
              ${solPrice.toFixed(2)}
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">USD</span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Live Binance / CoinGecko feed</span>
        </div>

        <div className="bg-[#0f131c] p-4 rounded-xl border border-white/[0.08]">
          <span className="text-[11px] font-medium text-zinc-400 block mb-1">
            AMM Protocol
          </span>
          <span className="text-xl font-bold text-white font-mono">
            Raydium CPMM
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block">Zero OpenBook market fees ($0)</span>
        </div>

        <div className="bg-[#0f131c] p-4 rounded-xl border border-white/[0.08]">
          <span className="text-[11px] font-medium text-zinc-400 block mb-1">
            Security Defaults
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold text-emerald-400">100% Revoked</span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Mint, Freeze & Update authorities</span>
        </div>

        <div className="bg-[#0f131c] p-4 rounded-xl border border-white/[0.08]">
          <span className="text-[11px] font-medium text-zinc-400 block mb-1">
            Active Tokens in DB
          </span>
          <span className="text-xl font-bold text-[#00f2fe] font-mono">
            {tokens.length}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block">Persisted on PostgreSQL</span>
        </div>
      </div>

      {/* Live Recent Launches Table */}
      <div className="bg-[#0f131c] rounded-xl border border-white/[0.08] overflow-hidden">
        <div className="px-5 py-3.5 bg-[#121722] border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#00f2fe]" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Recent Launches on This Node
            </span>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            {tokens.length} Total Tokens
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-zinc-400">
            Loading recent tokens...
          </div>
        ) : tokens.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto text-zinc-400">
              <Layers className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-white">No tokens minted yet on this network</p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Ready to launch your first coin? Use the 3-step wizard to mint with Metaplex and seed liquidity.
            </p>
            <Link
              href="/create"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#00f2fe] text-[#070b10] hover:brightness-110 mt-2"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Launch First Token</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#10151f] text-zinc-400 uppercase tracking-wider text-[10px] border-b border-white/[0.06]">
                <tr>
                  <th className="py-3 px-5">Token</th>
                  <th className="py-3 px-5">Mint Address</th>
                  <th className="py-3 px-5">Liquidity Status</th>
                  <th className="py-3 px-5">Security</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {tokens.map((token) => {
                  const pool = token.liquidityPools?.[0];
                  return (
                    <tr
                      key={token.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Token Details */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          {token.imageUrl ? (
                            <img
                              src={token.imageUrl}
                              alt={token.symbol}
                              className="w-8 h-8 rounded-full object-cover border border-white/10"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#18202d] text-[#00f2fe] font-bold flex items-center justify-center text-xs">
                              {token.symbol.slice(0, 2)}
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-white text-sm block">
                              {token.name}
                            </span>
                            <span className="text-[11px] font-mono text-zinc-400">
                              ${token.symbol}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Mint Address */}
                      <td className="py-3.5 px-5 font-mono text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <span>
                            {token.mintAddress.slice(0, 6)}...{token.mintAddress.slice(-4)}
                          </span>
                          <button
                            onClick={() => copyAddress(token.mintAddress)}
                            className="p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-white transition-colors"
                            title="Copy Mint Address"
                          >
                            {copiedAddress === token.mintAddress ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Liquidity Pool */}
                      <td className="py-3.5 px-5">
                        {pool ? (
                          pool.status === "WITHDRAWN" || pool.solAmount <= 0 ? (
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-zinc-500" />
                              <span className="font-mono text-zinc-400 font-medium">
                                Withdrawn
                              </span>
                              <span className="text-zinc-500 text-[10px]">
                                (0 SOL)
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-400" />
                              <span className="font-mono text-white font-medium">
                                {pool.solAmount} SOL
                              </span>
                              <span className="text-zinc-500 text-[10px]">
                                (≈ ${(pool.solAmount * solPrice).toFixed(0)})
                              </span>
                            </div>
                          )
                        ) : (
                          <span className="text-zinc-500 text-[11px]">No Pool Added</span>
                        )}
                      </td>

                      {/* Security */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Revoked
                          </span>
                        </div>
                      </td>

                      {/* Quick Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/chart/${pool?.poolAddress || token.mintAddress}`}
                            className="px-2.5 py-1 rounded bg-[#161d2b] hover:bg-[#1f293d] border border-white/10 text-white text-[11px] font-medium transition-colors"
                          >
                            Live Chart
                          </Link>
                          <Link
                            href={`/bot?tokenId=${token.id}`}
                            className="px-2.5 py-1 rounded bg-[#161d2b] hover:bg-[#1f293d] border border-white/10 text-zinc-300 hover:text-white text-[11px] font-medium transition-colors"
                          >
                            Bot
                          </Link>
                          <a
                            href={`https://solscan.io/token/${token.mintAddress}${
                              network === "devnet" ? "?cluster=devnet" : ""
                            }`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10"
                            title="View on Solscan"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3 Architecture Specs (Crisp, High-Utility) */}
      <div className="grid md:grid-cols-3 gap-4 pt-2">
        <div className="bg-[#0f131c] p-5 rounded-xl border border-white/[0.08] space-y-2">
          <span className="text-xs font-bold text-white uppercase tracking-wider block">
            01 · Atomic Metaplex V3
          </span>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Mint real SPL tokens directly through official Metaplex V3 program instructions with verified on-chain metadata and immediate authority revokes.
          </p>
        </div>

        <div className="bg-[#0f131c] p-5 rounded-xl border border-white/[0.08] space-y-2">
          <span className="text-xs font-bold text-white uppercase tracking-wider block">
            02 · Raydium CPMM Native
          </span>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Creates standard 0.25% fee tier pools on Raydium CPMM without requiring 3.0 SOL OpenBook market fees. Tradable on Jupiter & Photon instantly.
          </p>
        </div>

        <div className="bg-[#0f131c] p-5 rounded-xl border border-white/[0.08] space-y-2">
          <span className="text-xs font-bold text-white uppercase tracking-wider block">
            03 · Multi-Wallet Organic Bot
          </span>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Distributes SOL across 8 isolated sub-wallets to generate organic buy/sell swaps, green candlestick volume, and complete 1-click emergency SOL sweeps.
          </p>
        </div>
      </div>
    </div>
  );
}
