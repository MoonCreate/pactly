import { trpcClient } from "./trpc";

export interface UploadResult {
	rootHash: `0x${string}`;
	txHash?: string;
}

/**
 * Copy any Uint8Array view into a freshly-allocated ArrayBuffer-backed view.
 * Needed because `TextEncoder.encode` and `File.arrayBuffer()` return views
 * over `ArrayBufferLike` (potentially SharedArrayBuffer), but the tRPC schema
 * is strict on `Uint8Array<ArrayBuffer>`.
 */
function toOwned(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
	const buf = new ArrayBuffer(bytes.byteLength);
	const out = new Uint8Array(buf);
	out.set(bytes);
	return out;
}

export async function uploadBytes(
	bytes: Uint8Array,
	purpose: "photo" | "profile" | "chat" = "profile",
): Promise<UploadResult> {
	const owned = toOwned(bytes);
	return trpcClient.storage.upload.mutate({ bytes: owned, purpose });
}

export async function uploadJSON(value: unknown): Promise<UploadResult> {
	const bytes = new TextEncoder().encode(JSON.stringify(value));
	return uploadBytes(bytes, "profile");
}

export async function uploadPhoto(file: File): Promise<UploadResult> {
	const buf = new Uint8Array(await file.arrayBuffer());
	return uploadBytes(buf, "photo");
}
