import type { AppRouter } from "@pactly/backend";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import superjson from "superjson";
import { getToken } from "./auth-token";

const API_URL = import.meta.env.VITE_PACTLY_API_URL ?? "http://localhost:3001";

/**
 * Imperative client. Use this for one-off calls outside React render trees
 * (e.g. SIWE flow, scripts). Inside components prefer the React Query
 * integration via `useTRPC()`.
 */
export const trpcClient = createTRPCClient<AppRouter>({
	links: [
		httpBatchLink({
			url: `${API_URL}/trpc`,
			transformer: superjson,
			headers() {
				const t = getToken();
				return t ? { authorization: `Bearer ${t}` } : {};
			},
		}),
	],
});

/**
 * React Query bridge. Components do:
 *   const trpc = useTRPC();
 *   const q = useQuery(trpc.profile.byAddress.queryOptions(addr));
 *   const m = useMutation(trpc.match.request.mutationOptions());
 */
export const { TRPCProvider, useTRPC, useTRPCClient } =
	createTRPCContext<AppRouter>();
