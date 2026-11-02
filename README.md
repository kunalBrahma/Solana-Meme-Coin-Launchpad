<div align="center">

# 🚀 RayLaunch Pro (Open-Source Solana Launchpad)

**A 100% non-custodial, direct-to-wallet Solana meme coin launchpad, Raydium CPMM liquidity pool deployer, and built-in multi-wallet market-maker volume engine.**

[![Next.js 15](https://img.shields.io/badge/Next.js-15.1-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Solana](https://img.shields.io/badge/Solana-Web3.js-14F195?style=for-the-badge&logo=solana)](https://solana.com/)
[![Raydium](https://img.shields.io/badge/Raydium-CPMM-blue?style=for-the-badge)](https://raydium.io/)
[![Prisma](https://img.shields.io/badge/Prisma-PostgreSQL-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

[Features](#-key-features) • [Why This Exists](#-the-problem-why-this-exists) • [Tech Stack](#-tech-stack) • [Quickstart](#-quickstart-guide) • [Environment Variables](#-environment-configuration) • [Production Deployment](#-production-deployment)

</div>

---

## ⚡ The Problem (Why This Exists)

Most existing Solana launchpad tools and Telegram bots have a major security and UX flaw:
1. **The "Send SOL to this random deposit address" trap:** Third-party tools ask creators to transfer 1.5+ SOL to a backend custodial wallet and "trust" their server to mint and seed the pool. You have zero control over the transaction instructions and no guarantee of getting your LP tokens back.
2. **Excessive nickel-and-diming:** Most platforms charge 0.1 SOL to mint, 0.1 SOL to revoke freeze, 0.1 SOL to revoke mint, and 0.5 SOL to seed Raydium.
3. **Dead charts on launch:** Coins launch with 0 transactions and flatline immediately unless the creator pays $300–$500/month for an external volume bot.

**RayLaunch Pro is 100% non-custodial.** Everything is constructed on the client, inspected on-chain, and signed directly through your own browser wallet (Phantom / Solflare). Your private keys and funds never touch a centralized server.

---

## ✨ Key Features

- 🪙 **100% Free Token Creation:** Zero platform markup for minting SPL tokens. Users only pay Solana's native rent-exemption fee (~0.02 SOL to the network).
- 🔒 **1-Click Authority Revocations:** Atomic toggles to revoke **Freeze Authority**, **Mint Authority**, and **Update Authority** in the exact same transaction, giving coins green verification checkmarks on **RugCheck**, **Photon**, and **BullX**.
- 📦 **Permanent Decentralized IPFS Storage:** Native integration with **Pinata IPFS** for token logos and Metaplex Metadata V3 JSON, preventing broken images on DexScreener and Phantom.
- 🤖 **"✨ Ask AI" Meme Generator:** 1-click generator that creates viral meme tickers, lore, and high-resolution SVG coin logos dynamically.
- 💧 **Direct Raydium CPMM Pool Deployment:** Direct integration with Raydium's Constant Product Market Maker program (`CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C`). Automatically wraps native SOL (`WSOL`), creates token vaults, and initializes liquidity pools.
- ⚡ **Instant Multi-Platform Indexing:** Pools are indexed on-chain within 15–30 seconds across:
  - **DexScreener**
  - **Photon**
  - **Birdeye**
  - **Jupiter**
  - **Raydium Swap**
- 📈 **Built-in Multi-Wallet Market Maker & Volume Bot:**
  - Generates up to 8 automated sub-wallets.
  - Distributes micro-funding and executes organic buy/sell trades with jittered delay intervals and bullish order ratios (65% buy / 35% sell).
  - Keeps DexScreener charts active with natural green/red candles to trigger discovery alerts.
  - **1-Click Fund Sweep:** Pull 100% of remaining SOL and tokens from all sub-wallets back to your main wallet with a single button.
- 🔄 **Non-Custodial Liquidity Manager:** Redeem LP tokens, extract underlying SOL/tokens back to creator wallet, and auto-detect on-chain state to prevent simulation reverts.
- 🌐 **Instant Devnet ⟷ Mainnet Switcher:** Test the complete end-to-end launch pipeline on Solana Devnet for free, then switch to Mainnet-Beta when ready.
- 💸 **Configurable Protocol Admin Fee:** Monetize the platform by collecting an automated native SOL fee (e.g., 0.15 SOL ≈ $15 USD) directly into your admin wallet on pool creation.

---

## 🛠 Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router, React 19)
- **Language:** TypeScript 5.7
- **Styling:** Tailwind CSS + Lucide Icons
- **Blockchain Core:**
  - `@solana/web3.js` (Solana JSON-RPC client)
  - `@solana/spl-token` (SPL Token Program)
  - `@solana/wallet-adapter-react` (Phantom, Solflare, Wallet Standard)
  - `@raydium-io/raydium-sdk-v2` (Raydium CPMM AMM)
- **Database & State:** [Prisma ORM](https://www.prisma.io/) with PostgreSQL 16
- **Storage:** Pinata IPFS (Decentralized file and metadata storage)

---

## 🚀 Quickstart Guide

### Prerequisites
- [Bun](https://bun.sh/) (recommended) or [Node.js 18+](https://nodejs.org/)
- [Docker](https://www.docker.com/) (for local PostgreSQL database)
- [Phantom](https://phantom.app/) or [Solflare](https://solflare.com/) wallet extension

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/solana-meme-launchpad.git
cd solana-meme-launchpad
```

### 2. Install Dependencies
```bash
bun install
# or: npm install
```

### 3. Start Local PostgreSQL Database
```bash
docker compose up -d
```
*This starts a PostgreSQL 16 container on port `5455`.*

### 4. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` and fill in your settings:
```env
# Database connection for Prisma
DATABASE_URL="postgresql://launchpad:launchpad_password@localhost:5455/launchpad_db?schema=public"

# Solana Network & RPC Configuration
NEXT_PUBLIC_SOLANA_NETWORK="devnet"
NEXT_PUBLIC_DEVNET_RPC_URL="https://api.devnet.solana.com"
NEXT_PUBLIC_MAINNET_RPC_URL="https://solana-rpc.publicnode.com"

# Pinata IPFS for permanent token metadata & logos
PINATA_JWT="your_pinata_jwt_here"
NEXT_PUBLIC_GATEWAY_URL="https://gateway.pinata.cloud"

# Optional Protocol Admin Fee (Collected directly to your wallet on pool launch)
NEXT_PUBLIC_ADMIN_FEE_WALLET="Your_Solana_Wallet_Address_Here"
NEXT_PUBLIC_PLATFORM_FEE_SOL="0.15"
```

### 5. Push Database Schema
```bash
bun x prisma db push
# or: npx prisma db push
```

### 6. Start the Development Server
```bash
bun dev
# or: npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Architecture

```
├── prisma/
│   └── schema.prisma           # Token, LiquidityPool, BotConfig, and Trade models
├── public/
│   └── uploads/                # Local asset fallback cache
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ai/generate-token/  # AI meme generator endpoint
│   │   │   ├── bot/                # Volume bot control, config, fund & sweep APIs
│   │   │   ├── pools/              # Liquidity pool persistence & patch endpoints
│   │   │   ├── sol-price/          # Dynamic real-time SOL USD price feed
│   │   │   ├── tokens/             # Token metadata query & registration
│   │   │   └── upload/             # Pinata IPFS pinning & asset upload handler
│   │   ├── bot/page.tsx            # Multi-wallet volume bot dashboard
│   │   ├── chart/[id]/page.tsx     # On-chain visualizer & DexScreener embed
│   │   ├── create/page.tsx         # 3-step token creation & deployment wizard
│   │   ├── liquidity/page.tsx      # Raydium CPMM liquidity manager (Add / Withdraw)
│   │   ├── portfolio/page.tsx      # Created tokens & live pools portfolio
│   │   ├── layout.tsx              # Root layout & providers
│   │   └── page.tsx                # Terminal homepage & token directory
│   ├── context/
│   │   └── WalletContextProvider.tsx # Wallet Adapter & network switcher
│   └── lib/
│       ├── bot/volumeEngine.ts     # Automated sub-wallet market maker runtime
│       ├── prisma.ts               # Global Prisma client singleton
│       ├── raydium.ts              # Raydium CPMM pool creation & withdrawal transactions
│       ├── solana.ts               # RPC connection & explorer utility helpers
│       └── token.ts                # SPL Token & Metaplex metadata transaction builder
├── docker-compose.yml          # PostgreSQL 16 local database container
└── package.json
```

---

## ⚙️ Environment Configuration

| Variable | Description | Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...:5455/launchpad_db` |
| `NEXT_PUBLIC_SOLANA_NETWORK` | Default active network (`devnet` or `mainnet-beta`) | `devnet` |
| `NEXT_PUBLIC_DEVNET_RPC_URL` | Solana Devnet RPC endpoint | `https://api.devnet.solana.com` |
| `NEXT_PUBLIC_MAINNET_RPC_URL` | Solana Mainnet RPC endpoint (use Helius/QuickNode/PublicNode) | `https://solana-rpc.publicnode.com` |
| `PINATA_JWT` | Pinata API JWT token for IPFS file & metadata uploads | `""` |
| `NEXT_PUBLIC_GATEWAY_URL` | IPFS gateway URL for serving pinned metadata | `https://gateway.pinata.cloud` |
| `NEXT_PUBLIC_ADMIN_FEE_WALLET` | *(Optional)* Your wallet address to receive protocol fees | `""` |
| `NEXT_PUBLIC_PLATFORM_FEE_SOL` | *(Optional)* Platform fee amount in SOL per pool creation | `0.15` |

---

## 🌐 Production Deployment

### Option A: 100% Free Cloud Stack (Vercel + Neon)
1. **Database:** Create a free serverless PostgreSQL database at [Neon.tech](https://neon.tech) and copy the connection string.
2. **Hosting:** Push code to GitHub and connect your repo to [Vercel](https://vercel.com).
3. **Env Variables:** Add the environment variables from your `.env` into Vercel's project settings.
4. **Deploy:** Vercel automatically builds and provides a free HTTPS production domain.

### Option B: VPS (Docker / PM2 — Recommended for 24/7 Volume Bots)
For continuous 24/7 volume bots without serverless execution timeouts:
```bash
# 1. Clone & setup
git clone https://github.com/your-username/solana-meme-launchpad.git
cd solana-meme-launchpad
cp .env.example .env && nano .env

# 2. Start PostgreSQL
docker compose up -d

# 3. Build & start with PM2
bun install
bun run prisma db push
bun run build
pm2 start "bun start" --name "solana-launchpad"
```

---

## 🛡 Security & Transparency

- **Non-Custodial:** Private keys are never handled, stored, or sent to any server. All transactions are compiled as standard Solana instructions and passed to the user's wallet for approval.
- **Authority Revocation:** Token creators can permanently revoke minting, freezing, and metadata updating, guaranteeing that the supply is fixed and holder accounts cannot be frozen.
- **Admin Fee Transparency:** Protocol fees are bundled as standard `SystemProgram.transfer` instructions clearly visible to the user in their wallet prior to signing.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is open-sourced under the [MIT License](LICENSE).

