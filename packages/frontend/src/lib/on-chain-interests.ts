import { createPublicClient, erc20Abi, formatUnits, http } from "viem";
import { mainnet } from "viem/chains";

const ETH_RPC =
	import.meta.env.VITE_ETH_RPC_URL ?? "https://eth.llamarpc.com";

const client = createPublicClient({
	chain: mainnet,
	transport: http(ETH_RPC),
});

const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as const;
const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7" as const;
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F" as const;

export interface OnChainInterests {
	tags: string[];
	walletAge?: { firstSeen: string; years: number } | null;
	balances: { eth: string; usdc: string; usdt: string; dai: string };
}

/**
 * Best-effort, parallel set of read calls against Ethereum mainnet.
 * Each individual call is independently caught — one failure doesn't kill the whole.
 */
export async function fetchOnChainInterests(
	address: `0x${string}`,
): Promise<OnChainInterests> {
	const safe = async <T>(p: Promise<T>, fallback: T): Promise<T> => {
		try {
			return await p;
		} catch {
			return fallback;
		}
	};

	const [eth, usdc, usdt, dai, ens, txCount] = await Promise.all([
		safe(client.getBalance({ address }), 0n),
		safe(
			client.readContract({
				abi: erc20Abi,
				address: USDC,
				functionName: "balanceOf",
				args: [address],
			}),
			0n,
		),
		safe(
			client.readContract({
				abi: erc20Abi,
				address: USDT,
				functionName: "balanceOf",
				args: [address],
			}),
			0n,
		),
		safe(
			client.readContract({
				abi: erc20Abi,
				address: DAI,
				functionName: "balanceOf",
				args: [address],
			}),
			0n,
		),
		safe(client.getEnsName({ address }), null as string | null),
		safe(client.getTransactionCount({ address }), 0),
	]);

	const tags: string[] = [];

	if (ens) tags.push(`ENS: ${ens}`);
	if (eth >= 1_000000000000000000n) tags.push("ETH holder");
	if (usdc > 0n) tags.push("USDC holder");
	if (usdt > 0n) tags.push("USDT holder");
	if (dai > 0n) tags.push("DAI holder");

	if (txCount === 0) {
		tags.push("Fresh wallet");
	} else if (txCount > 1000) {
		tags.push("Power user");
	} else if (txCount > 100) {
		tags.push("Active onchain");
	}

	if (tags.length === 0) tags.push("New on-chain");

	return {
		tags,
		walletAge: null, // first-tx timestamp would need an indexer; skipped for hackathon.
		balances: {
			eth: formatUnits(eth, 18),
			usdc: formatUnits(usdc, 6),
			usdt: formatUnits(usdt, 6),
			dai: formatUnits(dai, 18),
		},
	};
}
