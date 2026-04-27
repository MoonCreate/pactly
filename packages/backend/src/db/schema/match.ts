import { pgTable, index, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./user";

/**
 * Match request between two wallets. We store the lower address as `addrA` and
 * the higher as `addrB` so the unique index naturally dedupes either direction.
 */
export const match = pgTable(
  "match",
  (t) => ({
    id: t.uuid().primaryKey().defaultRandom(),
    addrA: t
      .varchar({ length: 42 })
      .notNull()
      .references(() => user.address, { onDelete: "cascade" }),
    addrB: t
      .varchar({ length: 42 })
      .notNull()
      .references(() => user.address, { onDelete: "cascade" }),
    /** Address of the wallet that initiated the match request. */
    initiator: t.varchar({ length: 42 }).notNull(),
    status: t.varchar({ length: 16 }).notNull().default("pending"), // pending | accepted | rejected
    createdAt: t.timestamp({ withTimezone: true }).defaultNow().notNull(),
    acceptedAt: t.timestamp({ withTimezone: true }),
  }),
  (table) => [
    uniqueIndex("match_pair_idx").on(table.addrA, table.addrB),
    index("match_addr_a_idx").on(table.addrA),
    index("match_addr_b_idx").on(table.addrB),
  ],
);
