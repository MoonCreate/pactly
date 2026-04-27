import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z, ZodError } from "zod/v4";
import { resolveSession, type ResolvedSession } from "./auth/siwe";
import { db } from "./db";

/**
 * tRPC context. The session (if any) is resolved from the `Authorization: Bearer <token>`
 * header set by the client after a successful SIWE verify.
 */
export const createTRPCContext = async (opts: {
  headers: Headers;
}) => {
  const auth = opts.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : null;
  const session = await resolveSession(token);
  return { session, db };
};

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>> & {
  session: ResolvedSession | null;
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    data: {
      ...shape.data,
      zodError:
        error.cause instanceof ZodError
          ? z.flattenError(error.cause as ZodError<Record<string, unknown>>)
          : null,
    },
  }),
});

export const createTRPCRouter = t.router;

const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();
  const result = await next();
  const end = Date.now();
  if (process.env.NODE_ENV !== "production") {
    console.log(`[TRPC] ${path} took ${end - start}ms to execute`);
  }
  return result;
});

export const publicProcedure = t.procedure.use(timingMiddleware);

export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: { ...ctx, session: ctx.session },
    });
  });
