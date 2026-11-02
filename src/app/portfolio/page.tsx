"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSolanaNetwork } from "@/context/WalletContextProvider";
import { getExplorerUrl, getDexScreenerUrl } from "@/lib/solana";
import {
  Layers,
  Rocket,
  Droplets,
  ExternalLink,
  Check,
  ShieldCheck,
  Lock,
  Loader2,
  AlertCircle,
  Bot,
  Activity,
} from "lucide-react";

interface SavedPool {
  id: string;
  poolAddress: string;
  solAmount: number;
  baseTokenAmount: string;
  status: string;
  createdAt: string;
}

interface SavedToken {
  id: string;
  mintAddress: string;
  name: string;
  symbol: string;
  description?: string;
  imageUrl?: string;
  decimals: number;
  supply: string;
  freezeRevoked: boolean;
  mintRevoked: boolean;
  updateRevoked: boolean;
  creatorWallet: string;
  createdAt: string;
  liquidityPools: SavedPool[];
}

export default function PortfolioPage() {
  const { network } = useSolanaNetwork();
  const [tokens, setTokens] = useState<SavedToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTokens = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tokens?network=${network}`);
      const data = await res.json();
      if (data.success) {
        setTokens(data.tokens || []);
      } else {
        setError(data.error || "Failed to load tokens");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load portfolio");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, [network]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex-1 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Your Token Portfolio
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Persisted in PostgreSQL · Showing tokens on Solana {network.toUpperCase()}
          </p>
        </div>

        <Link
          href="/create"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-xs bg-[#00f2fe] hover:bg-[#00d8e4] text-[#070b10] shadow-sm transition-all w-fit"
        >
          <Rocket className="w-3.5 h-3.5" />
          Create New Token
        </Link>
      </div>

      {loading ? (
        <div className="bg-[#0f131c] border border-white/[0.08] p-16 rounded-xl flex flex-col items-center justify-center text-center">
          <Loader2 className="w-8 h-8 text-[#00f2fe] animate-spin mb-3" />
          <p className="text-xs text-zinc-400">Loading your portfolio from PostgreSQL...</p>
        </div>
      ) : error ? (
        <div className="bg-[#0f131c] border border-red-500/20 p-8 rounded-xl text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-red-400">{error}</p>
        </div>
      ) : tokens.length === 0 ? (
        <div className="bg-[#0f131c] border border-white/[0.08] p-16 rounded-xl text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-center text-zinc-500 mb-4">
            <Layers className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            No tokens created yet on {network.toUpperCase()}
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm mb-6">
            Mint your first SPL token with Metaplex metadata and launch a Raydium pool.
          </p>
          <Link
            href="/create"
            className="px-5 py-2.5 rounded-lg font-semibold text-xs bg-[#00f2fe] hover:bg-[#00d8e4] text-[#070b10] shadow-sm transition-all"
          >
            Launch Token Now
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tokens.map((token) => {
            const hasPool = token.liquidityPools.length > 0;
            const primaryPool = hasPool ? token.liquidityPools[0] : null;

            return (
              <div
                key={token.id}
                className="bg-[#0f131c] hover:bg-[#121722] border border-white/[0.08] hover:border-white/[0.15] p-6 rounded-xl transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Icon + Name */}
                  <div className="flex items-center gap-3.5 mb-4">
                    <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {token.imageUrl ? (
                        <img
                          src={token.imageUrl}
                          alt={token.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Rocket className="w-6 h-6 text-brand-primary/60" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-base font-bold text-white truncate">
                        {token.name}
                      </h4>
                      <p className="text-xs font-mono font-bold text-brand-secondary">
                        ${token.symbol}
                      </p>
                    </div>
                  </div>

                  {/* Mint Address */}
                  <div className="p-2.5 rounded-xl bg-white/[0.025] border border-white/[0.06] mb-4">
                    <p className="text-[10px] uppercase font-bold text-zinc-500 mb-0.5">
                      Mint Address
                    </p>
                    <p className="font-mono text-xs text-zinc-300 truncate">
                      {token.mintAddress}
                    </p>
                  </div>

                  {/* Token Details */}
                  <div className="space-y-1.5 text-xs text-zinc-400 mb-4">
                    <div className="flex justify-between">
                      <span>Supply:</span>
                      <span className="font-mono text-white font-semibold">
                        {Number(token.supply).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Decimals:</span>
                      <span className="font-mono text-white font-semibold">
                        {token.decimals}
                      </span>
                    </div>
                  </div>

                  {/* Security / Trust Badges */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {token.freezeRevoked && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Check className="w-3 h-3" /> Freeze Revoked
                      </span>
                    )}
                    {token.mintRevoked && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Check className="w-3 h-3" /> Mint Revoked
                      </span>
                    )}
                  </div>
                </div>

                {/* Pool Status & Actions */}
                <div className="pt-4 border-t border-white/[0.06] space-y-2.5">
                  {hasPool && primaryPool ? (
                    <div>
                      <div className="flex items-center justify-between text-xs mb-2">
                        {primaryPool.status === "WITHDRAWN" || primaryPool.solAmount <= 0 ? (
                          <span className="text-zinc-400 font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 text-emerald-400" /> Pool Withdrawn
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <Droplets className="w-3.5 h-3.5" /> Raydium Pool Active
                          </span>
                        )}
                        <span className="font-mono text-zinc-400 font-semibold">
                          {primaryPool.status === "WITHDRAWN" || primaryPool.solAmount <= 0
                            ? "0 SOL"
                            : `${primaryPool.solAmount} SOL`}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          href={`/chart/${primaryPool.poolAddress}`}
                          className="w-full py-2 rounded-lg font-bold text-[11px] bg-[#00f2fe]/15 text-[#00f2fe] border border-[#00f2fe]/30 hover:bg-[#00f2fe]/25 flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Activity className="w-3.5 h-3.5" />
                          <span>Live Chart</span>
                        </Link>
                        <a
                          href={getExplorerUrl(primaryPool.poolAddress, "address", network)}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-2 rounded-lg font-bold text-[11px] glass-panel text-zinc-300 hover:text-white flex items-center justify-center gap-1"
                        >
                          <span>Solscan</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <Link
                          href={`/bot?tokenId=${token.id}`}
                          className="w-full py-2 rounded-lg font-bold text-[11px] bg-brand-primary/10 text-brand-secondary border border-brand-primary/20 hover:bg-brand-primary/20 flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Bot className="w-3.5 h-3.5" />
                          <span>Volume Bot</span>
                        </Link>
                        {primaryPool.status === "WITHDRAWN" || primaryPool.solAmount <= 0 ? (
                          <span
                            className="w-full py-2 rounded-lg font-bold text-[11px] bg-zinc-800/80 text-zinc-500 border border-white/5 flex items-center justify-center gap-1.5 cursor-not-allowed"
                            title="Liquidity already extracted"
                          >
                            <Check className="w-3.5 h-3.5 text-zinc-500" />
                            <span>Withdrawn</span>
                          </span>
                        ) : (
                          <Link
                            href={`/liquidity?tab=remove&poolAddress=${primaryPool.poolAddress}`}
                            className="w-full py-2 rounded-lg font-bold text-[11px] bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Droplets className="w-3.5 h-3.5" />
                            <span>Withdraw</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs text-zinc-500 mb-2">
                        No liquidity pool created yet.
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          href={`/liquidity?tokenMint=${token.mintAddress}`}
                          className="w-full py-2 rounded-lg font-bold text-[11px] bg-gradient-to-r from-brand-primary to-brand-secondary text-surface-main hover:brightness-110 flex items-center justify-center gap-1"
                        >
                          <Droplets className="w-3 h-3" />
                          <span>Add Pool</span>
                        </Link>
                        <a
                          href={getExplorerUrl(token.mintAddress, "address", network)}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-2 rounded-lg font-bold text-[11px] glass-panel text-zinc-300 hover:text-white flex items-center justify-center gap-1"
                        >
                          <span>Solscan</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

