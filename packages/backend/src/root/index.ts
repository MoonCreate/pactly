import { authRouter } from "../router/auth";
import { chatRouter } from "../router/chat";
import { matchRouter } from "../router/match";
import { profileRouter } from "../router/profile";
import { storageRouter } from "../router/storage";
import { wingmanRouter } from "../router/wingman";
import { createTRPCRouter } from "../trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  profile: profileRouter,
  match: matchRouter,
  chat: chatRouter,
  storage: storageRouter,
  wingman: wingmanRouter,
});

export type AppRouter = typeof appRouter;
