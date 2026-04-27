import { pgTable, index, uniqueIndex } from "drizzle-orm/pg-core";
import { match } from "./match";

/**
 * Chat message MANIFEST. The ciphertext lives on 0G Storage at `rootHash`.
 *  - `iv` is the 12-byte AES-GCM IV (hex, 0x-prefixed) so the recipient can
 *    decrypt without fetching it separately.
 *  - `sequence` is the per-match monotonic ordering used for resumable polling
 *    and re-render after IndexedDB cache invalidation.
 *
 * The backend NEVER touches plaintext. ECDH happens client-side from the two
 * wallet pubkeys (see `profile.encryptionPubKey`).
 */
export const chatMessage = pgTable(
  "chat_message",
  (t) => ({
    id: t.uuid().primaryKey().defaultRandom(),
    matchId: t
      .uuid()
      .notNull()
      .references(() => match.id, { onDelete: "cascade" }),
    sender: t.varchar({ length: 42 }).notNull(),
    sequence: t.integer().notNull(),
    rootHash: t.varchar({ length: 66 }).notNull(),
    iv: t.varchar({ length: 26 }).notNull(),
    createdAt: t.timestamp({ withTimezone: true }).defaultNow().notNull(),
  }),
  (table) => [
    uniqueIndex("chat_message_seq_idx").on(table.matchId, table.sequence),
    index("chat_message_match_created_idx").on(table.matchId, table.createdAt),
  ],
);
