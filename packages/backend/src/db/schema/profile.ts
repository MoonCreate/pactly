import { pgTable, index } from "drizzle-orm/pg-core";
import { user } from "./user";

/**
 * Indexable profile metadata. The full profile JSON (bio, hobbies, photos)
 * lives on 0G Storage at `profileRootHash`. We only keep what we need to
 * browse / filter / show in cards.
 */
export const profile = pgTable(
  "profile",
  (t) => ({
    address: t
      .varchar({ length: 42 })
      .primaryKey()
      .references(() => user.address, { onDelete: "cascade" }),
    displayName: t.varchar({ length: 64 }).notNull(),
    profileRootHash: t.varchar({ length: 66 }).notNull(),
    photoRootHash: t.varchar({ length: 66 }),
    /**
     * secp256k1 pubkey (uncompressed, 0x04…) used for ECDH. Derived from the
     * wallet on the client; we just relay it so peers can compute the shared
     * secret without re-signing.
     */
    encryptionPubKey: t.varchar({ length: 132 }).notNull(),
    updatedAt: t.timestamp({ withTimezone: true }).defaultNow().notNull(),
  }),
  (table) => [index("profile_updated_idx").on(table.updatedAt)],
);
