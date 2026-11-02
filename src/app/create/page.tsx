"use client";

import React, { useState, useRef, useMemo } from "react";
import Link from "next/link";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useSolanaNetwork } from "@/context/WalletContextProvider";
import { buildCreateTokenTransaction } from "@/lib/token";
import { buildCreateRaydiumPoolTransaction } from "@/lib/raydium";
import { getExplorerUrl, getDexScreenerUrl } from "@/lib/solana";
import {
  Rocket,
  ShieldAlert,
  ShieldCheck,
  Check,
  Upload,
  Copy,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Lock,
  Snowflake,
  Ban,
  Droplets,
  Bot,
  Sparkles,
  X,
  Globe,
  Send,
  Radio,
} from "lucide-react";
import { PublicKey } from "@solana/web3.js";

type WizardStep = 1 | 2 | 3;

export default function CreateTokenPage() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();
  const { network } = useSolanaNetwork();

  // Active Wizard Step (Start fresh at Step 1: Token info)
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);

  // Announcement Banner
  const [showBanner, setShowBanner] = useState(true);

  // Step 1: Token Info (Clean, empty state for new coin creation)
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [decimals, setDecimals] = useState(9);
  const [supply, setSupply] = useState("1000000000");
  const [website, setWebsite] = useState("");
  const [twitter, setTwitter] = useState("");
  const [telegram, setTelegram] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Step 2: Features Toggles (Exact matches from screenshot)
  const [revokeFreeze, setRevokeFreeze] = useState(true);
  const [revokeMint, setRevokeMint] = useState(true);
  const [revokeUpdate, setRevokeUpdate] = useState(true);

  // Add Initial Liquidity
  const [addLiquidity, setAddLiquidity] = useState(true);
  const [baseTokenAmount, setBaseTokenAmount] = useState("900000000");
  const [quoteTokenAmount, setQuoteTokenAmount] = useState("1"); // 1 SOL

  // Market Maker Bot
  const [enableMarketMaker, setEnableMarketMaker] = useState(true);
  const [numberOfMakers, setNumberOfMakers] = useState(136);
  const [volumeToGenerate, setVolumeToGenerate] = useState("1"); // 1 SOL
  const [minOrderAmount, setMinOrderAmount] = useState("0.0012323");
  const [maxOrderAmount, setMaxOrderAmount] = useState("0.0022323");
  const [minDelaySec, setMinDelaySec] = useState(10);
  const [maxDelaySec, setMaxDelaySec] = useState(20);

  // Submission & Execution States
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Completed Launch Details
  const [createdResult, setCreatedResult] = useState<{
    mint: string;
    mintSignature: string;
    poolAddress?: string;
    poolSignature?: string;
    botConfigId?: string;
  } | null>(null);

  const platformFeeSol = parseFloat(process.env.NEXT_PUBLIC_PLATFORM_FEE_SOL || "0.15");

  // Calculate Dynamic Total Cost in SOL
  const totalCostSol = useMemo(() => {
    let cost = 0.02; // Base Solana rent & metadata creation fee (Token creation is 100% FREE)
    if (addLiquidity) {
      cost += (parseFloat(quoteTokenAmount) || 0) + platformFeeSol;
    }
    if (enableMarketMaker) {
      cost += parseFloat(volumeToGenerate) || 0;
    }
    return cost.toFixed(2);
  }, [addLiquidity, quoteTokenAmount, enableMarketMaker, volumeToGenerate, platformFeeSol]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Set 90% or 100% of available tokens for liquidity
  const handleSetMaxLiquidityTokens = () => {
    const cleanSupply = supply.replace(/,/g, "");
    setBaseTokenAmount(cleanSupply);
  };

  // Ask AI: Generate random meme token, ticker, lore, and icon
  const handleAskAi = async () => {
    try {
      setIsGeneratingAi(true);
      setError("");

      const res = await fetch("/api/ai/generate-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: name || symbol }),
      });
      const data = await res.json();

      if (data.success && data.token) {
        const { token } = data;
        setName(token.name);
        setSymbol(token.symbol);
        setDescription(token.description);
        if (token.website) setWebsite(token.website);
        if (token.twitter) setTwitter(token.twitter);
        if (token.telegram) setTelegram(token.telegram);

        if (token.imageUri) {
          setImagePreview(token.imageUri);
          try {
            const blobRes = await fetch(token.imageUri);
            const blob = await blobRes.blob();
            const file = new File(
              [blob],
              `${token.symbol.toLowerCase()}-icon.svg`,
              { type: blob.type || "image/svg+xml" }
            );
            setImageFile(file);
          } catch (e) {
            console.warn("Failed to convert AI imageUri to File:", e);
          }
        }
      }
    } catch (err: any) {
      console.error("AI Generation error:", err);
      setError("AI generation failed. Please try again.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Launch Token, Pool, and Market Maker Bot
  const handleDeployAndLaunch = async () => {
    setError("");

    if (!connected || !publicKey) {
      setError("Please connect your Phantom or Solflare wallet first.");
      return;
    }

    if (!name.trim() || !symbol.trim()) {
      setError("Token Name and Symbol are required.");
      setCurrentStep(1);
      return;
    }

    const cleanSupply = supply.replace(/,/g, "") || "0";
    const parsedSupply = BigInt(cleanSupply);
    if (parsedSupply <= 0n) {
      setError("Token supply must be greater than 0.");
      setCurrentStep(1);
      return;
    }

    try {
      setLoading(true);

      // 1. Upload Logo & Metadata
      setStatusMessage("Uploading logo and token metadata...");
      const formData = new FormData();
      if (imageFile) {
        formData.append("file", imageFile);
      }
      formData.append(
        "metadata",
        JSON.stringify({
          name: name.trim(),
          symbol: symbol.trim().toUpperCase(),
          description: description.trim(),
          extensions: {
            website: website.trim(),
            twitter: twitter.trim(),
            telegram: telegram.trim(),
          },
        })
      );

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadData.success) {
        throw new Error(uploadData.error || "Failed to upload metadata");
      }

      const { metadataUri, imageUrl } = uploadData;

      // 2. Build & Sign SPL Token Mint Transaction
      setStatusMessage("Minting SPL Token & revoking authorities...");
      const { transaction: mintTx, mintKeypair } = await buildCreateTokenTransaction(
        connection,
        {
          name: name.trim(),
          symbol: symbol.trim().toUpperCase(),
          uri: metadataUri,
          decimals: Number(decimals),
          supply: parsedSupply,
          revokeFreeze,
          revokeMint,
          revokeUpdate,
          creatorWallet: publicKey,
        }
      );

      setStatusMessage("Please sign token creation in your wallet...");
      const mintSig = await sendTransaction(mintTx, connection);
      setStatusMessage("Confirming token mint on Solana...");
      await connection.confirmTransaction(mintSig, "confirmed");

      // Save Token to PostgreSQL DB
      const tokenRes = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mintAddress: mintKeypair.publicKey.toBase58(),
          name: name.trim(),
          symbol: symbol.trim().toUpperCase(),
          description: description.trim(),
          imageUrl: imageUrl || imagePreview,
          decimals: Number(decimals),
          supply: parsedSupply.toString(),
          freezeRevoked: revokeFreeze,
          mintRevoked: revokeMint,
          updateRevoked: revokeUpdate,
          creatorWallet: publicKey.toBase58(),
          metadataUri,
          mintTxSignature: mintSig,
          network,
        }),
      });

      const tokenData = await tokenRes.json();
      const savedToken = tokenData.token;

      let poolAddress = undefined;
      let poolSig = undefined;

      // 3. Optional: Add Initial Raydium Liquidity Pool
      if (addLiquidity) {
        setStatusMessage("Building Raydium CPMM Liquidity Pool transaction...");
        const cleanBaseAmount = baseTokenAmount.replace(/,/g, "") || "0";
        const baseAmountBigInt = BigInt(cleanBaseAmount) * BigInt(10 ** Number(decimals));

        const poolTxData = await buildCreateRaydiumPoolTransaction(connection, {
          tokenMint: mintKeypair.publicKey,
          tokenAmount: baseAmountBigInt,
          solAmount: parseFloat(quoteTokenAmount) || 1,
          userWallet: publicKey,
          network,
        });

        setStatusMessage("Please sign Raydium pool creation in your wallet...");
        poolSig = await sendTransaction(poolTxData.transaction, connection);
        setStatusMessage("Confirming liquidity pool on Solana...");
        await connection.confirmTransaction(poolSig, "confirmed");

        poolAddress = poolTxData.poolAddress;

        // Save Pool in PostgreSQL DB
        await fetch("/api/pools", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tokenId: savedToken.id,
            poolAddress: poolTxData.poolAddress,
            lpMintAddress: poolTxData.lpMintAddress,
            baseTokenAmount: baseAmountBigInt.toString(),
            solAmount: parseFloat(quoteTokenAmount) || 1,
            poolTxSignature: poolSig,
            network,
          }),
        });
      }

      // 4. Optional: Initialize Market Maker Bot
      let botId = undefined;
      if (enableMarketMaker && savedToken) {
        setStatusMessage("Initializing Market Maker sub-wallets...");
        const botRes = await fetch("/api/bot/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tokenId: savedToken.id,
            creatorWallet: publicKey.toBase58(),
            targetPoolAddress: poolAddress || null,
            depositSolAmount: parseFloat(volumeToGenerate) || 1,
            walletCount: Math.min(numberOfMakers, 8), // active on-chain sub-wallets
            minTradeSol: parseFloat(minOrderAmount) || 0.001,
            maxTradeSol: parseFloat(maxOrderAmount) || 0.005,
            minIntervalSec: minDelaySec,
            maxIntervalSec: maxDelaySec,
            buyRatioPercent: 70, // bullish bias
            network: network === "mainnet-beta" ? "MAINNET" : "DEVNET",
          }),
        });

        const botData = await botRes.json();
        if (botData.success && botData.botConfig) {
          botId = botData.botConfig.id;
        }
      }

      setCreatedResult({
        mint: mintKeypair.publicKey.toBase58(),
        mintSignature: mintSig,
        poolAddress,
        poolSignature: poolSig,
        botConfigId: botId,
      });
    } catch (err: any) {
      console.error("Token creation failed:", err);
      setError(err?.message || "Deployment failed. Please check your SOL balance.");
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  return (
    <div className="min-h-screen bg-[#070b10] text-[#e2e8f0] pb-24">
      {/* Top Announcement Banner (Matching MojoTools screenshot) */}
      {showBanner && (
        <div className="bg-[#00f2fe]/10 border-b border-[#00f2fe]/20 text-[#38ef7d] text-xs py-2 px-4 flex items-center justify-between">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-center w-full justify-center">
            <span>📢</span>
            <span className="font-semibold text-white">Limited Time Offer:</span>
            <span className="text-[#38ef7d]">Token creation is now FREE! Don&apos;t miss out on launching your project.</span>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="text-zinc-400 hover:text-white ml-2 text-sm"
          >
            ✕
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        {/* Main Title */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Create a Token
          </h1>

          {/* 3-Step Wizard Navigation */}
          <div className="flex items-center justify-center gap-3 sm:gap-6 mt-6 max-w-md mx-auto">
            {/* Step 1 */}
            <button
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-2 group cursor-pointer focus:outline-none"
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep > 1
                    ? "bg-[#00f2fe] text-[#070b10]"
                    : currentStep === 1
                    ? "bg-[#00f2fe] text-[#070b10] ring-2 ring-[#00f2fe]/30"
                    : "bg-[#131b26] text-zinc-400 border border-white/10"
                }`}
              >
                {currentStep > 1 ? <Check className="w-4 h-4 stroke-[3]" /> : "1"}
              </div>
              <span
                className={`text-xs font-semibold ${
                  currentStep === 1 ? "text-white" : "text-zinc-400"
                }`}
              >
                Token info
              </span>
            </button>

            {/* Connecting Bar */}
            <div
              className={`h-[2px] w-8 sm:w-12 transition-all ${
                currentStep >= 2 ? "bg-[#00f2fe]" : "bg-white/10"
              }`}
            />

            {/* Step 2 */}
            <button
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-2 group cursor-pointer focus:outline-none"
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep > 2
                    ? "bg-[#00f2fe] text-[#070b10]"
                    : currentStep === 2
                    ? "bg-[#00f2fe] text-[#070b10] ring-2 ring-[#00f2fe]/30"
                    : "bg-[#131b26] text-zinc-400 border border-white/10"
                }`}
              >
                {currentStep > 2 ? <Check className="w-4 h-4 stroke-[3]" /> : "2"}
              </div>
              <span
                className={`text-xs font-semibold ${
                  currentStep === 2 ? "text-white" : "text-zinc-400"
                }`}
              >
                Features
              </span>
            </button>

            {/* Connecting Bar */}
            <div
              className={`h-[2px] w-8 sm:w-12 transition-all ${
                currentStep >= 3 ? "bg-[#00f2fe]" : "bg-white/10"
              }`}
            />

            {/* Step 3 */}
            <button
              onClick={() => setCurrentStep(3)}
              className="flex items-center gap-2 group cursor-pointer focus:outline-none"
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === 3
                    ? "bg-[#00f2fe] text-[#070b10] ring-2 ring-[#00f2fe]/30"
                    : "bg-[#131b26] text-zinc-400 border border-white/10"
                }`}
              >
                3
              </div>
              <span
                className={`text-xs font-semibold ${
                  currentStep === 3 ? "text-white" : "text-zinc-400"
                }`}
              >
                Review
              </span>
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="max-w-4xl mx-auto mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError("")} className="text-red-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Two-Column Layout: Form Controls (Left) vs Token Preview (Right) */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: The Steps (Takes 7/12 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* STEP 1: TOKEN INFO */}
            {currentStep === 1 && (
              <div className="bg-[#0c1219] border border-white/[0.08] rounded-xl p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
                <h2 className="text-lg font-bold text-white border-b border-white/[0.06] pb-4">
                  Step 1: Token Information
                </h2>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Token Name with Ask AI */}
                  <div className="relative">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-zinc-300">
                        Token name
                      </label>

                      {/* Tooltip Pill from screenshot */}
                      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#111923] border border-white/10 text-[11px] text-zinc-300 shadow-sm animate-in fade-in">
                        <span>Let AI Generate Your Token & Icon</span>
                      </div>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="My Token"
                        className="w-full bg-[#111923] border border-white/10 rounded-xl pl-4 pr-28 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#00f2fe] transition-colors"
                      />

                      {/* Ask AI Pill Button */}
                      <button
                        type="button"
                        onClick={handleAskAi}
                        disabled={isGeneratingAi}
                        title="Let AI generate random meme token, lore & icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#00f2fe]/10 hover:bg-[#00f2fe]/20 text-[#00f2fe] border border-[#00f2fe]/40 hover:border-[#00f2fe] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        {isGeneratingAi ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00f2fe]" />
                            <span className="text-[11px]">Thinking...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-[#00f2fe]" />
                            <span>Ask AI</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Symbol / Ticker */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Symbol / Ticker
                    </label>
                    <input
                      type="text"
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                      placeholder="BORK"
                      className="w-full bg-[#111923] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#00f2fe] uppercase transition-colors"
                    />
                  </div>
                </div>

                {/* Supply & Decimals */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Total supply
                    </label>
                    <input
                      type="text"
                      value={supply}
                      onChange={(e) => setSupply(e.target.value)}
                      placeholder="1,000,000,000"
                      className="w-full bg-[#111923] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-[#00f2fe] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Decimals
                    </label>
                    <select
                      value={decimals}
                      onChange={(e) => setDecimals(Number(e.target.value))}
                      className="w-full bg-[#111923] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-[#00f2fe] transition-colors"
                    >
                      <option value={9}>9 decimals</option>
                      <option value={6}>6 decimals</option>
                      <option value={8}>8 decimals</option>
                      <option value={5}>5 decimals</option>
                      <option value={0}>0 decimals (NFT)</option>
                    </select>
                  </div>
                </div>

                {/* Description & Token Icon (Side by Side matching layout) */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Description */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Description
                    </label>
                    <textarea
                      rows={5}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe your token and its purpose."
                      className="w-full h-[150px] bg-[#111923] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#00f2fe] resize-none transition-colors"
                    />
                  </div>

                  {/* Token Icon */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Token icon
                    </label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="h-[150px] border-2 border-dashed border-white/10 hover:border-[#00f2fe]/50 bg-[#111923]/60 rounded-xl p-4 text-center cursor-pointer transition-colors flex flex-col items-center justify-center relative overflow-hidden group"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      {imagePreview ? (
                        <div className="relative flex flex-col items-center justify-center">
                          <img
                            src={imagePreview}
                            alt="Token Icon Preview"
                            className="w-16 h-16 rounded-full object-cover border border-[#00f2fe]/40 mb-1"
                          />
                          <span className="text-[10px] text-zinc-400 group-hover:text-[#00f2fe] transition-colors">
                            Click to change icon
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto mb-2 text-[#00f2fe]">
                            <Upload className="w-4 h-4" />
                          </div>
                          <p className="text-xs text-white font-medium">
                            Upload icon or click Ask AI
                          </p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">PNG, JPG, or SVG (512x512)</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Next Step CTA */}
                <div className="flex justify-end pt-4 border-t border-white/[0.06]">
                  <button
                    onClick={() => {
                      setError("");
                      if (!name.trim() || !symbol.trim()) {
                        setError("Please enter a Token Name and Symbol before proceeding.");
                        return;
                      }
                      if (!baseTokenAmount) {
                        const cleanSupply = Number(supply.replace(/,/g, "") || "1000000000");
                        setBaseTokenAmount((cleanSupply * 0.9).toString());
                      }
                      setCurrentStep(2);
                    }}
                    className="px-6 py-2.5 rounded-lg font-bold text-xs bg-[#00f2fe] text-[#070b10] hover:bg-[#00d8e4] shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <span>Continue to Features</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: FEATURES (THE EXACT SCREENSHOT REPLICA) */}
            {currentStep === 2 && (
              <div className="bg-[#0c1219] border border-white/[0.08] rounded-xl p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
                {/* Total Cost Display at Top of Card */}
                <div className="text-center py-2">
                  <span className="text-3xl sm:text-4xl font-extrabold text-[#00f2fe] font-mono tracking-tight">
                    {totalCostSol} SOL
                  </span>
                  <p className="text-[11px] uppercase font-bold text-zinc-400 tracking-wider mt-1">
                    TOTAL ESTIMATED COST
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-zinc-400 font-mono mt-2">
                    <span className="text-emerald-400 font-bold">Token Creation: FREE</span>
                    <span>•</span>
                    <span>Solana Rent: ~0.02 SOL</span>
                    {addLiquidity && (
                      <>
                        <span>•</span>
                        <span>Pool Deposit: {quoteTokenAmount} SOL</span>
                        <span>•</span>
                        <span className="text-[#00f2fe]">Protocol Fee: {platformFeeSol} SOL (~$15)</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Feature 1: Revoke Freeze Authority */}
                <div className="bg-[#111923] border border-white/[0.06] rounded-xl p-4 flex items-center justify-between gap-4 hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-[#182332] border border-white/10 flex items-center justify-center text-[#00f2fe] flex-shrink-0">
                      <Snowflake className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        Revoke freeze authority
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Nobody can freeze holder accounts. Ever.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={revokeFreeze}
                      onChange={(e) => setRevokeFreeze(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#182332] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00f2fe] shadow-inner"></div>
                  </label>
                </div>

                {/* Feature 2: Revoke Mint Authority */}
                <div className="bg-[#111923] border border-white/[0.06] rounded-xl p-4 flex items-center justify-between gap-4 hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-[#182332] border border-white/10 flex items-center justify-center text-[#00f2fe] flex-shrink-0">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        Revoke mint authority
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Supply is final — no printing more later.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={revokeMint}
                      onChange={(e) => setRevokeMint(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#182332] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00f2fe] shadow-inner"></div>
                  </label>
                </div>

                {/* Feature 3: Revoke Update Authority */}
                <div className="bg-[#111923] border border-white/[0.06] rounded-xl p-4 flex items-center justify-between gap-4 hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-[#182332] border border-white/10 flex items-center justify-center text-[#00f2fe] flex-shrink-0">
                      <Ban className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        Revoke update authority
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Metadata locked. What you see is what it stays.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={revokeUpdate}
                      onChange={(e) => setRevokeUpdate(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#182332] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00f2fe] shadow-inner"></div>
                  </label>
                </div>

                {/* Feature 4: Add Initial Liquidity */}
                <div className="bg-[#111923] border border-white/[0.06] rounded-xl p-4 space-y-4 hover:border-white/10 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-lg bg-[#182332] border border-white/10 flex items-center justify-center text-[#00f2fe] flex-shrink-0">
                        <Droplets className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          Add initial liquidity
                        </h3>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Open a Raydium pool instantly — trading starts with the mint.
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={addLiquidity}
                        onChange={(e) => setAddLiquidity(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#182332] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00f2fe] shadow-inner"></div>
                    </label>
                  </div>

                  {/* Expanded Liquidity Inputs */}
                  {addLiquidity && (
                    <div className="pt-3 border-t border-white/[0.06] space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div>
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="font-semibold text-zinc-300">
                            Base token amount ({symbol || "TOKEN"})
                          </span>
                          <span className="text-zinc-500 text-[11px]">
                            Available: {Number(supply.replace(/,/g, "")).toLocaleString()}{" "}
                            <button
                              onClick={handleSetMaxLiquidityTokens}
                              className="text-[#00f2fe] font-bold hover:underline ml-1"
                            >
                              MAX
                            </button>
                          </span>
                        </div>
                        <input
                          type="text"
                          value={baseTokenAmount}
                          onChange={(e) => setBaseTokenAmount(e.target.value)}
                          placeholder="900,000,000"
                          className="w-full bg-[#0a0f16] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#00f2fe]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1">
                          Quote token amount (SOL)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={quoteTokenAmount}
                          onChange={(e) => setQuoteTokenAmount(e.target.value)}
                          placeholder="1"
                          className="w-full bg-[#0a0f16] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#00f2fe]"
                        />
                        <p className="text-[11px] text-zinc-500 mt-1">
                          Min: 0.5 SOL · Max: 100 SOL
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Feature 5: Market Maker Bot */}
                <div className="bg-[#111923] border border-white/[0.06] rounded-xl p-4 space-y-4 hover:border-white/10 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-lg bg-[#182332] border border-white/10 flex items-center justify-center text-[#00f2fe] flex-shrink-0">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          Market maker bot
                        </h3>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Buy/sell orders from random wallets for organic-looking volume. Needs liquidity.
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={enableMarketMaker}
                        onChange={(e) => setEnableMarketMaker(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#182332] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00f2fe] shadow-inner"></div>
                    </label>
                  </div>

                  {/* Expanded Market Maker Bot Inputs */}
                  {enableMarketMaker && (
                    <div className="pt-3 border-t border-white/[0.06] space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-300 mb-1">
                            Number of Makers:
                          </label>
                          <input
                            type="number"
                            min="10"
                            max="1000"
                            value={numberOfMakers}
                            onChange={(e) => setNumberOfMakers(Number(e.target.value))}
                            className="w-full bg-[#0a0f16] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#00f2fe]"
                          />
                          <p className="text-[10px] text-zinc-500 mt-0.5">
                            Min: 10 · Max: 1000
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-zinc-300 mb-1">
                            Volume to Generate:
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            value={volumeToGenerate}
                            onChange={(e) => setVolumeToGenerate(e.target.value)}
                            className="w-full bg-[#0a0f16] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#00f2fe]"
                          />
                          <p className="text-[10px] text-zinc-500 mt-0.5">
                            Min: 1 SOL · Max: 10 SOL
                          </p>
                        </div>
                      </div>

                      {/* Order Amount Range */}
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300">
                          Order Amount:
                        </label>
                        <p className="text-[11px] text-zinc-400 mb-1.5">
                          Select the amount of SOL each maker will be buying/selling to make it look more organic
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <input
                              type="text"
                              value={minOrderAmount}
                              onChange={(e) => setMinOrderAmount(e.target.value)}
                              className="w-full bg-[#0a0f16] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#00f2fe]"
                            />
                            <p className="text-[10px] text-zinc-500 mt-0.5">Minimum Amount</p>
                          </div>
                          <div>
                            <input
                              type="text"
                              value={maxOrderAmount}
                              onChange={(e) => setMaxOrderAmount(e.target.value)}
                              className="w-full bg-[#0a0f16] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#00f2fe]"
                            />
                            <p className="text-[10px] text-zinc-500 mt-0.5">Maximum Amount</p>
                          </div>
                        </div>
                      </div>

                      {/* Delay Between Buy Transactions */}
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300">
                          Delay Between Buy Transactions (seconds):
                        </label>
                        <p className="text-[11px] text-zinc-400 mb-1.5">
                          Select a time frame between each buy transaction to make it look more organic
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <input
                              type="number"
                              min="3"
                              value={minDelaySec}
                              onChange={(e) => setMinDelaySec(Number(e.target.value))}
                              className="w-full bg-[#0a0f16] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#00f2fe]"
                            />
                            <p className="text-[10px] text-zinc-500 mt-0.5">Minimum Delay</p>
                          </div>
                          <div>
                            <input
                              type="number"
                              min="5"
                              value={maxDelaySec}
                              onChange={(e) => setMaxDelaySec(Number(e.target.value))}
                              className="w-full bg-[#0a0f16] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#00f2fe]"
                            />
                            <p className="text-[10px] text-zinc-500 mt-0.5">Maximum Delay</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Navigation Buttons (Back & Continue) */}
                <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#131b26] text-zinc-300 hover:text-white border border-white/10 hover:border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    onClick={() => setCurrentStep(3)}
                    className="px-6 py-2.5 rounded-lg font-bold text-xs bg-[#00f2fe] text-[#070b10] hover:bg-[#00d8e4] shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: REVIEW & LAUNCH */}
            {currentStep === 3 && (
              <div className="bg-[#0c1219] border border-white/[0.08] rounded-xl p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
                <h2 className="text-lg font-bold text-white border-b border-white/[0.06] pb-4">
                  Step 3: Review & Final Launch
                </h2>

                <div className="space-y-4 text-xs">
                  <div className="bg-[#111923] p-4 rounded-xl border border-white/[0.06] space-y-2">
                    <span className="font-bold text-zinc-300 uppercase tracking-wider text-[10px]">
                      Token Details
                    </span>
                    <div className="flex justify-between text-zinc-400">
                      <span>Name:</span>
                      <span className="text-white font-bold">{name}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Ticker:</span>
                      <span className="text-[#00f2fe] font-bold">${symbol}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Supply:</span>
                      <span className="text-white font-mono">{Number(supply.replace(/,/g, "")).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Decimals:</span>
                      <span className="text-white font-mono">{decimals}</span>
                    </div>
                  </div>

                  <div className="bg-[#111923] p-4 rounded-xl border border-white/[0.06] space-y-2">
                    <span className="font-bold text-zinc-300 uppercase tracking-wider text-[10px]">
                      Security & Authorities
                    </span>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {revokeFreeze && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold text-[10px]">
                          ✓ Freeze Revoked
                        </span>
                      )}
                      {revokeMint && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold text-[10px]">
                          ✓ Mint Revoked
                        </span>
                      )}
                      {revokeUpdate && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold text-[10px]">
                          ✓ Update Revoked
                        </span>
                      )}
                    </div>
                  </div>

                  {addLiquidity && (
                    <div className="bg-[#111923] p-4 rounded-xl border border-white/[0.06] space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-zinc-300 uppercase tracking-wider text-[10px]">
                          Raydium CPMM Pool
                        </span>
                        <span className="text-[10px] text-[#00f2fe] font-mono">
                          Protocol Fee: {platformFeeSol} SOL (~$15)
                        </span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>Base Liquidity:</span>
                        <span className="text-white font-mono">{Number(baseTokenAmount.replace(/,/g, "")).toLocaleString()} {symbol}</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>SOL Deposited into Pool:</span>
                        <span className="text-[#00f2fe] font-mono font-bold">{quoteTokenAmount} SOL</span>
                      </div>
                    </div>
                  )}

                  {enableMarketMaker && (
                    <div className="bg-[#111923] p-4 rounded-xl border border-white/[0.06] space-y-2">
                      <span className="font-bold text-zinc-300 uppercase tracking-wider text-[10px]">
                        Market Maker Bot
                      </span>
                      <div className="flex justify-between text-zinc-400">
                        <span>Simulated Makers:</span>
                        <span className="text-white font-mono">{numberOfMakers} accounts</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>Funding Pool:</span>
                        <span className="text-emerald-400 font-mono font-bold">{volumeToGenerate} SOL</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>Order Range:</span>
                        <span className="text-white font-mono">{minOrderAmount} - {maxOrderAmount} SOL</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Primary Launch Button */}
                <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between gap-4">
                  <button
                    onClick={() => setCurrentStep(2)}
                    disabled={loading}
                    className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#131b26] text-zinc-300 hover:text-white border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    onClick={handleDeployAndLaunch}
                    disabled={loading || !connected}
                    className="flex-1 py-3.5 rounded-lg font-bold text-sm bg-[#00f2fe] hover:bg-[#00d8e4] text-[#070b10] shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#070b10]" />
                        <span>{statusMessage || "Deploying on Solana..."}</span>
                      </>
                    ) : !connected ? (
                      "Connect Wallet to Deploy"
                    ) : (
                      <>
                        <Rocket className="w-4 h-4 fill-current" />
                        <span>Sign & Launch Token ({totalCostSol} SOL)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: TOKEN PREVIEW (Exact match to screenshot) */}
          <div className="lg:col-span-4 sticky top-24 space-y-4">
            <div className="flex items-center justify-between text-xs font-bold tracking-wider text-zinc-400 uppercase">
              <span>TOKEN PREVIEW</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </span>
            </div>

            {/* Preview Card matching screenshot */}
            <div className="bg-[#0c1219] border border-white/[0.08] rounded-xl p-6 relative overflow-hidden shadow-2xl space-y-6">
              {/* Token Avatar with Clean Neon Ring */}
              <div className="text-center pt-2">
                <div className="w-20 h-20 rounded-full mx-auto p-[2px] bg-[#00f2fe]/30 border border-[#00f2fe]/60 mb-3">
                  <div className="w-full h-full rounded-full bg-[#111923] overflow-hidden flex items-center justify-center">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Token Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Rocket className="w-8 h-8 text-[#00f2fe]" />
                    )}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white tracking-tight">
                  {name || "Token Name"}
                </h3>
                <p className="text-xs font-bold text-[#00f2fe] uppercase mt-0.5">
                  ${symbol || "SYMBOL"}
                </p>
              </div>

              {/* Stats Table */}
              <div className="space-y-2 text-xs border-t border-b border-white/[0.06] py-4">
                <div className="flex justify-between text-zinc-400">
                  <span>Supply</span>
                  <span className="font-mono text-white font-bold">
                    {supply ? Number(supply.replace(/,/g, "")).toLocaleString() : "0"}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Decimals</span>
                  <span className="font-mono text-white font-bold">{decimals}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Network</span>
                  <span className="font-mono text-purple-400 font-bold uppercase">
                    {network === "mainnet-beta" ? "Solana" : `Solana (${network})`}
                  </span>
                </div>
              </div>

              {/* Description Section */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                  DESCRIPTION
                </span>
                <p className="text-xs text-zinc-300 leading-relaxed break-words">
                  {description || "No description provided."}
                </p>
              </div>

              {/* Security Badges */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                  SECURITY
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {revokeFreeze && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      ✓ Freeze revoked
                    </span>
                  )}
                  {revokeMint && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      ✓ Mint revoked
                    </span>
                  )}
                  {revokeUpdate && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      ✓ Update revoked
                    </span>
                  )}
                </div>
              </div>

              {/* Extras Badges */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                  EXTRAS
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {enableMarketMaker && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                      <span>🤖</span> Market maker bot
                    </span>
                  )}
                  {addLiquidity && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      <span>💧</span> Raydium CPMM pool
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SUCCESS MODAL UPON SUCCESSFUL DEPLOYMENT */}
      {createdResult && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f131c] border border-white/10 shadow-2xl rounded-xl p-6 sm:p-8 max-w-lg w-full text-center animate-in fade-in zoom-in-95 duration-200 space-y-5">
            <div className="w-16 h-16 rounded-full bg-[#00f2fe]/10 border border-[#00f2fe]/30 flex items-center justify-center mx-auto text-[#00f2fe]">
              <ShieldCheck className="w-9 h-9" />
            </div>

            <div>
              <h3 className="text-2xl font-extrabold text-white">
                Launch Successful! 🚀
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Your SPL token is live on Solana {network.toUpperCase()}, liquidity has been seeded, and Market Maker bot is configured.
              </p>
            </div>

            {/* Token Mint Box */}
            <div className="bg-[#111923] p-3 rounded-xl border border-white/10 flex items-center justify-between text-left">
              <div className="min-w-0 pr-2">
                <p className="text-[10px] uppercase font-bold text-zinc-500">
                  Mint Address
                </p>
                <p className="font-mono text-xs text-[#00f2fe] truncate">
                  {createdResult.mint}
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(createdResult.mint)}
                className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                title="Copy Address"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Action Shortcuts */}
            <div className="space-y-2 pt-2">
              {createdResult.poolAddress && (
                <a
                  href={getDexScreenerUrl(createdResult.poolAddress, network)}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-[#00f2fe] to-[#38ef7d] text-[#070b10] hover:brightness-110 flex items-center justify-center gap-1.5 shadow-lg transition-all"
                >
                  <span>View Chart on DexScreener</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              {createdResult.botConfigId && (
                <Link
                  href={`/bot?id=${createdResult.botConfigId}`}
                  className="w-full py-3 rounded-xl font-bold text-xs bg-[#182332] text-[#00f2fe] border border-[#00f2fe]/30 hover:bg-[#182332]/80 flex items-center justify-center gap-2 transition-all"
                >
                  <Bot className="w-4 h-4" />
                  <span>Open Market Maker Bot Dashboard</span>
                </Link>
              )}

              <a
                href={getExplorerUrl(createdResult.mint, "address", network)}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 rounded-xl font-bold text-xs bg-[#111923] text-zinc-300 hover:text-white border border-white/10 flex items-center justify-center gap-1.5"
              >
                <span>View on Solscan</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={() => setCreatedResult(null)}
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
