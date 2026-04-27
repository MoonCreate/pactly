import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";

import { chat } from "../ai/client";
import { match } from "../db/schema";
import { protectedProcedure } from "../trpc";

const TURN = z.object({
	from: z.enum(["me", "them"]),
	text: z.string().min(1).max(800),
});

const SYSTEM = `You are "Wingman" — an in-chat assistant on a dating app called Pactly.

Generate exactly 3 short reply suggestions in the user's voice that the user can send next. Aim:
- conversational, warm, curious
- ≤ 80 chars each, lowercase OK
- vary the angle (question / playful / forward)
- never sound like an AI — no "I'd love to" or "fascinating"
- never apologise; never refuse
- match the recent messages' tone (formal stays formal, casual stays casual)

Output ONLY a JSON object: {"suggestions": ["…", "…", "…"]}.`;

function summarizeTurns(
	turns: { from: "me" | "them"; text: string }[],
	myName: string,
	theirName: string,
): string {
	return turns
		.map((t) => `${t.from === "me" ? myName : theirName}: ${t.text}`)
		.join("\n");
}

export const wingmanRouter = {
	suggest: protectedProcedure
		.input(
			z.object({
				matchId: z.string().uuid(),
				recent: z.array(TURN).min(1).max(20),
				myDisplayName: z.string().min(1).max(64),
				theirDisplayName: z.string().min(1).max(64),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Auth: caller must be a member of this match.
			const me = ctx.session.address;
			const [row] = await ctx.db
				.select()
				.from(match)
				.where(eq(match.id, input.matchId))
				.limit(1);
			if (!row) throw new TRPCError({ code: "NOT_FOUND" });
			if (row.addrA !== me && row.addrB !== me) {
				throw new TRPCError({ code: "FORBIDDEN" });
			}

			const transcript = summarizeTurns(
				input.recent,
				input.myDisplayName,
				input.theirDisplayName,
			);

			try {
				const raw = await chat(
					[
						{ role: "system", content: SYSTEM },
						{
							role: "user",
							content: `Recent messages between ${input.myDisplayName} (me) and ${input.theirDisplayName}:\n\n${transcript}\n\nSuggest 3 replies for me.`,
						},
					],
					{ maxTokens: 220, temperature: 0.7, jsonMode: true },
				);
				const parsed = JSON.parse(raw) as { suggestions?: unknown };
				const suggestions = Array.isArray(parsed.suggestions)
					? parsed.suggestions
							.filter((s): s is string => typeof s === "string")
							.map((s) => s.trim())
							.filter(Boolean)
							.slice(0, 3)
					: [];
				if (suggestions.length === 0) {
					throw new Error("empty suggestions");
				}
				return { suggestions };
			} catch (err) {
				if (process.env.NODE_ENV !== "production") {
					console.warn("[wingman] LLM fallback:", err);
				}
				// Fallback so demo never silently breaks.
				return {
					suggestions: [
						"so what's been on your mind today?",
						"random — coffee saturday?",
						"tell me the weirdest hobby you have",
					],
				};
			}
		}),
} satisfies TRPCRouterRecord;
