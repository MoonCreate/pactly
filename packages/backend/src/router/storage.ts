import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { uploadBytes } from "../storage";
import { protectedProcedure } from "../trpc";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB — generous cap for photos.

export const storageRouter = {
  upload: protectedProcedure
    .input(
      z.object({
        bytes: z.instanceof(Uint8Array),
        purpose: z.enum(["photo", "profile", "chat"]).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      if (input.bytes.byteLength === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "empty body" });
      }
      if (input.bytes.byteLength > MAX_UPLOAD_BYTES) {
        throw new TRPCError({
          code: "PAYLOAD_TOO_LARGE",
          message: `body exceeds ${MAX_UPLOAD_BYTES} bytes`,
        });
      }
      try {
        return await uploadBytes(input.bytes);
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err instanceof Error ? err.message : "0G upload failed",
        });
      }
    }),
} satisfies TRPCRouterRecord;
