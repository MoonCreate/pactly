import { useQuery } from "@tanstack/react-query";
import type { ProfileBody } from "./profile";

const API_URL =
	import.meta.env.VITE_PACTLY_API_URL ?? "http://localhost:3001";

const ROOT_HASH = /^0x[0-9a-fA-F]{64}$/;

/**
 * Fetch a profile JSON from 0G Storage via the backend's blob proxy.
 * Returns null on 404 (e.g. seed profiles whose JSON we never uploaded),
 * throws on other errors.
 */
export async function fetchProfileBody(
	rootHash: string | null | undefined,
): Promise<ProfileBody | null> {
	if (!rootHash || !ROOT_HASH.test(rootHash)) return null;
	const res = await fetch(`${API_URL}/storage/blob/${rootHash}`);
	if (res.status === 404) return null;
	if (!res.ok) throw new Error(`profile fetch ${res.status}`);
	try {
		return (await res.json()) as ProfileBody;
	} catch {
		// blob exists but isn't JSON (corrupt or wrong rootHash) — treat as missing
		return null;
	}
}

export function useProfileBody(rootHash: string | null | undefined) {
	return useQuery({
		queryKey: ["profile-body", rootHash ?? null],
		queryFn: () => fetchProfileBody(rootHash),
		enabled: !!rootHash,
		staleTime: 5 * 60_000, // profile JSONs are content-addressed; cache hard.
	});
}
