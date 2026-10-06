// Metaplex Token Metadata CreateMetadataAccountV3, encoded by hand (avoids pulling umi into the browser bundle).
import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";

export const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
const CREATE_METADATA_V3 = 33;

export const MAX_NAME = 32;
export const MAX_SYMBOL = 10;
export const MAX_URI = 200;

export const metadataPda = (mint: PublicKey) =>
  PublicKey.findProgramAddressSync([Buffer.from("metadata"), METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()], METADATA_PROGRAM_ID)[0];

const borshString = (s: string) => {
  const bytes = Buffer.from(s, "utf8");
  const len = Buffer.alloc(4);
  len.writeUInt32LE(bytes.length);
  return Buffer.concat([len, bytes]);
};

export function createMetadataV3Ix(p: {
  mint: PublicKey;
  authority: PublicKey; // mint authority, payer and update authority
  name: string;
  symbol: string;
  uri: string;
  isMutable: boolean;
}): TransactionInstruction {
  if (Buffer.byteLength(p.name) > MAX_NAME) throw new Error(`Name is limited to ${MAX_NAME} bytes`);
  if (Buffer.byteLength(p.symbol) > MAX_SYMBOL) throw new Error(`Symbol is limited to ${MAX_SYMBOL} bytes`);
  if (Buffer.byteLength(p.uri) > MAX_URI) throw new Error("Metadata URI too long");

  const data = Buffer.concat([
    Buffer.from([CREATE_METADATA_V3]),
    borshString(p.name),
    borshString(p.symbol),
    borshString(p.uri),
    Buffer.from([0, 0]), // seller_fee_basis_points u16
    Buffer.from([0]), // creators: None
    Buffer.from([0]), // collection: None
    Buffer.from([0]), // uses: None
    Buffer.from([p.isMutable ? 1 : 0]),
    Buffer.from([0]), // collection_details: None
  ]);

  return new TransactionInstruction({
    programId: METADATA_PROGRAM_ID,
    keys: [
      { pubkey: metadataPda(p.mint), isSigner: false, isWritable: true },
      { pubkey: p.mint, isSigner: false, isWritable: false },
      { pubkey: p.authority, isSigner: true, isWritable: false },
      { pubkey: p.authority, isSigner: true, isWritable: true },
      { pubkey: p.authority, isSigner: true, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}
