import { createAppKit } from "@reown/appkit/react";
import { activeChain, supportedChains } from "./chain";
import { projectId, wagmiAdapter } from "./wagmi";

let initialized = false;

export function initAppKit() {
	if (initialized || typeof window === "undefined") return;
	initialized = true;

	createAppKit({
		adapters: [wagmiAdapter],
		networks: [...supportedChains],
		defaultNetwork: activeChain,
		projectId,
		metadata: {
			name: "Pactly",
			description: "Dating, in earnest. Stake to meet — built on 0G.",
			url: window.location.origin,
			icons: [],
		},
		features: {
			analytics: false,
			email: false,
			socials: false,
		},
	});
}
