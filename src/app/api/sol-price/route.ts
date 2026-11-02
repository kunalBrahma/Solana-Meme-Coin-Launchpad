import { NextResponse } from "next/server";

let cachedPrice = 95.44;
let lastFetched = 0;

export async function GET() {
  const now = Date.now();
  // Cache for 30 seconds
  if (now - lastFetched < 30000 && cachedPrice > 0) {
    return NextResponse.json({ success: true, price: cachedPrice });
  }

  try {
    // 1. Try Binance API
    const res = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT", {
      next: { revalidate: 30 },
    });
    if (res.ok) {
      const data = await res.json();
      const p = parseFloat(data.price);
      if (p > 0) {
        cachedPrice = p;
        lastFetched = now;
        return NextResponse.json({ success: true, price: cachedPrice });
      }
    }
  } catch {}

  try {
    // 2. Fallback CoinGecko
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { next: { revalidate: 30 } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.solana?.usd) {
        cachedPrice = data.solana.usd;
        lastFetched = now;
        return NextResponse.json({ success: true, price: cachedPrice });
      }
    }
  } catch {}

  return NextResponse.json({ success: true, price: cachedPrice });
}

