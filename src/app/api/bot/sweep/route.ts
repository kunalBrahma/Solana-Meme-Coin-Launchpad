import { NextRequest, NextResponse } from "next/server";
import { sweepAllFunds } from "@/lib/bot/volumeEngine";
import { isValidSolanaAddress } from "@/lib/solana";

export async function POST(req: NextRequest) {
  try {
    const { botConfigId, destinationWallet, network = "devnet" } = await req.json();

    if (!botConfigId || !destinationWallet) {
      return NextResponse.json(
        { success: false, error: "Missing botConfigId or destinationWallet" },
        { status: 400 }
      );
    }

    if (!isValidSolanaAddress(destinationWallet)) {
      return NextResponse.json(
        { success: false, error: "Invalid Solana destination address" },
        { status: 400 }
      );
    }

    const result = await sweepAllFunds(botConfigId, destinationWallet, network);

    return NextResponse.json({
      success: true,
      message: `Successfully swept ${result.sweptSol.toFixed(4)} SOL back to your wallet!`,
      ...result,
    });
  } catch (err: any) {
    console.error("Sweep error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Emergency sweep failed" },
      { status: 500 }
    );
  }
}

