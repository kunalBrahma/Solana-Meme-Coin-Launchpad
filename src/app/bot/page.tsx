"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useSolanaNetwork } from "@/context/WalletContextProvider";
import { getExplorerUrl, getDexScreenerUrl } from "@/lib/solana";
import {
  Bot,
  Play,
  Pause,
  Square,
  RefreshCw,
  Wallet,
  Zap,
  TrendingUp,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Layers,
  Copy,
  Check,
  Loader2,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";

interface SubWallet {
  id: string;
  publicKey: string;
  solBalance: number;
  totalTrades: number;
}

interface TradeLog {
  id: string;
  type: "BUY" | "SELL";
  amountSol: number;
  txSignature?: string;
  status: string;
  errorMessage?: string;
  createdAt: string;
}

interface BotConfigData {
  id: string;
  tokenId: string;
  token: {
    id: string;
    name: string;
    symbol: string;
    imageUrl?: string;
    mintAddress: string;
  };
  pool?: {
    poolAddress: string;
  };
  status: "IDLE" | "RUNNING" | "PAUSED" | "STOPPED";
  depositSolAmount: number;
  minTradeSol: number;
  maxTradeSol: number;
  minIntervalSec: number;
  maxIntervalSec: number;
  buyRatioPercent: number;
  totalVolumeSol: number;
  totalTradesExecuted: number;
  wallets: SubWallet[];
  trades: TradeLog[];
}

function BotDashboard() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id");
  const initialTokenId = searchParams.get("tokenId");

  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();
  const { network } = useSolanaNetwork();

  const [configs, setConfigs] = useState<BotConfigData[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<BotConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [sweepLoading, setSweepLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Funding modal state
  const [fundingAmount, setFundingAmount] = useState("0.5");
  const [fundingLoading, setFundingLoading] = useState(false);

  // Sweep modal state
  const [showSweepModal, setShowSweepModal] = useState(false);
  const [sweepResult, setSweepResult] = useState<{ sweptSol: number; signatures: string[] } | null>(null);

  // 1. Fetch user bot configs
  const fetchConfigs = async () => {
    try {
      const url = publicKey
        ? `/api/bot/config?creatorWallet=${publicKey.toBase58()}`
        : `/api/bot/config`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.configs) {
        setConfigs(data.configs);
        if (!selectedConfig && data.configs.length > 0) {
          const match = initialId
            ? data.configs.find((c: BotConfigData) => c.id === initialId)
            : initialTokenId
            ? data.configs.find((c: BotConfigData) => c.tokenId === initialTokenId)
            : data.configs[0];
          setSelectedConfig(match || data.configs[0]);
        }
      }
    } catch (err: any) {
      console.error("Failed to load bot configs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, [publicKey, initialId, initialTokenId]);

  // Periodic refresh when bot is active
  useEffect(() => {
    if (!selectedConfig || selectedConfig.status !== "RUNNING") return;
    const interval = setInterval(() => {
      fetch(`/api/bot/config?id=${selectedConfig.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.config) {
            setSelectedConfig(data.config);
          }
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedConfig]);

  // Copy helper
  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Bot controls: Start / Pause / Stop
  const handleControl = async (action: "start" | "pause" | "stop" | "trade_once") => {
    if (!selectedConfig) return;
    setError("");
    setSuccessMsg("");
    setActionLoading(true);

    try {
      const res = await fetch("/api/bot/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          botConfigId: selectedConfig.id,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Action failed");

      if (action === "trade_once") {
        setSuccessMsg("Executed simulated test trade on-chain!");
      } else {
        setSuccessMsg(`Bot status changed to ${data.status}`);
      }

      // Refresh config
      const refreshed = await fetch(`/api/bot/config?id=${selectedConfig.id}`);
      const refreshedData = await refreshed.json();
      if (refreshedData.success) {
        setSelectedConfig(refreshedData.config);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to execute bot action");
    } finally {
      setActionLoading(false);
    }
  };

  // Fund sub-wallets from user Phantom wallet
  const handleFundSubWallets = async () => {
    if (!selectedConfig || !publicKey || !connected) {
      setError("Please connect your wallet to fund the bot sub-wallets.");
      return;
    }

    const solAmount = parseFloat(fundingAmount);
    if (!solAmount || solAmount <= 0) {
      setError("Please enter a valid funding SOL amount.");
      return;
    }

    setFundingLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const wallets = selectedConfig.wallets;
      if (wallets.length === 0) throw new Error("No sub-wallets found in configuration.");

      const solPerWallet = solAmount / wallets.length;
      const lamportsPerWallet = Math.floor(solPerWallet * LAMPORTS_PER_SOL);

      const tx = new Transaction();
      for (const w of wallets) {
        tx.add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new PublicKey(w.publicKey),
            lamports: lamportsPerWallet,
          })
        );
      }

      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");

      setSuccessMsg(
        `Successfully funded ${wallets.length} sub-wallets with ${solAmount} SOL total!`
      );

      // Refresh sub-wallet balances
      await fetch(`/api/bot/wallets?botConfigId=${selectedConfig.id}`);
      const refreshed = await fetch(`/api/bot/config?id=${selectedConfig.id}`);
      const refreshedData = await refreshed.json();
      if (refreshedData.success) {
        setSelectedConfig(refreshedData.config);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to fund sub-wallets");
    } finally {
      setFundingLoading(false);
    }
  };

  // Emergency sweep all funds back to user
  const handleSweepFunds = async () => {
    if (!selectedConfig || !publicKey || !connected) {
      setError("Connect your wallet to receive the swept funds.");
      return;
    }

    setSweepLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/bot/sweep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botConfigId: selectedConfig.id,
          destinationWallet: publicKey.toBase58(),
          network,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Sweep failed");

      setSweepResult({
        sweptSol: data.sweptSol || 0,
        signatures: data.signatures || [],
      });
      setSuccessMsg(data.message || `Successfully swept ${data.sweptSol?.toFixed(4) || 0} SOL back to your wallet!`);

      // Refresh config
      const refreshed = await fetch(`/api/bot/config?id=${selectedConfig.id}`);
      const refreshedData = await refreshed.json();
      if (refreshedData.success) {
        setSelectedConfig(refreshedData.config);
      }
    } catch (err: any) {
      setError(err?.message || "Emergency sweep failed");
    } finally {
      setSweepLoading(false);
    }
  };

  // Calculate total SOL balance across all sub-wallets
  const totalSubWalletsSol =
    selectedConfig?.wallets.reduce((acc, w) => acc + (w.solBalance || 0), 0) || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex-1 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <Bot className="w-7 h-7 text-brand-secondary" />
              Automated Volume & Market Maker Bot
            </h1>
          </div>
          <p className="text-zinc-400 text-sm mt-1">
            Simulate organic multi-wallet trading activity, generate green candles, and boost 24h volume on DexScreener.
          </p>
        </div>

        {/* Token Selector Dropdown */}
        {configs.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">Target Token:</span>
            <select
              value={selectedConfig?.id || ""}
              onChange={(e) => {
                const found = configs.find((c) => c.id === e.target.value);
                if (found) setSelectedConfig(found);
              }}
              className="bg-surface-card border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-brand-primary"
            >
              {configs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.token.name} (${c.token.symbol})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-red-400 hover:text-white">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-zinc-400">
          <Loader2 className="w-8 h-8 animate-spin text-brand-primary mb-3" />
          <p className="text-sm">Loading Volume Bot configurations...</p>
        </div>
      ) : configs.length === 0 ? (
        <div className="bg-[#0f131c] p-10 rounded-xl text-center border border-dashed border-white/10 my-8">
          <div className="w-16 h-16 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center mx-auto mb-4 text-brand-secondary">
            <Bot className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">No Volume Bots Configured Yet</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1 mb-6">
            You can configure an automated volume bot directly when creating a coin, or link one to any existing token in your portfolio.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/create"
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-brand-primary to-brand-secondary text-surface-main shadow-lg hover:brightness-110 flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>Create Token with Volume Bot</span>
            </Link>
            <Link
              href="/portfolio"
              className="px-5 py-2.5 rounded-xl font-bold text-xs glass-panel text-zinc-300 hover:text-white flex items-center gap-2"
            >
              <Layers className="w-4 h-4" />
              <span>View Portfolio</span>
            </Link>
          </div>
        </div>
      ) : (
        selectedConfig && (
          <div className="space-y-8">
            {/* Top Stat Counters */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status Pill */}
              <div className="bg-[#0f131c] p-5 rounded-xl border border-white/[0.08] relative overflow-hidden">
                <span className="text-[11px] font-medium text-zinc-400 block mb-1">
                  Bot Engine Status
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      selectedConfig.status === "RUNNING"
                        ? "bg-emerald-400 ring-2 ring-emerald-400/30"
                        : selectedConfig.status === "PAUSED"
                        ? "bg-amber-400"
                        : "bg-zinc-500"
                    }`}
                  />
                  <span className="text-xl font-extrabold text-white">
                    {selectedConfig.status}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-2">
                  {selectedConfig.status === "RUNNING"
                    ? "Executing randomized buy/sell cycles"
                    : "Bot is currently standing by"}
                </p>
              </div>

              {/* Total Volume */}
              <div className="bg-[#0f131c] p-5 rounded-xl border border-white/[0.08]">
                <span className="text-[11px] font-medium text-zinc-400 block mb-1">
                  Total Volume Generated
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold text-emerald-400 font-mono">
                    {selectedConfig.totalVolumeSol.toFixed(3)}
                  </span>
                  <span className="text-xs font-bold text-zinc-400">SOL</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-2">
                  Cumulative simulated volume recorded
                </p>
              </div>

              {/* Total Trades */}
              <div className="bg-[#0f131c] p-5 rounded-xl border border-white/[0.08]">
                <span className="text-[11px] font-medium text-zinc-400 block mb-1">
                  Total Trades Executed
                </span>
                <span className="text-2xl font-extrabold text-white font-mono">
                  {selectedConfig.totalTradesExecuted}
                </span>
                <p className="text-[10px] text-zinc-500 mt-2">
                  {selectedConfig.buyRatioPercent}% Buys / {100 - selectedConfig.buyRatioPercent}% Sells
                </p>
              </div>

              {/* Sub-Wallets Balance */}
              <div className="bg-[#0f131c] p-5 rounded-xl border border-white/[0.08]">
                <span className="text-[11px] font-medium text-zinc-400 block mb-1">
                  Sub-Wallets Combined SOL
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold text-brand-secondary font-mono">
                    {totalSubWalletsSol.toFixed(4)}
                  </span>
                  <span className="text-xs font-bold text-zinc-400">SOL</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-2">
                  Across {selectedConfig.wallets.length} active trader wallets
                </p>
              </div>
            </div>

            {/* Main Action Command Strip */}
            <div className="bg-[#0f131c] p-6 rounded-xl border border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {selectedConfig.token.imageUrl ? (
                    <img
                      src={selectedConfig.token.imageUrl}
                      alt={selectedConfig.token.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Bot className="w-6 h-6 text-zinc-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {selectedConfig.token.name} ({selectedConfig.token.symbol})
                    <span className="font-mono text-[10px] text-zinc-500">
                      {selectedConfig.token.mintAddress.slice(0, 6)}...{selectedConfig.token.mintAddress.slice(-4)}
                    </span>
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                    <span>Range: {selectedConfig.minTradeSol} - {selectedConfig.maxTradeSol} SOL</span>
                    <span>•</span>
                    <span>Interval: {selectedConfig.minIntervalSec} - {selectedConfig.maxIntervalSec}s</span>
                  </div>
                </div>
              </div>

              {/* Bot Control Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                {selectedConfig.status !== "RUNNING" ? (
                  <button
                    onClick={() => handleControl("start")}
                    disabled={actionLoading}
                    className="px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-surface-main shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start Volume Engine</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleControl("pause")}
                    disabled={actionLoading}
                    className="px-4 py-2.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-surface-main shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause Bot</span>
                  </button>
                )}

                <button
                  onClick={() => handleControl("trade_once")}
                  disabled={actionLoading}
                  className="px-3.5 py-2.5 rounded-xl font-bold text-xs glass-panel text-white hover:bg-white/10 flex items-center gap-1.5 transition-all disabled:opacity-50"
                  title="Execute 1 immediate on-chain trade now"
                >
                  <Zap className="w-3.5 h-3.5 text-brand-secondary" />
                  <span>Manual Trade (Test)</span>
                </button>

                {/* Emergency Sweep Button */}
                <button
                  onClick={() => {
                    setError("");
                    setSweepResult(null);
                    setShowSweepModal(true);
                  }}
                  disabled={sweepLoading}
                  className="px-3.5 py-2.5 rounded-lg font-semibold text-xs bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                  title="Return all SOL and Tokens from sub-wallets back to your wallet"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>1-Click Sweep Funds</span>
                </button>
              </div>
            </div>

            {/* Two-Column Grid: Sub-Wallets & Live Trade Activity */}
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left Column: Sub-Wallets Manager */}
              <div className="bg-[#0f131c] p-6 rounded-xl border border-white/[0.08] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-brand-secondary" />
                    <h3 className="text-sm font-bold text-white">
                      Sub-Wallets ({selectedConfig.wallets.length})
                    </h3>
                  </div>
                  <span className="text-[11px] text-zinc-400">
                    Auto-rotated trader accounts
                  </span>
                </div>

                {/* Fund Sub-wallets Bar */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 font-medium">Fund Wallets:</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={fundingAmount}
                      onChange={(e) => setFundingAmount(e.target.value)}
                      className="w-20 bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono text-center focus:outline-none focus:border-brand-primary"
                    />
                    <span className="text-xs text-zinc-400">SOL</span>
                  </div>
                  <button
                    onClick={handleFundSubWallets}
                    disabled={fundingLoading || !connected}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-brand-primary hover:bg-brand-primary/80 text-white flex items-center gap-1 transition-all disabled:opacity-50"
                  >
                    {fundingLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <DollarSign className="w-3.5 h-3.5" />
                    )}
                    <span>Deposit & Distribute</span>
                  </button>
                </div>

                {/* Wallets Table */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {selectedConfig.wallets.map((w, idx) => (
                    <div
                      key={w.id}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between text-xs hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-white/[0.05] text-[10px] font-mono text-zinc-400 flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-mono text-zinc-300 flex items-center gap-1.5">
                            {w.publicKey.slice(0, 6)}...{w.publicKey.slice(-4)}
                            <button
                              onClick={() => copyText(w.publicKey)}
                              className="text-zinc-500 hover:text-white"
                              title="Copy Address"
                            >
                              {copiedKey === w.publicKey ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </p>
                          <p className="text-[10px] text-zinc-500">
                            {w.totalTrades} trades executed
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-emerald-400 font-bold">
                          {w.solBalance.toFixed(4)} SOL
                        </span>
                        <a
                          href={getExplorerUrl(w.publicKey, "address", network)}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-[10px] text-brand-secondary hover:underline"
                        >
                          Solscan ↗
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Live Trade Feed */}
              <div className="bg-[#0f131c] p-6 rounded-xl border border-white/[0.08] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">
                      Live Trade Activity Feed
                    </h3>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Real-time transactions
                  </span>
                </div>

                {selectedConfig.trades.length === 0 ? (
                  <div className="py-16 text-center text-zinc-500 text-xs">
                    No trades executed yet. Click &quot;Start Volume Engine&quot; or &quot;Manual Trade&quot; to begin!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {selectedConfig.trades.map((t) => (
                      <div
                        key={t.id}
                        className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.type === "BUY"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-red-500/20 text-red-400 border border-red-500/30"
                            }`}
                          >
                            {t.type}
                          </span>
                          <span className="font-mono text-white font-semibold">
                            {t.amountSol} SOL
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-zinc-500">
                            {new Date(t.createdAt).toLocaleTimeString()}
                          </span>
                          {t.txSignature && (
                            <a
                              href={getExplorerUrl(t.txSignature, "tx", network)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-secondary hover:underline flex items-center gap-1 text-[11px]"
                            >
                              <span>tx</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      )}

      {/* Proper Sweep Funds Confirmation Modal Dialog */}
      {showSweepModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f131c] border border-white/10 rounded-xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-5">
            {/* Close X */}
            <button
              onClick={() => {
                if (!sweepLoading) {
                  setShowSweepModal(false);
                  setSweepResult(null);
                }
              }}
              disabled={sweepLoading}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              ✕
            </button>

            {sweepResult ? (
              /* Success View */
              <div className="text-center space-y-4 py-2">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <Check className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-white">Funds Successfully Swept!</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  All sub-wallets were emptied and their remaining SOL balances were sent directly to your Phantom wallet on Solana {network.toUpperCase()}.
                </p>

                <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-left space-y-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block">Total SOL Returned</span>
                  <p className="text-xl font-bold font-mono text-white">
                    +{sweepResult.sweptSol.toFixed(4)} SOL
                  </p>
                  <p className="text-[10px] text-zinc-400">
                    Transferred across {sweepResult.signatures.length} sub-wallets
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowSweepModal(false);
                    setSweepResult(null);
                  }}
                  className="w-full py-2.5 rounded-lg text-xs font-bold bg-[#00f2fe] text-[#070b10] hover:bg-[#00d8e4] transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              /* Confirmation View */
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Sweep All Sub-Wallet Funds</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Emergency withdrawal of bot funds</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/10 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-zinc-400">
                    <span>Target Destination:</span>
                    <span className="font-mono text-brand-secondary font-medium truncate max-w-[180px]">
                      {publicKey ? publicKey.toBase58() : "Not connected"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-400">
                    <span>Recoverable Balance:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {totalSubWalletsSol.toFixed(4)} SOL
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-400">
                    <span>Sub-Wallets Emptied:</span>
                    <span className="font-mono text-white font-medium">
                      {selectedConfig?.wallets.length || 8} Wallets
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
                  <p className="leading-relaxed">
                    This action will immediately stop the volume bot and sweep all remaining SOL back to your connected Phantom wallet.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSweepModal(false)}
                    disabled={sweepLoading}
                    className="flex-1 py-2.5 rounded-lg text-xs font-semibold bg-[#131b26] border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSweepFunds}
                    disabled={sweepLoading || !connected}
                    className="flex-1 py-2.5 rounded-lg text-xs font-bold bg-red-500 hover:bg-red-600 text-white shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {sweepLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sweeping in Parallel...</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Confirm & Sweep</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BotPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex justify-center text-zinc-400">
          <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
        </div>
      }
    >
      <BotDashboard />
    </Suspense>
  );
}

