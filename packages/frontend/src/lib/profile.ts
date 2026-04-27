import type { OnChainInterests } from "./on-chain-interests";
import type { PortfolioSnapshot } from "./portfolio";

export const HOBBY_OPTIONS = [
	"coffee",
	"hiking",
	"photography",
	"reading",
	"cooking",
	"gaming",
	"live music",
	"art",
	"travel",
	"fitness",
	"pets",
	"DeFi",
	"NFTs",
	"DAOs",
	"writing",
	"films",
	"yoga",
	"climbing",
	"running",
	"dancing",
] as const;

export type Hobby = (typeof HOBBY_OPTIONS)[number];

export interface Socials {
	x?: string;
	instagram?: string;
	github?: string;
}

/**
 * The full profile blob written to 0G Storage. Backend index only keeps
 * displayName / photoRootHash / encryptionPubKey / profileRootHash.
 */
export interface ProfileBody {
	v: 1;
	displayName: string;
	bio: string;
	hobbies: Hobby[];
	photoRootHash?: `0x${string}`;
	socials: Socials;
	portfolio?: PortfolioSnapshot | null; // null = user opted out
	onChain?: OnChainInterests | null;
	updatedAt: number;
}
