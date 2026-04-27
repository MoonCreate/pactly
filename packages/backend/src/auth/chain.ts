import { getChain, supportedChains } from "@pactly/contract";
import { createPublicClient, http, type PublicClient } from "viem";

const clientCache = new Map<number, PublicClient>();

/**
 * Cached viem PublicClient per supported 0G chain. SIWE verification uses
 * this to support ERC-6492 smart-wallet sigs via the right RPC.
 */
export function getPublicClient(chainId: number): PublicClient {
  let c = clientCache.get(chainId);
  if (c) return c;
  const chain = getChain(chainId);
  c = createPublicClient({
    chain,
    transport: http(),
  }) as PublicClient;
  clientCache.set(chainId, c);
  return c;
}

export const supportedChainIds: number[] = supportedChains.map((c) => c.id);
