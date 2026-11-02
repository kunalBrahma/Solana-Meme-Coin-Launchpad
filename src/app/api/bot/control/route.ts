import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { volumeBotRuntime, executeBotTrade } from "@/lib/bot/volumeEngine";

export async function POST(req: NextRequest) {
  try {
    const { action, botConfigId, walletId, tradeType, amountSol } = await req.json();

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

    if (action === "start") {
      await volumeBotRuntime.startBot(botConfigId);
      return NextResponse.json({ success: true, status: "RUNNING" });
    }

    if (action === "pause") {
      await volumeBotRuntime.pauseBot(botConfigId);
      return NextResponse.json({ success: true, status: "PAUSED" });
    }

    if (action === "stop") {
      await volumeBotRuntime.stopBot(botConfigId);
      return NextResponse.json({ success: true, status: "STOPPED" });
    }

    if (action === "trade_once") {
      // Execute single trade immediately
      const chosenWalletId =
        walletId ||
        config.wallets[Math.floor(Math.random() * config.wallets.length)].id;
      const type = tradeType || (Math.random() > 0.35 ? "BUY" : "SELL");
      const sol = amountSol || config.minTradeSol;

      const result = await executeBotTrade(
        botConfigId,
        chosenWalletId,
        type,
        Number(sol),
        config.network === "MAINNET" ? "mainnet-beta" : "devnet"
      );

      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json(
      { success: false, error: `Invalid action: ${action}` },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("Bot control error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Bot control failed" },
      { status: 500 }
    );
  }
}

