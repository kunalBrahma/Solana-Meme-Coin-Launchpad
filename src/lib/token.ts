import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  AuthorityType,
} from "@solana/spl-token";

export const METAPLEX_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

export function getMetadataPda(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METAPLEX_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    METAPLEX_PROGRAM_ID
  );
  return pda;
}

/**
 * Creates the instruction for Metaplex CreateMetadataAccountV3.
 * Borsh encoding serialized directly to avoid dependency conflicts.
 */
export function createMetadataInstruction(
  metadataPda: PublicKey,
  mint: PublicKey,
  mintAuthority: PublicKey,
  payer: PublicKey,
  updateAuthority: PublicKey,
  name: string,
  symbol: string,
  uri: string,
  sellerFeeBasisPoints: number = 0,
  isMutable: boolean = true
): TransactionInstruction {
  // Borsh serialization for CreateMetadataAccountV3 (discriminator 33)
  const nameBuffer = Buffer.from(name);
  const symbolBuffer = Buffer.from(symbol);
  const uriBuffer = Buffer.from(uri);

  const data = Buffer.alloc(1000);
  let offset = 0;

  // Discriminator for CreateMetadataAccountV3 is 33
  data.writeUInt8(33, offset);
  offset += 1;

  // name (string: 4-byte length + bytes)
  data.writeUInt32LE(nameBuffer.length, offset);
  offset += 4;
  nameBuffer.copy(data, offset);
  offset += nameBuffer.length;

  // symbol (string: 4-byte length + bytes)
  data.writeUInt32LE(symbolBuffer.length, offset);
  offset += 4;
  symbolBuffer.copy(data, offset);
  offset += symbolBuffer.length;

  // uri (string: 4-byte length + bytes)
  data.writeUInt32LE(uriBuffer.length, offset);
  offset += 4;
  uriBuffer.copy(data, offset);
  offset += uriBuffer.length;

  // seller_fee_basis_points (u16)
  data.writeUInt16LE(sellerFeeBasisPoints, offset);
  offset += 2;

  // creators (Option<Vec<Creator>>) -> None = 0
  data.writeUInt8(0, offset);
  offset += 1;

  // collection (Option<Collection>) -> None = 0
  data.writeUInt8(0, offset);
  offset += 1;

  // uses (Option<Uses>) -> None = 0
  data.writeUInt8(0, offset);
  offset += 1;

  // is_mutable (bool)
  data.writeUInt8(isMutable ? 1 : 0, offset);
  offset += 1;

  // collection_details (Option<CollectionDetails>) -> None = 0
  data.writeUInt8(0, offset);
  offset += 1;

  const serializedData = data.subarray(0, offset);

  return new TransactionInstruction({
    keys: [
      { pubkey: metadataPda, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: mintAuthority, isSigner: true, isWritable: false },
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: updateAuthority, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      {
        pubkey: new PublicKey("SysvarRent111111111111111111111111111111111"),
        isSigner: false,
        isWritable: false,
      },
    ],
    programId: METAPLEX_PROGRAM_ID,
    data: serializedData,
  });
}

export interface TokenCreationParams {
  name: string;
  symbol: string;
  uri: string;
  decimals: number;
  supply: bigint;
  revokeFreeze: boolean;
  revokeMint: boolean;
  revokeUpdate: boolean;
  creatorWallet: PublicKey;
}

/**
 * Builds the complete transaction for minting an SPL token with metadata and authorities.
 */
export async function buildCreateTokenTransaction(
  connection: Connection,
  params: TokenCreationParams
): Promise<{ transaction: Transaction; mintKeypair: Keypair }> {
  const {
    name,
    symbol,
    uri,
    decimals,
    supply,
    revokeFreeze,
    revokeMint,
    revokeUpdate,
    creatorWallet,
  } = params;

  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;
  const metadataPda = getMetadataPda(mint);

  // Calculate rent for the mint account
  const lamportsForMint =
    await connection.getMinimumBalanceForRentExemption(MINT_SIZE);

  const transaction = new Transaction();

  // 1. Create Account for Mint
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: creatorWallet,
      newAccountPubkey: mint,
      space: MINT_SIZE,
      lamports: lamportsForMint,
      programId: TOKEN_PROGRAM_ID,
    })
  );

  // 2. Initialize Mint
  transaction.add(
    createInitializeMintInstruction(
      mint,
      decimals,
      creatorWallet,
      creatorWallet,
      TOKEN_PROGRAM_ID
    )
  );

  // 3. Create Metaplex Metadata V3 Account
  transaction.add(
    createMetadataInstruction(
      metadataPda,
      mint,
      creatorWallet,
      creatorWallet,
      creatorWallet,
      name,
      symbol,
      uri,
      0,
      !revokeUpdate
    )
  );

  // 4. Create Creator's Associated Token Account (ATA)
  const userAta = getAssociatedTokenAddressSync(
    mint,
    creatorWallet,
    false,
    TOKEN_PROGRAM_ID
  );

  transaction.add(
    createAssociatedTokenAccountInstruction(
      creatorWallet,
      userAta,
      creatorWallet,
      mint,
      TOKEN_PROGRAM_ID
    )
  );

  // 5. Mint initial supply into user's ATA
  const amountToMint = supply * BigInt(10 ** decimals);
  transaction.add(
    createMintToInstruction(
      mint,
      userAta,
      creatorWallet,
      amountToMint,
      [],
      TOKEN_PROGRAM_ID
    )
  );

  // 6. Revoke Freeze Authority (Standard for trust)
  if (revokeFreeze) {
    transaction.add(
      createSetAuthorityInstruction(
        mint,
        creatorWallet,
        AuthorityType.FreezeAccount,
        null,
        [],
        TOKEN_PROGRAM_ID
      )
    );
  }

  // 7. Revoke Mint Authority (Fixed supply)
  if (revokeMint) {
    transaction.add(
      createSetAuthorityInstruction(
        mint,
        creatorWallet,
        AuthorityType.MintTokens,
        null,
        [],
        TOKEN_PROGRAM_ID
      )
    );
  }

  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  transaction.recentBlockhash = latestBlockhash.blockhash;
  transaction.feePayer = creatorWallet;

  // Partially sign with the new mint keypair
  transaction.partialSign(mintKeypair);

  return { transaction, mintKeypair };
}

