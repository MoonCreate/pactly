import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useSignMessage } from "wagmi";
import { deriveChatKeys, deriveSharedSecret, getCachedChatKeys } from "./keys";
import { useTRPC } from "./trpc";

/**
 * Resolve everything needed to encrypt/decrypt a chat with `peerAddress`:
 *  1. Our own chat keypair (deterministic from a wallet sig, cached locally).
 *  2. The peer's encryption pubkey from their profile.
 *  3. ECDH shared secret between the two.
 *
 * Returns null while still loading or if any piece is missing.
 */
export function useChatSecret(args: {
	myAddress: `0x${string}` | null | undefined;
	peerAddress: `0x${string}` | null | undefined;
}) {
	const trpc = useTRPC();
	const { signMessageAsync } = useSignMessage();

	const peerProfile = useQuery({
		...trpc.profile.byAddress.queryOptions(args.peerAddress as `0x${string}`),
		enabled: !!args.peerAddress,
	});

	const [secret, setSecret] = useState<Uint8Array | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setSecret(null);
		setError(null);
		const my = args.myAddress;
		const peerKey = peerProfile.data?.encryptionPubKey as
			| `0x${string}`
			| undefined;
		if (!my || !peerKey) return;
		let cancelled = false;
		(async () => {
			try {
				const myKeys =
					getCachedChatKeys(my) ??
					(await deriveChatKeys({ address: my, signMessage: signMessageAsync }));
				const sec = deriveSharedSecret(myKeys.privKey, peerKey);
				if (!cancelled) setSecret(sec);
			} catch (e) {
				if (!cancelled) {
					setError(e instanceof Error ? e.message : "key derivation failed");
				}
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [args.myAddress, peerProfile.data?.encryptionPubKey, signMessageAsync]);

	return {
		secret,
		peerProfile: peerProfile.data ?? null,
		isLoading: peerProfile.isPending || (!secret && !error),
		error: error ?? (peerProfile.error?.message ?? null),
	};
}
