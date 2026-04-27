import { pgTable, index } from "drizzle-orm/pg-core";
import { user } from "./user";

/**
 * SIWE-issued sessions. Token is opaque (256-bit hex) and lives in an httpOnly cookie.
 */
export const siweSession = pgTable(
  "siwe_session",
  (t) => ({
    token: t.varchar({ length: 64 }).primaryKey(),
    address: t
      .varchar({ length: 42 })
      .notNull()
      .references(() => user.address, { onDelete: "cascade" }),
    issuedAt: t.timestamp({ withTimezone: true }).defaultNow().notNull(),
    expiresAt: t.timestamp({ withTimezone: true }).notNull(),
  }),
  (table) => [index("siwe_session_address_idx").on(table.address)],
);

/**
 * Short-lived nonces handed out by /auth/nonce; consumed at /auth/verify.
 * `viem.generateSiweNonce` returns ~96 chars; size to 128 with headroom.
 */
export const siweNonce = pgTable("siwe_nonce", (t) => ({
  nonce: t.varchar({ length: 128 }).primaryKey(),
  issuedAt: t.timestamp({ withTimezone: true }).defaultNow().notNull(),
  expiresAt: t.timestamp({ withTimezone: true }).notNull(),
  consumedAt: t.timestamp({ withTimezone: true }),
}));
