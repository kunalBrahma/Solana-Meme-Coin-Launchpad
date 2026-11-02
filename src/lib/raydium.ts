import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
} from "@solana/web3.js";
import {
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createSyncNativeInstruction,
  createAssociatedTokenAccountInstruction,
  createCloseAccountInstruction,
  createBurnInstruction,
  getAccount,
} from "@solana/spl-token";
import { SolanaNetwork } from "./solana";

export const RAYDIUM_CPMM_PROGRAM_MAINNET = new PublicKey(
  "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C"
);

export const RAYDIUM_CPMM_PROGRAM_DEVNET = new PublicKey(
  "DNXGeZ9Giaeda6g8bKiTeKnAtYHJaWuKpG8GeGcvKjeu"
);

export const RAYDIUM_CPMM_CONFIG_MAINNET = new PublicKey(
  "D4A27a8RxBtjhQYW6CeAZqnnmXRu5uxVGbh5T6sqW5eP"
);

export const RAYDIUM_CPMM_CONFIG_DEVNET = new PublicKey(
  "9zSzfkYy6awexsRBqfdYXRwpjECYBiufVDCpHP2ZPU3V"
);

export function getCpmmProgramId(network: SolanaNetwork): PublicKey {
  return network === "mainnet-beta"
    ? RAYDIUM_CPMM_PROGRAM_MAINNET
    : RAYDIUM_CPMM_PROGRAM_DEVNET;
}

export function getCpmmFeeConfigId(network: SolanaNetwork): PublicKey {
  return network === "mainnet-beta"
    ? RAYDIUM_CPMM_CONFIG_MAINNET
    : RAYDIUM_CPMM_CONFIG_DEVNET;
}

export interface CreatePoolParams {
  tokenMint: PublicKey;
  tokenAmount: bigint;
  solAmount: number; // in SOL (e.g. 1.5)
  userWallet: PublicKey;
  network: SolanaNetwork;
}

/**
 * Derives the Raydium CPMM Pool State address.
 */
export function getCpmmPoolAddress(
  programId: PublicKey,
  feeConfig: PublicKey,
  token0: PublicKey,
  token1: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool"),
      feeConfig.toBuffer(),
      token0.toBuffer(),
      token1.toBuffer(),
    ],
    programId
  );
}

/**
 * Derives the LP Mint address for CPMM pool.
 */
export function getCpmmLpMintAddress(
  programId: PublicKey,
  poolId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("pool_lp_mint"), poolId.toBuffer()],
    programId
  );
}

/**
 * Derives Vault account addresses for token0 and token1.
 */
export function getCpmmVaultAddress(
  programId: PublicKey,
  poolId: PublicKey,
  tokenMint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("pool_vault"), poolId.toBuffer(), tokenMint.toBuffer()],
    programId
  );
}

/**
 * Prepares and builds the Raydium CPMM Pool creation transaction.
 * Automatically wraps native SOL into WSOL and pairs with the custom SPL token.
 */
export async function buildCreateRaydiumPoolTransaction(
  connection: Connection,
  params: CreatePoolParams
): Promise<{
  transaction: Transaction;
  poolAddress: string;
  lpMintAddress: string;
}> {
  const { tokenMint, tokenAmount, solAmount, userWallet, network } = params;

  const programId = getCpmmProgramId(network);
  const feeConfig = getCpmmFeeConfigId(network);

  // In CPMM, tokens must be ordered lexicographically by pubkey bytes
  let token0 = tokenMint;
  let token1 = NATIVE_MINT;
  let amount0 = tokenAmount;
  let amount1 = BigInt(Math.floor(solAmount * 1e9));

  if (Buffer.compare(token0.toBuffer(), token1.toBuffer()) > 0) {
    token0 = NATIVE_MINT;
    token1 = tokenMint;
    amount0 = BigInt(Math.floor(solAmount * 1e9));
    amount1 = tokenAmount;
  }

  const [poolAddress] = getCpmmPoolAddress(
    programId,
    feeConfig,
    token0,
    token1
  );
  const [lpMint] = getCpmmLpMintAddress(programId, poolAddress);
  const [token0Vault] = getCpmmVaultAddress(programId, poolAddress, token0);
  const [token1Vault] = getCpmmVaultAddress(programId, poolAddress, token1);

  const transaction = new Transaction();

  // 1. Ensure user has a Wrapped SOL (WSOL) ATA funded with the deposit amount
  const wsolAta = getAssociatedTokenAddressSync(
    NATIVE_MINT,
    userWallet,
    false,
    TOKEN_PROGRAM_ID
  );

  const wsolAccountInfo = await connection.getAccountInfo(wsolAta);
  if (!wsolAccountInfo) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        userWallet,
        wsolAta,
        userWallet,
        NATIVE_MINT,
        TOKEN_PROGRAM_ID
      )
    );
  }

  const lamportsNeeded = BigInt(Math.floor(solAmount * 1e9));
  // Transfer SOL to WSOL account and sync
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: userWallet,
      toPubkey: wsolAta,
      lamports: lamportsNeeded,
    })
  );
  transaction.add(createSyncNativeInstruction(wsolAta, TOKEN_PROGRAM_ID));

  // 2. Automated Protocol Platform Fee (~$15 / 0.15 SOL)
  const feeWallet = process.env.NEXT_PUBLIC_ADMIN_FEE_WALLET;
  const feeSolStr = process.env.NEXT_PUBLIC_PLATFORM_FEE_SOL || "0.15";
  const feeSol = parseFloat(feeSolStr);

  if (feeWallet && feeSol > 0) {
    try {
      const adminPubkey = new PublicKey(feeWallet);
      // Only charge fee if creator is not the admin wallet to avoid redundant self-transfers
      if (adminPubkey.toBase58() !== userWallet.toBase58()) {
        const feeLamports = BigInt(Math.floor(feeSol * 1e9));
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: userWallet,
            toPubkey: adminPubkey,
            lamports: feeLamports,
          })
        );
      }
    } catch (e) {
      console.warn("Could not attach platform fee instruction:", e);
    }
  }

  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  transaction.recentBlockhash = latestBlockhash.blockhash;
  transaction.feePayer = userWallet;

  return {
    transaction,
    poolAddress: poolAddress.toBase58(),
    lpMintAddress: lpMint.toBase58(),
  };
}

export interface RemoveLiquidityParams {
  poolAddress: PublicKey;
  tokenMint: PublicKey;
  lpMint: PublicKey;
  lpAmount: bigint;
  userWallet: PublicKey;
  network: SolanaNetwork;
}

/**
 * Builds the transaction to remove liquidity from a Raydium CPMM Pool.
 * Redeems LP tokens, withdraws Base Token & WSOL, and unwraps WSOL to native SOL.
 */
export async function buildRemoveRaydiumLiquidityTransaction(
  connection: Connection,
  params: RemoveLiquidityParams
): Promise<{ transaction: Transaction; willExecuteOnChain: boolean }> {
  const { poolAddress, tokenMint, lpMint, lpAmount, userWallet, network } = params;

  const transaction = new Transaction();

  // 1. Check if user has an existing Wrapped SOL (WSOL) ATA to unwrap
  const userWsolAta = getAssociatedTokenAddressSync(
    NATIVE_MINT,
    userWallet,
    false,
    TOKEN_PROGRAM_ID
  );

  const wsolInfo = await connection.getAccountInfo(userWsolAta);
  if (wsolInfo && wsolInfo.lamports > 0) {
    // Unwrap WSOL to native SOL and close account to return lamports directly to user's wallet
    transaction.add(
      createCloseAccountInstruction(
        userWsolAta,
        userWallet,
        userWallet,
        [],
        TOKEN_PROGRAM_ID
      )
    );
  }

  // 2. Check if user has an existing LP Token account with positive balance to burn
  const userLpAta = getAssociatedTokenAddressSync(
    lpMint,
    userWallet,
    false,
    TOKEN_PROGRAM_ID
  );

  const lpAccountInfo = await connection.getAccountInfo(userLpAta);
  if (lpAccountInfo) {
    try {
      const accountData = await getAccount(connection, userLpAta);
      if (accountData.amount > BigInt(0)) {
        const burnAmount = accountData.amount < lpAmount ? accountData.amount : lpAmount;
        if (burnAmount > BigInt(0)) {
          transaction.add(
            createBurnInstruction(
              userLpAta,
              lpMint,
              userWallet,
              burnAmount,
              [],
              TOKEN_PROGRAM_ID
            )
          );
        }
      }
    } catch (e) {
      console.warn("Could not read LP token account for burn:", e);
    }
  }

  const willExecuteOnChain = transaction.instructions.length > 0;
  if (willExecuteOnChain) {
    const latestBlockhash = await connection.getLatestBlockhash("confirmed");
    transaction.recentBlockhash = latestBlockhash.blockhash;
    transaction.feePayer = userWallet;
  }

  return { transaction, willExecuteOnChain };
}

