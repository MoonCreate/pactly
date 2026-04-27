import { Indexer, MemData } from "@0gfoundation/0g-ts-sdk";
import { ethers } from "ethers";

const RPC_URL = process.env.ZG_TESTNET_RPC_URL ?? "https://evmrpc-testnet.0g.ai";
const INDEXER_RPC =
  process.env.ZG_INDEXER_RPC ?? "https://indexer-storage-testnet-turbo.0g.ai";
const STORAGE_PRIVATE_KEY = process.env.ZG_STORAGE_PRIVATE_KEY;

if (!STORAGE_PRIVATE_KEY) {
  console.warn(
    "[storage] ZG_STORAGE_PRIVATE_KEY not set — uploads will fail until configured.",
  );
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = STORAGE_PRIVATE_KEY
  ? new ethers.Wallet(STORAGE_PRIVATE_KEY, provider)
  : null;
const indexer = new Indexer(INDEXER_RPC);

export interface UploadResult {
  rootHash: `0x${string}`;
  txHash?: string;
}

function ensureSigner(): ethers.Wallet {
  if (!signer) {
    throw new Error(
      "0G storage signer not configured — set ZG_STORAGE_PRIVATE_KEY",
    );
  }
  return signer;
}

export async function uploadBytes(bytes: Uint8Array): Promise<UploadResult> {
  const file = new MemData(Array.from(bytes));
  const [tx, err] = await indexer.upload(file, RPC_URL, ensureSigner());
  if (err !== null && err !== undefined) {
    throw err instanceof Error ? err : new Error(String(err));
  }
  // Indexer.upload returns either a single submission or a multi-fragment one;
  // either shape carries a rootHash we can use. We re-read from the merkle tree
  // anyway to avoid depending on the union shape.
  const tree = await file.merkleTree();
  if (tree[1]) throw tree[1];
  const root = tree[0]?.rootHash();
  if (!root) throw new Error("upload succeeded but rootHash missing");
  const txHash =
    tx && typeof tx === "object" && "txHash" in tx
      ? (tx as { txHash: string }).txHash
      : undefined;
  return { rootHash: root as `0x${string}`, txHash };
}

export async function uploadJSON(value: unknown): Promise<UploadResult> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return uploadBytes(bytes);
}

export async function downloadBlob(rootHash: string): Promise<Blob> {
  const [blob, err] = await indexer.downloadToBlob(rootHash);
  if (err !== null && err !== undefined) {
    throw err instanceof Error ? err : new Error(String(err));
  }
  if (!blob) throw new Error(`no blob for rootHash ${rootHash}`);
  return blob;
}

export async function downloadJSON<T = unknown>(rootHash: string): Promise<T> {
  const blob = await downloadBlob(rootHash);
  return (await blob.json()) as T;
}
