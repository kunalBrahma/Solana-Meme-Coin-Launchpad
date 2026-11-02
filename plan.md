# Architecture Plan: Private Solana Token & Raydium Launchpad

## 1. Executive Summary
A self-hosted, private Solana launchpad application that allows you to:
1. **Mint SPL Tokens & Attach Metaplex Metadata** with custom logos and parameters.
2. **Revoke Authorities** (Freeze, Mint, and Metadata update authorities) in the same or subsequent transactions to make tokens 100% decentralized.
3. **Launch Raydium Liquidity Pools (CPMM)** in a single transaction with your deposited SOL + tokens.
4. **Track & Manage Portfolio** persisted in PostgreSQL via Prisma ORM with live Solscan, DexScreener, and Raydium links.
5. **Multi-Environment Support:** Instant switching between **Devnet** (100% free testnet) and **Mainnet-Beta**.

---

## 2. Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend & Framework** | Next.js 15 (App Router) + TypeScript | React 19, Tailwind CSS, Lucide Icons |
| **Design & Motion Craft** | `emilkowalski/skills` (`emil-design-eng`, `animate`) | High-craft micro-interactions, smooth easing curves, Apple-grade polish |
| **Wallet Integration** | Solana Wallet Adapter | Phantom, Solflare, WalletConnect |
| **Blockchain Core** | `@solana/web3.js`, `@solana/spl-token` | Transaction building, ATA creation, token minting |
| **Token Metadata** | `@metaplex-foundation/mpl-token-metadata` | On-chain token name, symbol, logo URI |
| **DEX Liquidity** | `@raydium-io/raydium-sdk-v2` | Raydium CPMM (Constant Product Market Maker) pool creation |
| **Database & ORM** | PostgreSQL 16 + Prisma ORM | Dockerized local database for tokens, pools, and history |
| **Storage / CDN** | Local uploads / IPFS (Pinata) | Serving token logos and metadata JSON |

---

## 3. Database Schema (Prisma)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Network {
  DEVNET
  MAINNET
}

enum PoolStatus {
  PENDING
  ACTIVE
  FAILED
}

model Token {
  id              String         @id @default(uuid())
  network         Network        @default(DEVNET)
  mintAddress     String         @unique
  name            String
  symbol          String
  description     String?
  imageUrl        String?
  decimals        Int            @default(9)
  supply          BigInt
  freezeRevoked   Boolean        @default(true)
  mintRevoked     Boolean        @default(true)
  updateRevoked   Boolean        @default(false)
  creatorWallet   String
  metadataUri     String?
  mintTxSignature String?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  liquidityPools  LiquidityPool[]

  @@index([creatorWallet])
  @@index([network])
}

model LiquidityPool {
  id              String      @id @default(uuid())
  tokenId         String
  token           Token       @relation(fields: [tokenId], references: [id], onDelete: Cascade)
  network         Network     @default(DEVNET)
  poolAddress     String      @unique
  lpMintAddress   String?
  baseTokenAmount BigInt
  solAmount       Float
  status          PoolStatus  @default(ACTIVE)
  poolTxSignature String?
  createdAt       DateTime    @default(now())

  @@index([poolAddress])
}

model AppConfig {
  id              String   @id @default("default")
  activeNetwork   Network  @default(DEVNET)
  devnetRpcUrl    String   @default("https://api.devnet.solana.com")
  mainnetRpcUrl   String   @default("https://api.mainnet-beta.solana.com")
  updatedAt       DateTime @updatedAt
}
```

---

## 4. Security & Architecture Principles
* **Client-Side Signing:** Private keys are **never** stored on the server. All transactions are created and signed directly in your connected Phantom/Solflare wallet.
* **Isolated Local Database:** PostgreSQL runs in a local Docker container (`docker-compose.yml`) with mounted volume for persistent storage.
* **Direct Raydium CPMM Integration:** Does not require third-party launchpads or OpenBook Market IDs (~0.15 SOL Raydium pool creation fee).

