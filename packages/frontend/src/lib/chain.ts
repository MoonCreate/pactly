import {
	getChain,
	resolveActiveChainId,
	supportedChains,
	zgAristotle,
	zgGalileo,
} from "@pactly/contract";

export { zgAristotle, zgGalileo, supportedChains, getChain };

/**
 * Active chain for this build, switched via `VITE_PACTLY_CHAIN`
 * ("galileo" | "aristotle"). Defaults to Galileo for dev.
 */
export const activeChain = getChain(
	resolveActiveChainId(import.meta.env.VITE_PACTLY_CHAIN as string | undefined),
);
