# Reddit Post for r/solanadev (Authentic Human Tone)

---

## 🎯 Pick a Title (Casual & Natural — Under 100 characters):

- **Option 1 (86 chars — Recommended):**  
  **Learning Solana dev: built a non-custodial Raydium launchpad + volume bot (feedback?)**

- **Option 2 (83 chars):**  
  **Got into Solana dev recently and built a direct-to-wallet Raydium launchpad + bot**

- **Option 3 (86 chars):**  
  **Built a full non-custodial meme coin launchpad while learning Solana dev. Thoughts?**

---

## 📝 Post Body (Natural, Casual & Honest):

Hey everyone,

Been learning Solana dev over the past few weeks and got a bit tired of just following basic hello-world tutorials, so I decided to challenge myself and build a full dApp from scratch.

One thing that always bugged me about existing token tools is that so many of them ask you to *"send 1.5 SOL to this random deposit wallet"* so their backend can deploy the coin for you. Honestly, that always felt super sketchy to me. 

So my goal was to build something **100% direct-from-wallet and non-custodial** — you connect Phantom or Solflare, you see every instruction you’re signing, and your keys/funds never leave your control.

Here’s what I ended up putting together:

- **Token Creation + IPFS:** Minting SPL tokens with Metaplex metadata stored permanently on Pinata IPFS (so logos don’t break). Kept the creation free so users only pay the standard network rent.
- **1-Click Authority Revoking:** Toggles to revoke freeze, mint, and update authorities so the token automatically shows green checkmarks on RugCheck and Photon.
- **Direct Raydium CPMM Pools:** Packs WSOL wrapping, token accounts, and pool creation into a transaction signed straight from the user's wallet. Once live, DexScreener and Photon pick it up in about 20-30 seconds.
- **Built-in Volume Bot:** Since new pools usually suffer from having a completely dead chart at launch, I added a local volume maker that generates a few sub-wallets, micro-funds them, and runs small randomized buy/sells to keep the chart moving. Also added a 1-click button to sweep all the SOL/tokens back to the main wallet anytime.

**The stack:** Next.js 15, `@solana/web3.js`, `@solana/spl-token`, Raydium SDK, and Prisma/Postgres for local tracking.

Since I’m still pretty new to Solana dev, I’d really appreciate any feedback from experienced devs here. Are there any edge cases with Raydium CPMM transactions or priority fees during network congestion that I should be careful about?

Happy to answer questions or share the repo/demo if anyone wants to take a look!
