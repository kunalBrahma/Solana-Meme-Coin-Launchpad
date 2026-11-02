import { NextResponse } from "next/server";

// Curated meme token ideas with rich lore, tickers, and vibrant SVG meme art
const MEME_PRESETS = [
  {
    name: "Bork Moon",
    symbol: "BORK",
    description: "The louder the bork, the higher the candle. 100% good boy vibes, infinite loyalty to Solana holders.",
    website: "https://borktoken.io",
    twitter: "https://x.com/bork_solana",
    telegram: "https://t.me/bork_moon",
    bgGradient: ["#f59e0b", "#d97706"],
    emoji: "🐕",
    subtitle: "KING OF BORKS",
  },
  {
    name: "Catwifhat",
    symbol: "CWIF",
    description: "Literally just a fearless feline in a pink knitted beanie dominating the Solana blockchain. Hat stays on.",
    website: "https://catwifhat.meme",
    twitter: "https://x.com/catwifhat_sol",
    telegram: "https://t.me/catwifhat_army",
    bgGradient: ["#ec4899", "#8b5cf6"],
    emoji: "🐱",
    subtitle: "HAT ALWAYS ON",
  },
  {
    name: "Solana Chad",
    symbol: "CHAD",
    description: "Average high-speed, zero-fee DeFi enjoyer. Diamond hands only, never checks the red candles.",
    website: "https://solanachad.vip",
    twitter: "https://x.com/solchad_dao",
    telegram: "https://t.me/chad_solana",
    bgGradient: ["#00f2fe", "#4facfe"],
    emoji: "🗿",
    subtitle: "GIGACHAD OF SOL",
  },
  {
    name: "Pepe Rocket",
    symbol: "PEPROCKET",
    description: "The rarest frog in the universe fueled by liquid SOL and pure hype. Targeting 1 SOL = $10,000.",
    website: "https://peperocket.fun",
    twitter: "https://x.com/pepe_rocket_sol",
    telegram: "https://t.me/pepe_rocket_sol",
    bgGradient: ["#10b981", "#059669"],
    emoji: "🐸",
    subtitle: "RAREST FROG",
  },
  {
    name: "Just a Chill Guy",
    symbol: "CHILL",
    description: "He is just a chill guy who minding his own business and holding his tokens. Stress-free DeFi.",
    website: "https://chillguy.art",
    twitter: "https://x.com/chillguy_sol",
    telegram: "https://t.me/chillguy_sol",
    bgGradient: ["#6366f1", "#4f46e5"],
    emoji: "🕶️",
    subtitle: "STRESS FREE",
  },
  {
    name: "Mega Bonk",
    symbol: "MBONK",
    description: "Bonking the bears into oblivion with 65,000 TPS of raw decentralized community momentum.",
    website: "https://megabonk.net",
    twitter: "https://x.com/megabonk_sol",
    telegram: "https://t.me/megabonk_portal",
    bgGradient: ["#f97316", "#ea580c"],
    emoji: "🔨",
    subtitle: "BEAR BONKER",
  },
  {
    name: "Cyber Doge 2077",
    symbol: "CYDOGE",
    description: "Neural-linked cybernetic shiba from the neon alleys of Solana 2077. Laser eyes activated.",
    website: "https://cyberdoge2077.ai",
    twitter: "https://x.com/cyberdoge_ai",
    telegram: "https://t.me/cyberdoge_ai",
    bgGradient: ["#a855f7", "#06b6d4"],
    emoji: "🤖",
    subtitle: "NEURAL SHIBA",
  },
  {
    name: "Popcat Solana",
    symbol: "POPCAT",
    description: "Every click makes the mouth pop. Every pop burns a bear. The most satisfying meme on Solana.",
    website: "https://popcat-sol.xyz",
    twitter: "https://x.com/popcat_sol",
    telegram: "https://t.me/popcat_solana",
    bgGradient: ["#14f195", "#9945ff"],
    emoji: "😸",
    subtitle: "POP POP MOON",
  },
];

// Helper to generate a colorful, high-res SVG meme icon as Data URL
function generateMemeSvgDataUri(preset: (typeof MEME_PRESETS)[0]) {
  const [c1, c2] = preset.bgGradient;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}" />
      <stop offset="100%" stop-color="${c2}" />
    </linearGradient>
    <linearGradient id="neon" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00f2fe" />
      <stop offset="100%" stop-color="#14f195" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="10" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Circle -->
  <rect width="400" height="400" rx="200" fill="url(#bg)" />

  <!-- Outer Neon Ring -->
  <circle cx="200" cy="200" r="185" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="4" stroke-dasharray="12 8" />
  <circle cx="200" cy="200" r="172" fill="none" stroke="url(#neon)" stroke-width="3" filter="url(#glow)" />

  <!-- Central Emoji Avatar -->
  <text x="200" y="225" font-size="130" text-anchor="middle" dominant-baseline="middle">
    ${preset.emoji}
  </text>

  <!-- Ticker Banner at Bottom -->
  <rect x="80" y="295" width="240" height="48" rx="24" fill="#070b10" stroke="#00f2fe" stroke-width="2" />
  <text x="200" y="326" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="22" fill="#00f2fe" text-anchor="middle">
    $${preset.symbol}
  </text>

  <!-- Top Pill Subtitle -->
  <rect x="110" y="55" width="180" height="30" rx="15" fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" />
  <text x="200" y="75" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="11" fill="#ffffff" letter-spacing="2" text-anchor="middle">
    ${preset.subtitle}
  </text>
</svg>`;

  const base64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const prompt = body.prompt || "";

    // Check if an AI provider API key is present in environment (for future real AI integration)
    const geminiKey = process.env.GEMINI_API_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;

    /*
     * If user later plugs in OPENAI_API_KEY or GEMINI_API_KEY, they can activate:
     * if (geminiKey || openAiKey) {
     *   // Call Gemini / OpenAI GPT-4o / DALL-E to generate custom prompt-based token & image
     * }
     */

    // Pick random preset (or match by prompt keywords if provided)
    let selected = MEME_PRESETS[Math.floor(Math.random() * MEME_PRESETS.length)];
    if (prompt && typeof prompt === "string") {
      const match = MEME_PRESETS.find(
        (p) =>
          p.name.toLowerCase().includes(prompt.toLowerCase()) ||
          p.symbol.toLowerCase().includes(prompt.toLowerCase())
      );
      if (match) selected = match;
    }

    const imageSvgUri = generateMemeSvgDataUri(selected);

    return NextResponse.json({
      success: true,
      token: {
        name: selected.name,
        symbol: selected.symbol,
        description: selected.description,
        website: selected.website,
        twitter: selected.twitter,
        telegram: selected.telegram,
        imageUri: imageSvgUri,
      },
    });
  } catch (error: any) {
    console.error("AI Token generation error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate AI token" },
      { status: 500 }
    );
  }
}

