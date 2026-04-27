import { secp256k1 } from "@noble/curves/secp256k1.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

const DERIVATION_MESSAGE =
	"Pactly v1: derive chat keys.\n\n" +
	"This signature deterministically generates the keypair Pactly uses to encrypt your messages. " +
	"It costs no gas and grants no on-chain permissions. " +
	"Sign once per device.";

const STORAGE_KEY = "pactly:chat-keys";

export interface ChatKeys {
	address: `0x${string}`;
	privKey: `0x${string}`;
	/** Uncompressed secp256k1 pubkey, 65 bytes, 0x04 prefix. */
	pubKey: `0x${string}`;
}

interface StoredKeys {
	[address: string]: { privKey: string; pubKey: string };
}

function readStore(): StoredKeys {
	if (typeof window === "undefined") return {};
	const raw = window.localStorage.getItem(STORAGE_KEY);
	if (!raw) return {};
	try {
		return JSON.parse(raw) as StoredKeys;
	} catch {
		return {};
	}
}

function writeStore(s: StoredKeys) {
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function getCachedChatKeys(address: `0x${string}`): ChatKeys | null {
	const k = readStore()[address.toLowerCase()];
	if (!k) return null;
	return {
		address,
		privKey: k.privKey as `0x${string}`,
		pubKey: k.pubKey as `0x${string}`,
	};
}

export interface DeriveArgs {
	address: `0x${string}`;
	signMessage: (args: { message: string }) => Promise<`0x${string}`>;
}

/**
 * Deterministic keypair derivation. The same wallet always produces the same
 * keypair on the same device. We persist the derived keys in localStorage so
 * users don't have to re-sign on every page load.
 *
 * Privacy note: losing the wallet = losing chat history (acknowledged in
 * docs/plan.md L88).
 */
export async function deriveChatKeys({
	address,
	signMessage,
}: DeriveArgs): Promise<ChatKeys> {
	const cached = getCachedChatKeys(address);
	if (cached) return cached;

	const signature = await signMessage({ message: DERIVATION_MESSAGE });
	const seed = sha256(hexToBytes(signature.startsWith("0x") ? signature.slice(2) : signature));
	// secp256k1 priv key must be in [1, n-1]; the SHA-256 output is 32 bytes
	// which collides with that range with negligible probability. If by chance
	// we hit 0 or >= n, fall back by re-hashing the seed.
	let priv = seed;
	while (true) {
		try {
			secp256k1.getPublicKey(priv, false);
			break;
		} catch {
			priv = sha256(priv);
		}
	}
	const pub = secp256k1.getPublicKey(priv, false);
	const keys: ChatKeys = {
		address,
		privKey: ("0x" + bytesToHex(priv)) as `0x${string}`,
		pubKey: ("0x" + bytesToHex(pub)) as `0x${string}`,
	};
	const store = readStore();
	store[address.toLowerCase()] = { privKey: keys.privKey, pubKey: keys.pubKey };
	writeStore(store);
	return keys;
}

/** ECDH shared secret between two wallets' chat pubkeys. */
export function deriveSharedSecret(
	myPriv: `0x${string}`,
	peerPub: `0x${string}`,
): Uint8Array {
	const shared = secp256k1.getSharedSecret(
		hexToBytes(myPriv.slice(2)),
		hexToBytes(peerPub.slice(2)),
	);
	// Hash to 32 bytes for AES-256 use; drop the 0x04 prefix Noble may include.
	return sha256(shared.slice(1));
}
