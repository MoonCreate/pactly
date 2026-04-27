import type { TRPCRouterRecord } from "@trpc/server";
import { desc, eq, ne } from "drizzle-orm";
import { z } from "zod/v4";

import { profile } from "../db/schema";
import { protectedProcedure, publicProcedure } from "../trpc";

const ADDR = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/)
  .transform((s) => s.toLowerCase() as `0x${string}`);

const ROOT_HASH = z.string().regex(/^0x[0-9a-fA-F]{64}$/);

export const profileRouter = {
  upsert: protectedProcedure
    .input(
      z.object({
        displayName: z.string().min(1).max(64),
        profileRootHash: ROOT_HASH,
        photoRootHash: ROOT_HASH.optional(),
        encryptionPubKey: z
          .string()
          .regex(/^0x04[0-9a-fA-F]{128}$/, "expected uncompressed secp256k1 pubkey"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const address = ctx.session.address;
      const values = {
        address,
        displayName: input.displayName,
        profileRootHash: input.profileRootHash,
        photoRootHash: input.photoRootHash,
        encryptionPubKey: input.encryptionPubKey,
        updatedAt: new Date(),
      };
      await ctx.db
        .insert(profile)
        .values(values)
        .onConflictDoUpdate({
          target: profile.address,
          set: {
            displayName: values.displayName,
            profileRootHash: values.profileRootHash,
            photoRootHash: values.photoRootHash,
            encryptionPubKey: values.encryptionPubKey,
            updatedAt: values.updatedAt,
          },
        });
      return values;
    }),

  byAddress: publicProcedure.input(ADDR).query(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .select()
      .from(profile)
      .where(eq(profile.address, input))
      .limit(1);
    return row ?? null;
  }),

  /** List recently-updated profiles excluding the caller. */
  browse: protectedProcedure
    .input(
      z
        .object({ limit: z.number().int().min(1).max(50).default(20) })
        .default({ limit: 20 }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(profile)
        .where(ne(profile.address, ctx.session.address))
        .orderBy(desc(profile.updatedAt))
        .limit(input.limit);
    }),
} satisfies TRPCRouterRecord;
