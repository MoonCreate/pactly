import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { useAccount, useChainId, useSignMessage } from "wagmi";
import { clearToken, getToken, setToken } from "./auth-token";
import { buildSiweMessage } from "./siwe";
import { trpcClient, useTRPC } from "./trpc";

export type SiweStatus =
	| "idle"
	| "needs-wallet"
	| "needs-signature"
	| "signing"
	| "verifying"
	| "authenticated"
	| "error";

export interface SiweState {
	status: SiweStatus;
	address: `0x${string}` | null;
	error: string | null;
	signIn: () => Promise<void>;
	signOut: () => Promise<void>;
}

export function useSiwe(): SiweState {
	const { address, isConnected } = useAccount();
	const chainId = useChainId();
	const { signMessageAsync } = useSignMessage();
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const [token, setLocalToken] = useState<string | null>(() => getToken());
	const [phase, setPhase] = useState<"idle" | "signing" | "verifying">("idle");
	const [error, setError] = useState<string | null>(null);

	// Cache-backed session lookup. Only runs when a token is present, so
	// signed-out users don't fire a request on every render.
	const meQuery = useQuery({
		...trpc.auth.me.queryOptions(),
		enabled: !!token,
		staleTime: 60_000,
	});

	// Reconcile token vs. server: if the server says no session, or if the
	// connected wallet doesn't match the session's address, drop the token.
	useEffect(() => {
		if (!token || meQuery.isPending) return;
		const me = meQuery.data;
		if (me === null || me === undefined) {
			clearToken();
			setLocalToken(null);
			return;
		}
		if (
			address &&
			me.address.toLowerCase() !== address.toLowerCase()
		) {
			clearToken();
			setLocalToken(null);
		}
	}, [token, meQuery.isPending, meQuery.data, address]);

	const signIn = useCallback(async () => {
		if (!address) {
			setError("connect a wallet first");
			return;
		}
		setError(null);
		try {
			setPhase("signing");
			const { nonce, expiresAt } = await trpcClient.auth.nonce.mutate();
			const message = buildSiweMessage({
				address,
				chainId,
				nonce,
				expiresAt,
			});
			const signature = await signMessageAsync({ message });
			setPhase("verifying");
			const session = await trpcClient.auth.verify.mutate({
				message,
				signature,
			});
			setToken(session.token);
			setLocalToken(session.token);
			// Refresh `auth.me` with the new token attached.
			await queryClient.invalidateQueries({
				queryKey: trpc.auth.me.queryKey(),
			});
			setPhase("idle");
		} catch (e) {
			setPhase("idle");
			setError(e instanceof Error ? e.message : "sign-in failed");
		}
	}, [address, chainId, signMessageAsync, queryClient, trpc.auth.me]);

	const signOut = useCallback(async () => {
		if (token) {
			try {
				await trpcClient.auth.logout.mutate();
			} catch {
				// best-effort
			}
		}
		clearToken();
		setLocalToken(null);
		queryClient.removeQueries({ queryKey: trpc.auth.me.queryKey() });
	}, [token, queryClient, trpc.auth.me]);

	let status: SiweStatus;
	if (phase === "signing") status = "signing";
	else if (phase === "verifying") status = "verifying";
	else if (error) status = "error";
	else if (!isConnected) status = "needs-wallet";
	else if (token && meQuery.data) status = "authenticated";
	else status = "needs-signature";

	return {
		status,
		address: (address ?? null) as `0x${string}` | null,
		error,
		signIn,
		signOut,
	};
}
