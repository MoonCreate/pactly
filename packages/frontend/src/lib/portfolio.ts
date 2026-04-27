/**
 * Multi-chain portfolio totals via Uniswap's interface gateway.
 * Undocumented but stable; falls back to null on any error.
 */

const GATEWAY_URL =
	"https://interface.gateway.uniswap.org/v2/data.v1.DataApiService/GetPortfolio";

const CHAIN_IDS = [
	1, 130, 8453, 42161, 137, 196, 10, 56, 43114, 59144, 480, 324, 1868, 7777777,
	42220, 81457,
] as const;

export type PortfolioTier =
	| "fresh" // < $100
	| "casual" // $100 – $1k
	| "serious" // $1k – $10k
	| "committed" // $10k – $100k
	| "whale"; // $100k+

export interface PortfolioSnapshot {
	totalUsd: number;
	tier: PortfolioTier;
	fetchedAt: number;
}

export function tierFor(totalUsd: number): PortfolioTier {
	if (totalUsd < 100) return "fresh";
	if (totalUsd < 1_000) return "casual";
	if (totalUsd < 10_000) return "serious";
	if (totalUsd < 100_000) return "committed";
	return "whale";
}

export const TIER_DISPLAY: Record<PortfolioTier, { label: string; icon: string }> = {
	fresh: { label: "fresh", icon: "🌱" },
	casual: { label: "casual", icon: "🌿" },
	serious: { label: "serious", icon: "🌳" },
	committed: { label: "committed", icon: "🏔️" },
	whale: { label: "whale", icon: "🐋" },
};

interface GatewayResponse {
	portfolios?: Array<{ tokensTotalDenominatedValue?: { value?: number } }>;
}

export async function fetchPortfolio(
	address: `0x${string}`,
): Promise<PortfolioSnapshot | null> {
	try {
		const res = await fetch(GATEWAY_URL, {
			method: "POST",
			headers: {
				accept: "*/*",
				"content-type": "application/json",
				"connect-protocol-version": "1",
				"x-request-source": "uniswap-web",
			},
			body: JSON.stringify({
				walletAccount: { platformAddresses: [{ address }] },
				chainIds: CHAIN_IDS,
				modifier: { address },
			}),
		});
		if (!res.ok) return null;
		const json = (await res.json()) as GatewayResponse;
		const total =
			json.portfolios?.[0]?.tokensTotalDenominatedValue?.value ?? 0;
		return {
			totalUsd: total,
			tier: tierFor(total),
			fetchedAt: Date.now(),
		};
	} catch {
		return null;
	}
}
