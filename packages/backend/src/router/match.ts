import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { z } from "zod/v4";

import { scoreCompatibility } from "../ai/matchmaking";
import { match, profile } from "../db/schema";
import { protectedProcedure } from "../trpc";

const ADDR = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/)
  .transform((s) => s.toLowerCase() as `0x${string}`);

function pair(a: `0x${string}`, b: `0x${string}`) {
  return a < b ? { addrA: a, addrB: b } : { addrA: b, addrB: a };
}

export const matchRouter = {
  /**
   * Send a match request. Idempotent on existing pairs.
   *
   * If a pending request from the counterparty already exists, this is the
   * mutual-match moment — flip to `accepted` and return `mutual: true`. The
   * frontend uses that flag to fire the celebration confetti.
   */
  request: protectedProcedure
    .input(z.object({ counterparty: ADDR }))
    .mutation(async ({ ctx, input }) => {
      const me = ctx.session.address;
      if (input.counterparty === me) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "cannot match yourself" });
      }
      const { addrA, addrB } = pair(me, input.counterparty);

      // Try-insert. If the (addrA, addrB) unique pair already exists,
      // ON CONFLICT skips it and `created` is undefined — fall through to
      // the existing-row path. This is race-safe under concurrent requests.
      const [created] = await ctx.db
        .insert(match)
        .values({ addrA, addrB, initiator: me, status: "pending" })
        .onConflictDoNothing()
        .returning();

      if (created) {
        return { ...created, mutual: false };
      }

      const [existing] = await ctx.db
        .select()
        .from(match)
        .where(and(eq(match.addrA, addrA), eq(match.addrB, addrB)))
        .limit(1);
      if (!existing) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "match conflict but no row to read",
        });
      }

      // Counterparty already wanted us; this is the mutual moment.
      if (existing.status === "pending" && existing.initiator !== me) {
        const [accepted] = await ctx.db
          .update(match)
          .set({ status: "accepted", acceptedAt: new Date() })
          .where(eq(match.id, existing.id))
          .returning();
        return { ...accepted, mutual: true };
      }
      return { ...existing, mutual: existing.status === "accepted" };
    }),

  accept: protectedProcedure
    .input(z.object({ matchId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
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
      if (row.initiator === me) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "initiator cannot accept own request" });
      }
      if (row.status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `match is ${row.status}` });
      }
      const [updated] = await ctx.db
        .update(match)
        .set({ status: "accepted", acceptedAt: new Date() })
        .where(eq(match.id, input.matchId))
        .returning();
      return updated;
    }),

  /**
   * All matches involving the caller, newest first. Each row carries:
   *  - `mine`: true if I sent this request, false if I received it.
   *  - `counterparty`: the other side's profile row, or null if they haven't
   *    onboarded a profile yet.
   * One DB call for matches + one for profiles, no per-row N+1.
   */
  list: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(["pending", "accepted", "rejected"]).optional(),
        })
        .default({}),
    )
    .query(async ({ ctx, input }) => {
      const me = ctx.session.address;
      const condition = input.status
        ? and(
            or(eq(match.addrA, me), eq(match.addrB, me)),
            eq(match.status, input.status),
          )
        : or(eq(match.addrA, me), eq(match.addrB, me));

      const rows = await ctx.db
        .select()
        .from(match)
        .where(condition)
        .orderBy(desc(match.createdAt));

      if (rows.length === 0) return [];

      const counterAddrs = Array.from(
        new Set(rows.map((r) => (r.addrA === me ? r.addrB : r.addrA))),
      );
      const profiles = await ctx.db
        .select()
        .from(profile)
        .where(inArray(profile.address, counterAddrs));
      const profileMap = new Map(profiles.map((p) => [p.address, p]));

      return rows.map((r) => {
        const counterAddr = r.addrA === me ? r.addrB : r.addrA;
        return {
          ...r,
          mine: r.initiator === me,
          counterparty: profileMap.get(counterAddr) ?? null,
        };
      });
    }),

  byId: protectedProcedure
    .input(z.object({ matchId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
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
      return row;
    }),

  /**
   * AI-scored compatibility for a candidate. Reads both profile JSONs from
   * 0G Storage and asks 0G Compute (qwen-2.5-7b-instruct) for a score + reason.
   * Cached in-process for 30 min, deterministic fallback on LLM failure.
   */
  compatibility: protectedProcedure
    .input(z.object({ counterparty: ADDR }))
    .query(async ({ ctx, input }) => {
      const me = ctx.session.address;
      if (input.counterparty === me) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "self" });
      }
      const [myProfile] = await ctx.db
        .select()
        .from(profile)
        .where(eq(profile.address, me))
        .limit(1);
      const [theirProfile] = await ctx.db
        .select()
        .from(profile)
        .where(eq(profile.address, input.counterparty))
        .limit(1);

      return scoreCompatibility({
        meAddress: me,
        meRootHash: myProfile?.profileRootHash ?? null,
        themAddress: input.counterparty,
        themRootHash: theirProfile?.profileRootHash ?? null,
      });
    }),
} satisfies TRPCRouterRecord;
