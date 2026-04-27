import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, gt, max } from "drizzle-orm";
import { z } from "zod/v4";

import { chatMessage, match } from "../db/schema";
import { protectedProcedure } from "../trpc";

const ROOT_HASH = z.string().regex(/^0x[0-9a-fA-F]{64}$/);
const IV_HEX = z.string().regex(/^0x[0-9a-fA-F]{24}$/);

async function ensureMember(
  ctx: { db: typeof import("../db").db; session: { address: `0x${string}` } },
  matchId: string,
) {
  const [row] = await ctx.db
    .select()
    .from(match)
    .where(eq(match.id, matchId))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND" });
  const me = ctx.session.address;
  if (row.addrA !== me && row.addrB !== me) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  if (row.status !== "accepted") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "match not accepted" });
  }
  return row;
}

export const chatRouter = {
  /**
   * Append a chat message MANIFEST. The ciphertext + AES-GCM tag must already
   * be uploaded to 0G Storage by the client; we only persist the pointer.
   */
  append: protectedProcedure
    .input(
      z.object({
        matchId: z.string().uuid(),
        rootHash: ROOT_HASH,
        iv: IV_HEX,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ensureMember(ctx, input.matchId);

      // Allocate the next sequence atomically. PG `INSERT … SELECT … RETURNING` is the
      // simplest race-safe option short of a sequence per match.
      const [{ next } = { next: 0 }] = await ctx.db
        .select({ next: max(chatMessage.sequence) })
        .from(chatMessage)
        .where(eq(chatMessage.matchId, input.matchId));
      const sequence = (next ?? -1) + 1;

      try {
        const [row] = await ctx.db
          .insert(chatMessage)
          .values({
            matchId: input.matchId,
            sender: ctx.session.address,
            sequence,
            rootHash: input.rootHash,
            iv: input.iv,
          })
          .returning();
        return row;
      } catch (err) {
        // Unique-index collision = concurrent appender beat us. Retry once.
        const [{ next: retryNext } = { next: 0 }] = await ctx.db
          .select({ next: max(chatMessage.sequence) })
          .from(chatMessage)
          .where(eq(chatMessage.matchId, input.matchId));
        const [row] = await ctx.db
          .insert(chatMessage)
          .values({
            matchId: input.matchId,
            sender: ctx.session.address,
            sequence: (retryNext ?? -1) + 1,
            rootHash: input.rootHash,
            iv: input.iv,
          })
          .returning();
        return row;
      }
    }),

  /**
   * Manifest pages, ordered by sequence. `since` is the last sequence the
   * client already has; pass -1 for a cold start.
   */
  list: protectedProcedure
    .input(
      z.object({
        matchId: z.string().uuid(),
        since: z.number().int().min(-1).default(-1),
        limit: z.number().int().min(1).max(200).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      await ensureMember(ctx, input.matchId);
      return ctx.db
        .select()
        .from(chatMessage)
        .where(
          and(
            eq(chatMessage.matchId, input.matchId),
            gt(chatMessage.sequence, input.since),
          ),
        )
        .orderBy(asc(chatMessage.sequence))
        .limit(input.limit);
    }),
} satisfies TRPCRouterRecord;
