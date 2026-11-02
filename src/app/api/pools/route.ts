import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function toPrismaNetwork(network?: string | null): "DEVNET" | "MAINNET" {
  if (!network) return "DEVNET";
  return network.toLowerCase().includes("mainnet") ? "MAINNET" : "DEVNET";
}

// GET /api/pools - List all liquidity pools
export async function GET(req: NextRequest) {
  try {
    const pools = await prisma.liquidityPool.findMany({
      include: {
        token: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const serializedPools = pools.map((pool) => ({
      ...pool,
      baseTokenAmount: pool.baseTokenAmount.toString(),
      token: {
        ...pool.token,
        supply: pool.token.supply.toString(),
      },
    }));

    return NextResponse.json({ success: true, pools: serializedPools });
  } catch (error: any) {
    console.error("Failed to fetch pools:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch pools" },
      { status: 500 }
    );
  }
}

// POST /api/pools - Save created liquidity pool
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tokenId,
      poolAddress,
      lpMintAddress,
      baseTokenAmount,
      solAmount,
      poolTxSignature,
      network = "DEVNET",
    } = body;

    if (!tokenId || !poolAddress) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const pool = await prisma.liquidityPool.create({
      data: {
        tokenId,
        poolAddress,
        lpMintAddress,
        baseTokenAmount: BigInt(baseTokenAmount),
        solAmount: Number(solAmount),
        poolTxSignature,
        status: "ACTIVE",
        network: toPrismaNetwork(network),
      },
    });

    return NextResponse.json({
      success: true,
      pool: {
        ...pool,
        baseTokenAmount: pool.baseTokenAmount.toString(),
      },
    });
  } catch (error: any) {
    console.error("Failed to save pool:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save pool" },
      { status: 500 }
    );
  }
}

// PATCH /api/pools - Update pool status or remaining liquidity
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { poolAddress, status, solAmount, baseTokenAmount } = body;

    if (!poolAddress) {
      return NextResponse.json(
        { success: false, error: "Missing poolAddress" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (status !== undefined) {
      updateData.status = status;
    }
    if (solAmount !== undefined) {
      updateData.solAmount = Number(solAmount);
    }
    if (baseTokenAmount !== undefined) {
      updateData.baseTokenAmount = BigInt(baseTokenAmount);
    }

    const updated = await prisma.liquidityPool.update({
      where: { poolAddress },
      data: updateData,
      include: { token: true },
    });

    return NextResponse.json({
      success: true,
      pool: {
        ...updated,
        baseTokenAmount: updated.baseTokenAmount.toString(),
        token: {
          ...updated.token,
          supply: updated.token.supply.toString(),
        },
      },
    });
  } catch (error: any) {
    console.error("Failed to update pool:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update pool" },
      { status: 500 }
    );
  }
}


