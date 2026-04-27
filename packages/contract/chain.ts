import { defineChain } from "viem";

export const ZG_TESTNET_CHAIN_ID = 16602 as const;
export const ZG_MAINNET_CHAIN_ID = 16600 as const; // Aristotle — placeholder, confirm at deploy time.

export const zgGalileo = defineChain({
  id: ZG_TESTNET_CHAIN_ID,
  name: "0G Galileo",
  nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://evmrpc-testnet.0g.ai"] },
  },
  blockExplorers: {
    default: { name: "Chainscan", url: "https://chainscan-galileo.0g.ai" },
  },
  testnet: true,
});

/**
 * Aristotle (0G mainnet). RPC + chainId are placeholders until the deploy
 * happens — flip them in one place when ready.
 */
export const zgAristotle = defineChain({
  id: ZG_MAINNET_CHAIN_ID,
  name: "0G Aristotle",
  nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://evmrpc.0g.ai"] },
  },
  blockExplorers: {
    default: { name: "Chainscan", url: "https://chainscan.0g.ai" },
  },
});

export const supportedChains = [zgGalileo, zgAristotle] as const;
export type SupportedChain = (typeof supportedChains)[number];

export function getChain(chainId: number): SupportedChain {
  const c = supportedChains.find((x) => x.id === chainId);
  if (!c) throw new Error(`Unsupported chainId ${chainId}`);
  return c;
}

/**
 * Defaults to Galileo for dev. The frontend reads `VITE_PACTLY_CHAIN`,
 * the backend reads `PACTLY_CHAIN` — values: "galileo" | "aristotle".
 */
export function resolveActiveChainId(env: string | undefined): number {
  switch ((env ?? "galileo").toLowerCase()) {
    case "aristotle":
    case "mainnet":
      return ZG_MAINNET_CHAIN_ID;
    case "galileo":
    case "testnet":
    default:
      return ZG_TESTNET_CHAIN_ID;
  }
}
