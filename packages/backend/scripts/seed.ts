/**
 * Seed a handful of mock profiles into Postgres so /browse has cards to render
 * during dev. Idempotent — re-running just upserts the same rows.
 *
 *   bun run packages/backend/scripts/seed.ts
 *
 * Notes:
 *  - Addresses are deterministic via privateKeyToAccount(0x01..) etc.
 *  - profileRootHash is a sentinel; the JSON body isn't actually on 0G yet.
 *    Cards only need displayName + photoRootHash for display, so this is fine
 *    for hackathon-stage demoing. Upgrade later if we add a profile-detail view
 *    that fetches the body.
 *  - photoRootHash is left null — cards fall back to striped pastel placeholders
 *    which are still demo-quality.
 */
import { keccak256, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { db } from "../src/db";
import { profile, user } from "../src/db/schema";

interface SeedProfile {
	keyByte: number; // private key fill byte 0x01..0xff
	displayName: string;
	hobbies: string[];
}

const SEEDS: SeedProfile[] = [
	{ keyByte: 0xa1, displayName: "Aria", hobbies: ["coffee", "hiking", "DeFi"] },
	{
		keyByte: 0xb2,
		displayName: "Minh",
		hobbies: ["design", "cycling", "writing"],
	},
	{ keyByte: 0xc3, displayName: "Kai", hobbies: ["NFTs", "cocktails", "yoga"] },
	{
		keyByte: 0xd4,
		displayName: "Noor",
		hobbies: ["DAOs", "reading", "pets"],
	},
	{ keyByte: 0xe5, displayName: "Rio", hobbies: ["photography", "jazz", "art"] },
];

/**
 * 65-byte uncompressed pubkey derived from the private key — matches the
 * regex our schema enforces (`^0x04[0-9a-fA-F]{128}$`). Not actually used to
 * decrypt anything for seed rows; just a placeholder so chat code paths don't
 * blow up if a real user matches a seed and the chat path tries to ECDH.
 */
function fakePubKey(keyByte: number): `0x${string}` {
	const filler = keyByte.toString(16).padStart(2, "0").repeat(64);
	return `0x04${filler}` as `0x${string}`;
}

function fakeProfileRootHash(seed: string): `0x${string}` {
	return keccak256(toHex(`pactly-seed-profile:${seed}`));
}

async function main() {
	console.log("seeding…");
	for (const s of SEEDS) {
		const pk = `0x${s.keyByte.toString(16).padStart(2, "0").repeat(32)}` as `0x${string}`;
		const account = privateKeyToAccount(pk);
		const address = account.address.toLowerCase() as `0x${string}`;

		await db
			.insert(user)
			.values({ address })
			.onConflictDoNothing();

		await db
			.insert(profile)
			.values({
				address,
				displayName: s.displayName,
				profileRootHash: fakeProfileRootHash(s.displayName),
				photoRootHash: null,
				encryptionPubKey: fakePubKey(s.keyByte),
				updatedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: profile.address,
				set: {
					displayName: s.displayName,
					updatedAt: new Date(),
				},
			});

		console.log(` · ${s.displayName.padEnd(8)} ${address}`);
	}
	console.log(`done — ${SEEDS.length} profiles ready.`);
}

await main();
