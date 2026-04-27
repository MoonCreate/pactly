import { downloadJSON } from "../storage";
import { chat } from "./client";

/**
 * The shape of the profile JSON the frontend uploads to 0G.
 * Mirrors `packages/frontend/src/lib/profile.ts` (kept narrow on purpose —
 * we only read what we score on).
 */
export interface ScoreProfile {
	displayName?: string;
	bio?: string;
	hobbies?: string[];
	socials?: { x?: string; instagram?: string; github?: string };
	portfolio?: { tier?: string } | null;
	onChain?: { tags?: string[] } | null;
}

export interface CompatibilityResult {
	score: number; // 0-100
	reason: string;
	stale?: boolean;
}

const TTL_MS = 30 * 60_000; // 30 min — content-addressed inputs, but we
// re-score occasionally to refresh the LLM's reason text.

interface CacheEntry {
	at: number;
	value: CompatibilityResult;
}

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<CompatibilityResult>>();

function cacheKey(meHash: string, themHash: string): string {
	// Score is symmetric on the profile bodies, so order them.
	return [meHash, themHash].sort().join("|");
}

async function tryFetchBody(rootHash: string | null): Promise<ScoreProfile | null> {
	if (!rootHash || !/^0x[0-9a-fA-F]{64}$/.test(rootHash)) return null;
	try {
		return await downloadJSON<ScoreProfile>(rootHash);
	} catch {
		// Seed profiles point at sentinel hashes; treat as missing.
		return null;
	}
}

function compactProfile(p: ScoreProfile | null): string {
	if (!p) return "(no extended profile)";
	const lines: string[] = [];
	if (p.displayName) lines.push(`name: ${p.displayName}`);
	if (p.bio) lines.push(`bio: ${p.bio.slice(0, 200)}`);
	if (p.hobbies?.length) lines.push(`hobbies: ${p.hobbies.join(", ")}`);
	if (p.onChain?.tags?.length) lines.push(`onchain: ${p.onChain.tags.join(", ")}`);
	if (p.portfolio?.tier) lines.push(`portfolio tier: ${p.portfolio.tier}`);
	return lines.join("\n");
}

const SYSTEM = `You are a compatibility scorer for a dating app called Pactly.
Score how well two people would get along on a coffee/dinner date based on shared interests, complementary vibes, and on-chain context. Be specific in the reason.

Rules:
- Output ONLY a single JSON object: {"score": <integer 0-100>, "reason": "<one short sentence, ≤ 90 chars>"}.
- The reason MUST mention something concrete from both profiles when possible (e.g. "you both code and chase good coffee").
- If a profile is empty, score conservatively (40-60) and say "limited info" in the reason.
- Never include any text outside the JSON.`;

function buildPrompt(me: ScoreProfile | null, them: ScoreProfile | null): string {
	return `Person A:
${compactProfile(me)}

Person B:
${compactProfile(them)}

Score how compatible Person A and Person B are.`;
}

function clamp(n: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, Math.round(n)));
}

function deterministicFallback(
	me: ScoreProfile | null,
	them: ScoreProfile | null,
): CompatibilityResult {
	if (!me || !them) return { score: 50, reason: "limited info" };
	const aHobbies = new Set((me.hobbies ?? []).map((s) => s.toLowerCase()));
	const bHobbies = new Set((them.hobbies ?? []).map((s) => s.toLowerCase()));
	const overlap = [...aHobbies].filter((h) => bHobbies.has(h));
	const hobbyScore = (overlap.length / Math.max(1, Math.max(aHobbies.size, bHobbies.size))) * 60;

	const aOnChain = new Set((me.onChain?.tags ?? []).map((s) => s.toLowerCase()));
	const bOnChain = new Set((them.onChain?.tags ?? []).map((s) => s.toLowerCase()));
	const onChainOverlap = [...aOnChain].filter((t) => bOnChain.has(t));
	const onChainScore = Math.min(20, onChainOverlap.length * 7);

	const sameTier =
		me.portfolio?.tier && them.portfolio?.tier && me.portfolio.tier === them.portfolio.tier
			? 10
			: 0;

	const score = clamp(40 + hobbyScore + onChainScore + sameTier, 30, 95);
	const reason = overlap.length
		? `you both like ${overlap.slice(0, 2).join(" + ")}`
		: "no overlapping hobbies on file";
	return { score, reason };
}

export async function scoreCompatibility(args: {
	meAddress: string;
	meRootHash: string | null;
	themAddress: string;
	themRootHash: string | null;
}): Promise<CompatibilityResult> {
	const key = cacheKey(args.meRootHash ?? args.meAddress, args.themRootHash ?? args.themAddress);

	const cached = cache.get(key);
	if (cached && Date.now() - cached.at < TTL_MS) return cached.value;

	const inflight = inFlight.get(key);
	if (inflight) return inflight;

	const work = (async (): Promise<CompatibilityResult> => {
		const [meBody, themBody] = await Promise.all([
			tryFetchBody(args.meRootHash),
			tryFetchBody(args.themRootHash),
		]);

		// If we have nothing on either side, skip the LLM and fall back deterministically.
		if (!meBody && !themBody) {
			const fb = deterministicFallback(meBody, themBody);
			cache.set(key, { at: Date.now(), value: fb });
			return fb;
		}

		try {
			const raw = await chat(
				[
					{ role: "system", content: SYSTEM },
					{ role: "user", content: buildPrompt(meBody, themBody) },
				],
				{ maxTokens: 120, temperature: 0.4, jsonMode: true },
			);
			const parsed = JSON.parse(raw) as { score?: unknown; reason?: unknown };
			const score = clamp(Number(parsed.score), 0, 100);
			const reason =
				typeof parsed.reason === "string" && parsed.reason.length > 0
					? parsed.reason.slice(0, 100)
					: "compatibility computed";
			const value: CompatibilityResult = { score, reason };
			cache.set(key, { at: Date.now(), value });
			return value;
		} catch (err) {
			// LLM failure → deterministic fallback (better than 500ing).
			if (process.env.NODE_ENV !== "production") {
				console.warn("[ai/matchmaking] LLM fallback:", err);
			}
			const fb = deterministicFallback(meBody, themBody);
			cache.set(key, { at: Date.now(), value: { ...fb, stale: true } });
			return fb;
		}
	})();

	inFlight.set(key, work);
	try {
		return await work;
	} finally {
		inFlight.delete(key);
	}
}
