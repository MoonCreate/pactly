import { pgTable } from "drizzle-orm/pg-core";

/**
 * One row per wallet that has signed in via SIWE.
 * Address is lowercased before insert so we never key on mixed-case strings.
 */
export const user = pgTable("user", (t) => ({
  address: t.varchar({ length: 42 }).primaryKey(),
  createdAt: t.timestamp({ withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: t.timestamp({ withTimezone: true }).defaultNow().notNull(),
}));
