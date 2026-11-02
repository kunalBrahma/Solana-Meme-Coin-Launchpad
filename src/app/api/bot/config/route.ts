import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSubWallets } from "@/lib/bot/volumeEngine";

function serializeConfig(config: any) {
  if (!config) return null;
  return {
    ...config,
    token: config.token
      ? {
          ...config.token,
          supply: config.token.supply ? config.token.supply.toString() : "0",
        }
      : undefined,
    pool: config.pool
      ? {
          ...config.pool,
          baseTokenAmount: config.pool.baseTokenAmount
            ? config.pool.baseTokenAmount.toString()
            : "0",
        }
      : undefined,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const creatorWallet = searchParams.get("creatorWallet");
    const tokenId = searchParams.get("tokenId");
    const id = searchParams.get("id");

    if (id) {
      const config = await prisma.botConfig.findUnique({
        where: { id },
        include: {
          token: true,
          pool: true,
          wallets: { select: { id: true, publicKey: true, solBalance: true, tokenBalance: true, totalTrades: true } },
          trades: { take: 25, orderBy: { createdAt: "desc" } },
        },
      });
      return NextResponse.json({ success: true, config: serializeConfig(config) });
    }

    const where: any = {};
    if (creatorWallet) where.creatorWallet = creatorWallet;
    if (tokenId) where.tokenId = tokenId;

    const configs = await prisma.botConfig.findMany({
      where,
      include: {
        token: true,
        pool: true,
        wallets: { select: { id: true, publicKey: true, solBalance: true, tokenBalance: true, totalTrades: true } },
        trades: { take: 10, orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, configs: configs.map(serializeConfig) });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch bot configs" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tokenId,
      poolId,
      network = "DEVNET",
      creatorWallet,
      targetPoolAddress,
      depositSolAmount = 0.5,
      walletCount = 4,
      minTradeSol = 0.01,
      maxTradeSol = 0.05,
      minIntervalSec = 10,
      maxIntervalSec = 30,
      buyRatioPercent = 65,
    } = body;

    if (!tokenId || !creatorWallet) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (tokenId, creatorWallet)" },
        { status: 400 }
      );
    }

    // Generate fresh sub-wallets for organic trading simulation
    const generatedWallets = generateSubWallets(walletCount);

    const botConfig = await prisma.botConfig.create({
      data: {
        tokenId,
        poolId: poolId || null,
        network: network?.toLowerCase().includes("mainnet") ? "MAINNET" : "DEVNET",
        creatorWallet,
        targetPoolAddress: targetPoolAddress || null,
        depositSolAmount: Number(depositSolAmount),
        minTradeSol: Number(minTradeSol),
        maxTradeSol: Number(maxTradeSol),
        minIntervalSec: Number(minIntervalSec),
        maxIntervalSec: Number(maxIntervalSec),
        buyRatioPercent: Number(buyRatioPercent),
        status: "IDLE",
        wallets: {
          create: generatedWallets.map((w) => ({
            publicKey: w.publicKey,
            privateKeyEnc: w.privateKeyEnc,
            solBalance: 0,
            tokenBalance: 0,
          })),
        },
      },
      include: {
        wallets: { select: { id: true, publicKey: true, solBalance: true, totalTrades: true } },
        token: true,
      },
    });

    return NextResponse.json({ success: true, botConfig: serializeConfig(botConfig) });
  } catch (err: any) {
    console.error("Failed to create bot config:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to create bot config" },
      { status: 500 }
    );
  }
}

