/**
 * Day 0 verification: prove 0G Compute is reachable + responding.
 *
 *   bun run packages/backend/scripts/verify-compute.ts
 *
 * Outputs latency, model echo, and a compatibility-style scoring sample so we
 * know JSON-mode and reasoning both work end to end.
 */
import { chat, ZG_COMPUTE_MODEL } from "../src/ai/client";

async function ping() {
	const t0 = performance.now();
	const out = await chat(
		[
			{ role: "system", content: "Reply with exactly the word PONG." },
			{ role: "user", content: "ping" },
		],
		{ maxTokens: 8, temperature: 0 },
	);
	const ms = Math.round(performance.now() - t0);
	console.log(`✓ ping reply (${ms}ms): ${out.trim()}`);
}

async function jsonMode() {
	const t0 = performance.now();
	const out = await chat(
		[
			{
				role: "system",
				content:
					"You are a compatibility scorer. Respond ONLY with JSON like {\"score\": 0-100, \"reason\": \"<one short sentence>\"}.",
			},
			{
				role: "user",
				content:
					"Person A: hobbies=[coffee, hiking, DeFi]. Person B: hobbies=[coffee, hiking, NFTs]. Score their compatibility.",
			},
		],
		{ maxTokens: 120, temperature: 0.2, jsonMode: true },
	);
	const ms = Math.round(performance.now() - t0);
	console.log(`✓ scoring (${ms}ms): ${out.trim()}`);
	try {
		const parsed = JSON.parse(out);
		if (typeof parsed.score === "number" && typeof parsed.reason === "string") {
			console.log("  parsed →", parsed);
		} else {
			console.log("  ⚠ unexpected JSON shape:", parsed);
		}
	} catch (e) {
		console.log("  ⚠ JSON parse failed:", e instanceof Error ? e.message : e);
	}
}

console.log(`model: ${ZG_COMPUTE_MODEL}`);
await ping();
await jsonMode();
console.log("done.");
