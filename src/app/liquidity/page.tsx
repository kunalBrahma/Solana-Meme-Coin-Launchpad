"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useSolanaNetwork } from "@/context/WalletContextProvider";
import {
  buildCreateRaydiumPoolTransaction,
  buildRemoveRaydiumLiquidityTransaction,
} from "@/lib/raydium";
import { getExplorerUrl, getDexScreenerUrl, isValidSolanaAddress } from "@/lib/solana";
import {
  Droplets,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  ExternalLink,
  Check,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  MinusCircle,
  PlusCircle,
  AlertTriangle,
} from "lucide-react";

interface SavedToken {
  id: string;
  mintAddress: string;
  name: string;
  symbol: string;
  supply: string;
  decimals: number;
  imageUrl?: string;
}

interface SavedPool {
  id: string;
  poolAddress: string;
  lpMintAddress?: string;
  baseTokenAmount: string;
  solAmount: number;
  status?: string;
  poolTxSignature?: string;
  token: {
    id: string;
    mintAddress: string;
    name: string;
    symbol: string;
    decimals: number;
  };
}

function LiquidityForm() {
  const searchParams = useSearchParams();
  const initialTokenMint = searchParams.get("tokenMint") || "";
  const initialTab = searchParams.get("tab") === "remove" ? "remove" : "add";
  const initialPoolAddress = searchParams.get("poolAddress") || "";

  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();
  const { network } = useSolanaNetwork();

  // Active Tab: 'add' or 'remove'
  const [activeTab, setActiveTab] = useState<"add" | "remove">(initialTab);

  // ADD LIQUIDITY STATE
  const [tokens, setTokens] = useState<SavedToken[]>([]);
  const [selectedTokenMint, setSelectedTokenMint] = useState(initialTokenMint);
  const [selectedToken, setSelectedToken] = useState<SavedToken | null>(null);
  const [tokenAmount, setTokenAmount] = useState("");
  const [solAmount, setSolAmount] = useState("1.0");

  // REMOVE LIQUIDITY STATE
  const [pools, setPools] = useState<SavedPool[]>([]);
  const [selectedPoolAddress, setSelectedPoolAddress] = useState(initialPoolAddress);
  const [selectedPool, setSelectedPool] = useState<SavedPool | null>(null);
  const [removePercentage, setRemovePercentage] = useState<number>(100);
  const [realSolPrice, setRealSolPrice] = useState<number>(95.44);

  // Status & UI States
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  const [createdPool, setCreatedPool] = useState<{
    poolAddress: string;
    signature: string;
  } | null>(null);

  const [removedLiquidityResult, setRemovedLiquidityResult] = useState<{
    signature: string;
    withdrawnSol: number;
    withdrawnTokens: string;
    note?: string;
  } | null>(null);

  // Fetch tokens and pools
  useEffect(() => {
    async function loadData() {
      try {
        setFetchingData(true);
        // Load tokens
        fetch("/api/sol-price")
          .then((r) => r.json())
          .then((d) => {
            if (d.success && d.price) setRealSolPrice(d.price);
          })
          .catch(() => {});

        const tokenRes = await fetch(`/api/tokens?network=${network}`);
        const tokenData = await tokenRes.json();
        if (tokenData.success && tokenData.tokens) {
          setTokens(tokenData.tokens);
          if (initialTokenMint) {
            const found = tokenData.tokens.find(
              (t: SavedToken) => t.mintAddress === initialTokenMint
            );
            if (found) {
              setSelectedToken(found);
              setTokenAmount((BigInt(found.supply) * 8n / 10n).toString());
            }
          }
        }

        // Load pools
        const poolRes = await fetch("/api/pools");
        const poolData = await poolRes.json();
        if (poolData.success && poolData.pools) {
          setPools(poolData.pools);
          if (initialPoolAddress) {
            const foundPool = poolData.pools.find(
              (p: SavedPool) => p.poolAddress === initialPoolAddress
            );
            if (foundPool) setSelectedPool(foundPool);
          } else if (poolData.pools.length > 0) {
            setSelectedPool(poolData.pools[0]);
            setSelectedPoolAddress(poolData.pools[0].poolAddress);
          }
        }
      } catch (err) {
        console.error("Failed to fetch tokens/pools:", err);
      } finally {
        setFetchingData(false);
      }
    }
    loadData();
  }, [network, initialTokenMint, initialPoolAddress]);

  // Handle Token Selection (Add Liquidity)
  const handleSelectToken = (mint: string) => {
    setSelectedTokenMint(mint);
    const found = tokens.find((t) => t.mintAddress === mint) || null;
    setSelectedToken(found);
    if (found) {
      setTokenAmount((BigInt(found.supply) * 8n / 10n).toString());
    }
  };

  // Handle Pool Selection (Remove Liquidity)
  const handleSelectPool = (address: string) => {
    setSelectedPoolAddress(address);
    const found = pools.find((p) => p.poolAddress === address) || null;
    setSelectedPool(found);
  };

  // EXECUTE: Add Liquidity
  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!connected || !publicKey) {
      setError("Please connect your Phantom or Solflare wallet first.");
      return;
    }

    if (!isValidSolanaAddress(selectedTokenMint)) {
      setError("Please select or enter a valid Solana SPL token mint address.");
      return;
    }

    const solNum = Number(solAmount);
    if (isNaN(solNum) || solNum <= 0) {
      setError("SOL deposit amount must be greater than 0.");
      return;
    }

    const cleanTokenAmt = tokenAmount.replace(/,/g, "");
    if (!cleanTokenAmt || BigInt(cleanTokenAmt) <= 0n) {
      setError("Token amount must be greater than 0.");
      return;
    }

    try {
      setLoading(true);
      setStatusMessage("Preparing Raydium CPMM Pool transaction...");

      const tokenMintKey = new PublicKey(selectedTokenMint);
      const tokenDecimals = selectedToken?.decimals || 9;
      const baseAmountRaw = BigInt(cleanTokenAmt) * BigInt(10 ** tokenDecimals);

      const { transaction, poolAddress, lpMintAddress } =
        await buildCreateRaydiumPoolTransaction(connection, {
          tokenMint: tokenMintKey,
          tokenAmount: baseAmountRaw,
          solAmount: solNum,
          userWallet: publicKey,
          network,
        });

      setStatusMessage("Please sign the transaction in your wallet...");
      const signature = await sendTransaction(transaction, connection);

      setStatusMessage("Confirming pool initialization on Solana...");
      await connection.confirmTransaction(signature, "confirmed");

      // Save pool to PostgreSQL
      await fetch("/api/pools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenId: selectedToken?.id || selectedTokenMint,
          poolAddress,
          lpMintAddress,
          baseTokenAmount: baseAmountRaw.toString(),
          solAmount: solNum,
          poolTxSignature: signature,
          network,
        }),
      });

      setCreatedPool({ poolAddress, signature });
    } catch (err: any) {
      console.error("Pool creation error:", err);
      setError(err?.message || "Failed to create pool. Check your SOL balance.");
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  // Quick Action: Mark Pool as Withdrawn
  const handleMarkAsWithdrawn = async (poolAddress: string) => {
    try {
      setLoading(true);
      setStatusMessage("Marking pool as withdrawn...");
      const res = await fetch("/api/pools", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poolAddress,
          solAmount: 0,
          status: "WITHDRAWN",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedPool((prev) =>
          prev && prev.poolAddress === poolAddress
            ? { ...prev, solAmount: 0, status: "WITHDRAWN" }
            : prev
        );
        setPools((prev) =>
          prev.map((p) =>
            p.poolAddress === poolAddress ? { ...p, solAmount: 0, status: "WITHDRAWN" } : p
          )
        );
      }
    } catch (err: any) {
      console.error("Failed to mark as withdrawn:", err);
      setError(err?.message || "Failed to mark pool as withdrawn.");
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  // EXECUTE: Remove Liquidity
  const handleRemoveLiquidity = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!connected || !publicKey) {
      setError("Please connect your Phantom or Solflare wallet first.");
      return;
    }

    if (!selectedPool) {
      setError("Please select a pool to remove liquidity from.");
      return;
    }

    if (selectedPool.status === "WITHDRAWN" || selectedPool.solAmount <= 0) {
      setError("This pool has already been withdrawn. No remaining liquidity exists to remove.");
      return;
    }

    try {
      setLoading(true);
      setStatusMessage("Calculating LP withdrawal share...");

      const poolPubkey = new PublicKey(selectedPool.poolAddress);
      const tokenMint = new PublicKey(selectedPool.token.mintAddress);
      const lpMint = selectedPool.lpMintAddress
        ? new PublicKey(selectedPool.lpMintAddress)
        : poolPubkey;

      // Calculate approximate withdrawal amounts based on percentage
      const solToWithdraw = selectedPool.solAmount * (removePercentage / 100);
      const tokensToWithdraw = (
        (BigInt(selectedPool.baseTokenAmount) * BigInt(removePercentage)) / 100n
      ).toString();

      setStatusMessage("Checking LP & token balances...");
      const { transaction, willExecuteOnChain } = await buildRemoveRaydiumLiquidityTransaction(
        connection,
        {
          poolAddress: poolPubkey,
          tokenMint,
          lpMint,
          lpAmount: BigInt(1000000000), // LP share amount
          userWallet: publicKey,
          network,
        }
      );

      let signature = selectedPool.poolTxSignature || "";
      if (willExecuteOnChain) {
        setStatusMessage("Please sign the withdrawal in your wallet...");
        signature = await sendTransaction(transaction, connection);
        setStatusMessage("Confirming withdrawal on Solana...");
        await connection.confirmTransaction(signature, "confirmed");
      } else {
        // The LP tokens or WSOL have already been redeemed/unwrapped on chain
        setStatusMessage("Syncing withdrawal status to database...");
      }

      // Also sweep any remaining SOL from bot sub-wallets back to creator's wallet
      try {
        setStatusMessage("Returning SOL from trader sub-wallets...");
        const botConfigRes = await fetch(`/api/bot/config?creatorWallet=${publicKey.toBase58()}`);
        const botConfigData = await botConfigRes.json();
        if (botConfigData.success && botConfigData.configs) {
          const matchingConfig = botConfigData.configs.find(
            (c: any) =>
              c.tokenId === selectedPool.token?.id ||
              c.pool?.poolAddress === selectedPool.poolAddress ||
              c.targetPoolAddress === selectedPool.poolAddress
          );
          if (matchingConfig && matchingConfig.id) {
            await fetch("/api/bot/sweep", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                botConfigId: matchingConfig.id,
                destinationWallet: publicKey.toBase58(),
                network,
              }),
            });
          }
        }
      } catch (sweepErr) {
        console.warn("Sub-wallet sweep note:", sweepErr);
      }

      // Update pool in database
      const newSolAmount = Math.max(0, Number((selectedPool.solAmount - solToWithdraw).toFixed(4)));
      const newStatus = removePercentage === 100 || newSolAmount <= 0 ? "WITHDRAWN" : "ACTIVE";

      try {
        await fetch("/api/pools", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            poolAddress: selectedPool.poolAddress,
            solAmount: newSolAmount,
            status: newStatus,
          }),
        });
      } catch (updateErr) {
        console.warn("Failed to patch pool in DB:", updateErr);
      }

      // Update local state
      const updatedPool = {
        ...selectedPool,
        solAmount: newSolAmount,
        status: newStatus,
      };
      setSelectedPool(updatedPool);
      setPools((prev) =>
        prev.map((p) => (p.poolAddress === selectedPool.poolAddress ? updatedPool : p))
      );

      setRemovedLiquidityResult({
        signature,
        withdrawnSol: solToWithdraw,
        withdrawnTokens: tokensToWithdraw,
        note: !willExecuteOnChain
          ? "Liquidity was already extracted on-chain. Pool status has been synced to Withdrawn."
          : undefined,
      });
    } catch (err: any) {
      console.error("Remove liquidity error:", err);
      setError(err?.message || "Failed to remove liquidity.");
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex-1 space-y-8">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Droplets className="w-7 h-7 text-brand-secondary" />
            Raydium CPMM Liquidity Manager
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Deposit or withdraw liquidity from Raydium pools on Solana {network.toUpperCase()}.
          </p>
        </div>

        {/* Tab Switcher: Add vs Remove */}
        <div className="flex bg-[#111923] p-1 rounded-xl border border-white/10 w-fit">
          <button
            onClick={() => {
              setActiveTab("add");
              setError("");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "add"
                ? "bg-[#00f2fe] text-[#070b10] border border-[#00f2fe]"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Liquidity</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("remove");
              setError("");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "remove"
                ? "bg-red-500 text-white border border-red-500"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <MinusCircle className="w-3.5 h-3.5" />
            <span>Remove Liquidity</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TAB 1: ADD LIQUIDITY */}
      {activeTab === "add" && (
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <form
              onSubmit={handleCreatePool}
              className="bg-[#0f131c] p-6 sm:p-8 rounded-xl border border-white/[0.08] space-y-6"
            >
              {/* Select Token from Portfolio */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Select Token
                </label>

                {tokens.length > 0 ? (
                  <select
                    value={selectedTokenMint}
                    onChange={(e) => handleSelectToken(e.target.value)}
                    className="w-full custom-input px-4 py-3 rounded-xl text-sm text-white font-mono"
                  >
                    <option value="">-- Choose from your minted tokens --</option>
                    {tokens.map((t) => (
                      <option key={t.id} value={t.mintAddress}>
                        {t.name} (${t.symbol}) - {t.mintAddress.slice(0, 6)}...
                        {t.mintAddress.slice(-4)}
                      </option>
                    ))}
                  </select>
                ) : fetchingData ? (
                  <div className="p-3 text-xs text-zinc-500 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading your tokens...
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Paste SPL Token Mint Address"
                    value={selectedTokenMint}
                    onChange={(e) => handleSelectToken(e.target.value)}
                    className="w-full custom-input px-4 py-3 rounded-xl text-sm text-white font-mono"
                    required
                  />
                )}
              </div>

              {/* Token Deposit Amount */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Token Amount to Pool
                </label>
                <input
                  type="text"
                  placeholder="e.g. 800000000"
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(e.target.value)}
                  className="w-full custom-input px-4 py-3 rounded-xl text-sm text-white font-mono"
                  required
                />
                {selectedToken && (
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Total Minted Supply:{" "}
                    {Number(selectedToken.supply).toLocaleString()} {selectedToken.symbol}
                  </p>
                )}
              </div>

              {/* SOL Quote Amount */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  SOL Amount to Pair
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    placeholder="1.0"
                    value={solAmount}
                    onChange={(e) => setSolAmount(e.target.value)}
                    className="w-full custom-input px-4 py-3 rounded-xl text-sm text-white font-mono"
                    required
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-brand-secondary">
                    SOL
                  </div>
                </div>
              </div>

              {/* Fee Breakdown */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs space-y-1.5 text-zinc-400">
                <div className="flex justify-between">
                  <span>Pool Initial Liquidity:</span>
                  <span className="text-white font-mono font-bold">{solAmount || "0"} SOL</span>
                </div>
                <div className="flex justify-between">
                  <span>Protocol Launch Fee:</span>
                  <span className="text-[#00f2fe] font-mono font-bold">0.15 SOL (~$15 USD)</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-white/[0.06] text-white font-bold">
                  <span>Total Transaction Amount:</span>
                  <span className="text-emerald-400 font-mono">
                    {(Number(solAmount || 0) + 0.15).toFixed(2)} SOL
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !connected}
                className="w-full py-3.5 rounded-xl font-bold text-sm bg-[#00f2fe] hover:bg-[#00d8e4] text-[#070b10] shadow-sm active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{statusMessage || "Deploying Pool..."}</span>
                  </>
                ) : !connected ? (
                  "Connect Wallet to Create Pool"
                ) : (
                  <>
                    <Droplets className="w-4 h-4" />
                    <span>Create Raydium Pool ({(Number(solAmount || 0) + 0.15).toFixed(2)} SOL)</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Info Card */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Pool Architecture
            </h3>
            <div className="bg-[#0f131c] p-6 rounded-xl border border-white/[0.08] space-y-4 text-xs">
              <div className="space-y-1">
                <span className="font-bold text-white">Program Type:</span>
                <p className="text-zinc-400 font-mono">Raydium CPMM (Constant Product)</p>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-white">Immediate Indexing:</span>
                <p className="text-zinc-400">
                  DexScreener, Birdeye & Jupiter pick up the pool automatically within 10-30 seconds.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REMOVE LIQUIDITY */}
      {activeTab === "remove" && (() => {
        const isWithdrawn = Boolean(
          selectedPool && (selectedPool.status === "WITHDRAWN" || selectedPool.solAmount <= 0)
        );

        return (
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <form
                onSubmit={handleRemoveLiquidity}
                className="bg-[#0f131c] p-6 sm:p-8 rounded-xl border border-white/[0.08] space-y-6"
              >
                {/* Select Pool */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      Select Active Pool to Withdraw
                    </label>
                    {selectedPool && !isWithdrawn && (
                      <button
                        type="button"
                        onClick={() => handleMarkAsWithdrawn(selectedPool.poolAddress)}
                        className="text-[11px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                        title="If you already extracted liquidity on Solana or LP balance is 0"
                      >
                        Already withdrew on-chain?
                      </button>
                    )}
                  </div>
                  {pools.length > 0 ? (
                    <select
                      value={selectedPoolAddress}
                      onChange={(e) => handleSelectPool(e.target.value)}
                      className="w-full custom-input px-4 py-3 rounded-xl text-sm text-white font-mono"
                    >
                      <option value="">-- Choose your pool --</option>
                      {pools.map((p) => {
                        const withdrawn = p.status === "WITHDRAWN" || p.solAmount <= 0;
                        return (
                          <option key={p.id} value={p.poolAddress}>
                            {withdrawn ? `[WITHDRAWN] ${p.token.name} ($${p.token.symbol}) · 0 SOL Remaining` : `${p.token.name} ($${p.token.symbol}) · ${p.solAmount} SOL Initial Pool`}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 text-zinc-400 text-xs text-center">
                      No active pools found in your local database.
                    </div>
                  )}
                </div>

                {selectedPool && (
                  <div className="p-4 rounded-xl bg-[#111923] border border-white/10 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Pool Address:</span>
                      <span className="font-mono text-brand-secondary">
                        {selectedPool.poolAddress.slice(0, 8)}...{selectedPool.poolAddress.slice(-6)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Pool Status:</span>
                      {isWithdrawn ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-400" />
                          WITHDRAWN
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Remaining SOL:</span>
                      <span className={`font-mono font-bold ${isWithdrawn ? "text-zinc-500" : "text-emerald-400"}`}>
                        {isWithdrawn ? "0.0000 SOL" : `${selectedPool.solAmount} SOL`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Seeded Tokens:</span>
                      <span className="font-mono text-white font-bold">
                        {selectedPool.token.symbol}
                      </span>
                    </div>
                  </div>
                )}

                {/* Percentage Selector */}
                <div className={isWithdrawn ? "opacity-40 pointer-events-none" : ""}>
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="font-bold text-zinc-300 uppercase tracking-wider">
                      Withdrawal Percentage
                    </span>
                    <span className="font-mono text-red-400 font-bold text-sm">
                      {isWithdrawn ? "0%" : `${removePercentage}%`}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[25, 50, 75, 100].map((pct) => (
                      <button
                        type="button"
                        key={pct}
                        disabled={isWithdrawn}
                        onClick={() => setRemovePercentage(pct)}
                        className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          removePercentage === pct && !isWithdrawn
                            ? "bg-red-500 text-white ring-1 ring-red-400"
                            : "bg-white/[0.04] text-zinc-400 hover:text-white"
                        }`}
                      >
                        {pct === 100 ? "100% (MAX)" : `${pct}%`}
                      </button>
                    ))}
                  </div>

                  <input
                    type="range"
                    min="1"
                    max="100"
                    disabled={isWithdrawn}
                    value={removePercentage}
                    onChange={(e) => setRemovePercentage(Number(e.target.value))}
                    className="w-full accent-red-500 cursor-pointer disabled:opacity-50"
                  />
                </div>

                {/* Notice / Warning Card */}
                {isWithdrawn ? (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400" />
                    <div>
                      <span className="font-bold text-white block text-sm">
                        Liquidity Fully Withdrawn
                      </span>
                      <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                        This pool's initial liquidity has already been extracted. The pool balance is 0 SOL and trading on Raydium is stopped.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
                    <p className="leading-relaxed">
                      Removing liquidity redeems your LP tokens and returns the underlying SOL and tokens straight back to your wallet. If you withdraw 100%, trading on this pool will stop.
                    </p>
                  </div>
                )}

                {/* Submit Button */}
                {isWithdrawn ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-3.5 rounded-xl font-bold text-sm bg-zinc-800/80 text-zinc-500 border border-white/10 cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>Liquidity Already Withdrawn (0 SOL Remaining)</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading || !connected || !selectedPool}
                    className="w-full py-3.5 rounded-xl font-bold text-sm bg-red-500 hover:bg-red-600 text-white shadow-sm active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{statusMessage || "Processing Withdrawal..."}</span>
                      </>
                    ) : !connected ? (
                      "Connect Wallet to Withdraw"
                    ) : (
                      <>
                        <MinusCircle className="w-4 h-4" />
                        <span>Withdraw {removePercentage}% Liquidity to Wallet</span>
                      </>
                    )}
                  </button>
                )}
              </form>
            </div>

            {/* Right Info Card */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Withdrawal Summary & Payout
              </h3>
              <div className="bg-[#0f131c] p-6 rounded-xl border border-white/[0.08] space-y-4 text-xs">
                {selectedPool ? (
                  isWithdrawn ? (
                    <>
                      <div className="space-y-3 pb-3 border-b border-white/[0.06]">
                        <span className="text-[11px] text-zinc-500 uppercase font-bold block">
                          Current Pool Balance
                        </span>
                        <div className="bg-zinc-800/50 border border-white/10 p-3.5 rounded-xl">
                          <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                            Real Cash (SOL) You Will Receive:
                          </span>
                          <p className="text-xl font-extrabold text-zinc-500 font-mono mt-0.5">
                            0.0000 SOL
                          </p>
                          <p className="text-xs font-bold text-zinc-600 font-mono mt-0.5">
                            ≈ $0.00 USD
                          </p>
                          <span className="text-[10px] text-zinc-500 mt-1 block">
                            Liquidity pool is completely empty (0 SOL)
                          </span>
                        </div>

                        <div className="bg-white/[0.03] border border-white/10 p-3 rounded-xl">
                          <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                            Unsold Tokens Returned:
                          </span>
                          <p className="text-base font-bold text-zinc-400 font-mono mt-0.5">
                            Tokens Extracted
                          </p>
                        </div>
                      </div>

                      {/* Pool Status Box */}
                      <div className="p-3 rounded-xl bg-zinc-800/40 border border-white/10 text-zinc-400 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                          Pool Status:
                        </span>
                        <p className="text-xs font-bold text-white">
                          Trading Stopped · Liquidity Extracted
                        </p>
                        <p className="text-[11px] text-zinc-500 leading-relaxed">
                          Because 100% of the SOL liquidity was extracted into your wallet, the Raydium AMM pool is emptied and no longer tradable.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2 pb-3 border-b border-white/[0.06]">
                        <span className="text-[11px] text-zinc-500 uppercase font-bold block">
                          Estimated Payout to Your Wallet
                        </span>
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
                          <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                            Real Cash (SOL) You Will Receive:
                          </span>
                          <p className="text-xl font-extrabold text-white font-mono mt-0.5">
                            {((selectedPool.solAmount * removePercentage) / 100).toFixed(4)} SOL
                          </p>
                          <p className="text-xs font-bold text-emerald-400 font-mono mt-0.5">
                            ≈ ${(((selectedPool.solAmount * removePercentage) / 100) * realSolPrice).toFixed(2)} USD
                          </p>
                          <span className="text-[10px] text-zinc-400 mt-1 block">
                            Based on live real SOL price: <strong>${realSolPrice.toFixed(2)}</strong>
                          </span>
                        </div>

                        <div className="bg-white/[0.03] border border-white/10 p-3 rounded-xl">
                          <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                            Unsold Tokens Returned:
                          </span>
                          <p className="text-base font-bold text-white font-mono mt-0.5">
                            {Math.floor(
                              (Number(selectedPool.baseTokenAmount || 0) * removePercentage) / 100
                            ).toLocaleString()}{" "}
                            {selectedPool.token.symbol}
                          </p>
                        </div>
                      </div>

                      {/* Impact on Token Market Price */}
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-red-400 block">
                          Coin Value After {removePercentage}% Withdrawal:
                        </span>
                        <p className="text-xs font-bold text-white">
                          {removePercentage === 100
                            ? "Coin price becomes $0.00 (Trading Stops)"
                            : `Pool SOL drops to ${(
                                selectedPool.solAmount *
                                (1 - removePercentage / 100)
                              ).toFixed(4)} SOL`}
                        </p>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          {removePercentage === 100
                            ? "Because 100% of the SOL liquidity is extracted into your wallet, the Raydium AMM pool is emptied. No one can trade the coin anymore, dropping its tradable market price to zero."
                            : "Partial removal leaves some SOL in the pool so the coin remains tradable."}
                        </p>
                      </div>
                    </>
                  )
                ) : (
                  <p className="text-zinc-500 italic">Select a pool to preview payout calculation.</p>
                )}

                <div className="pt-2 border-t border-white/[0.06] space-y-1">
                  <span className="font-bold text-white">Recipient Wallet:</span>
                  <p className="text-brand-secondary font-mono truncate">
                    {publicKey ? publicKey.toBase58() : "Not connected"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Success Modal: Created Pool */}
      {createdPool && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f131c] p-6 sm:p-8 rounded-xl max-w-md w-full border border-white/10 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 text-emerald-400">
              <Droplets className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-white">Raydium Pool Created!</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Your liquidity pool is live on Solana {network.toUpperCase()}.
            </p>

            <div className="mt-5 p-3 rounded-xl bg-white/[0.03] border border-white/10 text-left">
              <p className="text-[10px] uppercase font-bold text-zinc-500">Pool Address</p>
              <p className="font-mono text-xs text-brand-secondary truncate">
                {createdPool.poolAddress}
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-2.5">
              <a
                href={getDexScreenerUrl(createdPool.poolAddress, network)}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 rounded-xl font-bold text-xs bg-gradient-to-r from-brand-primary to-brand-secondary text-surface-main shadow-lg hover:brightness-110 flex items-center justify-center gap-2"
              >
                <span>View Chart on DexScreener</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <a
                href={getExplorerUrl(createdPool.poolAddress, "address", network)}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 rounded-xl font-bold text-xs glass-panel text-zinc-300 hover:text-white flex items-center justify-center gap-1.5"
              >
                <span>View on Solscan</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={() => setCreatedPool(null)}
                className="text-xs text-zinc-500 hover:text-zinc-300 py-1"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal: Removed Liquidity */}
      {removedLiquidityResult && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f131c] p-6 sm:p-8 rounded-xl max-w-md w-full border border-white/10 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4 text-red-400">
              <Check className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-white">Liquidity Withdrawn!</h3>
            <p className="text-xs text-zinc-400 mt-1">
              SOL and tokens have been returned straight back to your wallet.
            </p>

            <div className="mt-5 p-3 rounded-xl bg-white/[0.03] border border-white/10 text-left space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Estimated Withdrawn SOL:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  ~{removedLiquidityResult.withdrawnSol.toFixed(4)} SOL
                </span>
              </div>
              {removedLiquidityResult.note && (
                <p className="text-[11px] text-emerald-300/90 pt-1 border-t border-white/10">
                  {removedLiquidityResult.note}
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-2.5">
              {removedLiquidityResult.signature &&
                removedLiquidityResult.signature !== "already-withdrawn" && (
                  <a
                    href={getExplorerUrl(removedLiquidityResult.signature, "tx", network)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 rounded-xl font-bold text-xs glass-panel text-zinc-300 hover:text-white flex items-center justify-center gap-1.5"
                  >
                    <span>View Withdrawal on Solscan</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

              <button
                onClick={() => setRemovedLiquidityResult(null)}
                className="text-xs text-zinc-500 hover:text-zinc-300 py-1"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LiquidityPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-zinc-500 text-xs">
          Loading liquidity interface...
        </div>
      }
    >
      <LiquidityForm />
    </Suspense>
  );
}
