import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import {
  issueNonce,
  revokeSession,
  verifyAndIssueSession,
} from "../auth/siwe";
import { protectedProcedure, publicProcedure } from "../trpc";

const HEX_64 = /^0x[0-9a-fA-F]+$/;

export const authRouter = {
  /**
   * Mint a fresh SIWE nonce. Client weaves it into the EIP-4361 message
   * before asking the wallet to sign.
   */
  nonce: publicProcedure.mutation(async () => {
    return issueNonce();
  }),

  /**
   * Verify a SIWE message + signature, mint a session token. Frontend stores
   * this token (e.g. localStorage) and sends it as `Authorization: Bearer …`
   * on subsequent requests.
   */
  verify: publicProcedure
    .input(
      z.object({
        message: z.string().min(1),
        signature: z.string().regex(HEX_64),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        return await verifyAndIssueSession({
          message: input.message,
          signature: input.signature as `0x${string}`,
        });
      } catch (err) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: err instanceof Error ? err.message : "siwe verify failed",
        });
      }
    }),

  /** Returns the resolved session, or null if unauthenticated. */
  me: publicProcedure.query(({ ctx }) => ctx.session),

  logout: protectedProcedure.mutation(async ({ ctx }) => {
    await revokeSession(ctx.session.token);
    return { ok: true };
  }),
} satisfies TRPCRouterRecord;
