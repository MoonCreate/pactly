const API_URL =
	import.meta.env.VITE_PACTLY_API_URL ?? "http://localhost:3001";

/**
 * Build the URL for a 0G-backed photo. Returns null when the rootHash is
 * missing/empty so callers can fall back to a placeholder.
 */
export function photoUrl(
	rootHash: string | null | undefined,
): string | null {
	if (!rootHash) return null;
	if (!/^0x[0-9a-fA-F]{64}$/.test(rootHash)) return null;
	return `${API_URL}/storage/blob/${rootHash}`;
}
