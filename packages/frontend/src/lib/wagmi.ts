import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { activeChain, supportedChains } from "./chain";

const projectId = import.meta.env.VITE_REOWN_PROJECT_ID ?? "";

if (!projectId) {
	console.warn(
		"[wagmi] VITE_REOWN_PROJECT_ID is empty — AppKit will work in degraded mode. Get one at https://cloud.reown.com/",
	);
}

/**
 * The wallet picker shows every supported 0G chain (so users can switch
 * Galileo↔Aristotle without rebuilding), but the app defaults to `activeChain`.
 */
export const wagmiAdapter = new WagmiAdapter({
	projectId,
	networks: [...supportedChains],
	ssr: true,
});

// `activeChain` is consumed by the app code (e.g. SIWE message, escrow contract calls)
// even though WagmiAdapter doesn't take a `defaultNetwork`. AppKit's `createAppKit`
// does — it's set there.
export { activeChain };

export const wagmiConfig = wagmiAdapter.wagmiConfig;
export { projectId };
