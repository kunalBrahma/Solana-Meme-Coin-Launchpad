import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Safe normalization for Solana network -> Prisma Network enum
function toPrismaNetwork(network?: string | null): "DEVNET" | "MAINNET" {
  if (!network) return "DEVNET";
  return network.toLowerCase().includes("mainnet") ? "MAINNET" : "DEVNET";
}

// GET /api/tokens - List all tokens
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const networkParam = searchParams.get("network");

    const tokens = await prisma.token.findMany({
      where: networkParam
        ? { network: toPrismaNetwork(networkParam) }
        : undefined,
      include: {
        liquidityPools: true,
        botConfigs: {
          include: {
            wallets: {
              select: {
                id: true,
                publicKey: true,
                solBalance: true,
                tokenBalance: true,
                totalTrades: true,
              },
            },
            trades: {
              take: 10,
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // BigInt serialization fix
    const serializedTokens = tokens.map((token) => ({
      ...token,
      supply: token.supply.toString(),
      liquidityPools: token.liquidityPools.map((pool) => ({
        ...pool,
        baseTokenAmount: pool.baseTokenAmount.toString(),
      })),
    }));

    return NextResponse.json({ success: true, tokens: serializedTokens });
  } catch (error: any) {
    console.error("Failed to fetch tokens:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch tokens" },
      { status: 500 }
    );
  }
}

// POST /api/tokens - Save newly minted token
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      mintAddress,
      name,
      symbol,
      description,
      imageUrl,
      decimals,
      supply,
      freezeRevoked,
      mintRevoked,
      updateRevoked,
      creatorWallet,
      metadataUri,
      mintTxSignature,
      network = "DEVNET",
    } = body;

    if (!mintAddress || !name || !symbol || !creatorWallet) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const token = await prisma.token.create({
      data: {
        mintAddress,
        name,
        symbol,
        description,
        imageUrl,
        decimals: Number(decimals) || 9,
        supply: BigInt(supply),
        freezeRevoked: Boolean(freezeRevoked),
        mintRevoked: Boolean(mintRevoked),
        updateRevoked: Boolean(updateRevoked),
        creatorWallet,
        metadataUri,
        mintTxSignature,
        network: toPrismaNetwork(network),
      },
    });

    return NextResponse.json({
      success: true,
      token: {
        ...token,
        supply: token.supply.toString(),
      },
    });
  } catch (error: any) {
    console.error("Failed to save token:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save token" },
      { status: 500 }
    );
  }
}

