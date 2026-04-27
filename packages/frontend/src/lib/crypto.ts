import { gcm } from "@noble/ciphers/aes.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

/**
 * AES-256-GCM helpers for chat. The shared key comes from
 * `deriveSharedSecret(myPriv, peerPub)` in `lib/keys.ts` — both wallets
 * derive the same 32-byte secret, so plaintext travels encrypted between
 * them and only ciphertext lands on 0G Storage.
 */

const IV_BYTES = 12;

function randomIv(): Uint8Array<ArrayBuffer> {
	const iv = new Uint8Array(new ArrayBuffer(IV_BYTES));
	crypto.getRandomValues(iv);
	return iv;
}

export interface EncryptResult {
	/** Ciphertext incl. 16-byte AES-GCM tag at the tail. */
	ciphertext: Uint8Array;
	/** 12-byte IV (random per message). Hex `0x…` for the manifest. */
	ivHex: `0x${string}`;
}

export function encryptMessage(
	plaintext: string,
	sharedSecret: Uint8Array,
): EncryptResult {
	const iv = randomIv();
	const cipher = gcm(sharedSecret, iv);
	const ciphertext = cipher.encrypt(new TextEncoder().encode(plaintext));
	return { ciphertext, ivHex: `0x${bytesToHex(iv)}` as `0x${string}` };
}

export function decryptMessage(
	ciphertext: Uint8Array,
	ivHex: string,
	sharedSecret: Uint8Array,
): string {
	const iv = hexToBytes(ivHex.startsWith("0x") ? ivHex.slice(2) : ivHex);
	const cipher = gcm(sharedSecret, iv);
	const plaintext = cipher.decrypt(ciphertext);
	return new TextDecoder().decode(plaintext);
}
