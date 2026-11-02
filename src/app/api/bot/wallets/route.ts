import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getConnection, SolanaNetwork } from "@/lib/solana";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const botConfigId = searchParams.get("botConfigId");

    if (!botConfigId) {
      return NextResponse.json(
        { success: false, error: "botConfigId is required" },
        { status: 400 }
      );
    }

    const config = await prisma.botConfig.findUnique({
      where: { id: botConfigId },
      include: { wallets: true },
    });

    if (!config) {
      return NextResponse.json(
        { success: false, error: "Bot config not found" },
        { status: 404 }
      );
    }

    const network: SolanaNetwork =
      config.network === "MAINNET" ? "mainnet-beta" : "devnet";
    const connection = getConnection(network);

    // Fetch live on-chain balances for each sub-wallet
    const updatedWallets = await Promise.all(
      config.wallets.map(async (w) => {
        try {
          const balanceLamports = await connection.getBalance(
            new PublicKey(w.publicKey)
          );
          const solBalance = balanceLamports / LAMPORTS_PER_SOL;

          // Update in DB asynchronously
          await prisma.botWallet.update({
            where: { id: w.id },
            data: { solBalance },
          });

          return {
            id: w.id,
            publicKey: w.publicKey,
            solBalance,
            totalTrades: w.totalTrades,
          };
        } catch {
          return {
            id: w.id,
            publicKey: w.publicKey,
            solBalance: w.solBalance,
            totalTrades: w.totalTrades,
          };
        }
      })
    );

    return NextResponse.json({ success: true, wallets: updatedWallets });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch wallets" },
      { status: 500 }
    );
  }
}

