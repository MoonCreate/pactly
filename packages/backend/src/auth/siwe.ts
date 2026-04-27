import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { generateSiweNonce, parseSiweMessage, verifySiweMessage } from "viem/siwe";
import { db } from "../db";
import { siweNonce, siweSession, user } from "../db/schema";
import { getPublicClient, supportedChainIds } from "./chain";

const NONCE_TTL_MS = 10 * 60_000; // 10 minutes
const SESSION_TTL_MS = 14 * 24 * 60 * 60_000; // 14 days

const TOKEN_BYTES = 32;

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface IssuedNonce {
  nonce: string;
  expiresAt: Date;
}

export async function issueNonce(): Promise<IssuedNonce> {
  const nonce = generateSiweNonce();
  const expiresAt = new Date(Date.now() + NONCE_TTL_MS);
  await db.insert(siweNonce).values({ nonce, expiresAt });
  return { nonce, expiresAt };
}

export interface VerifiedSession {
  token: string;
  address: `0x${string}`;
  expiresAt: Date;
}

/**
 * Verify a SIWE message + signature, consume the nonce, upsert the user,
 * and mint a session token.
 */
export async function verifyAndIssueSession(args: {
  message: string;
  signature: `0x${string}`;
  expectedDomain?: string;
}): Promise<VerifiedSession> {
  const parsed = parseSiweMessage(args.message);
  if (!parsed.address || !parsed.nonce || !parsed.chainId) {
    throw new Error("invalid SIWE message — missing address, nonce, or chainId");
  }
  if (!supportedChainIds.includes(parsed.chainId)) {
    throw new Error(`unsupported chainId ${parsed.chainId}`);
  }

  // Look up the nonce — must be unconsumed and unexpired.
  const [nonceRow] = await db
    .select()
    .from(siweNonce)
    .where(
      and(
        eq(siweNonce.nonce, parsed.nonce),
        isNull(siweNonce.consumedAt),
        gt(siweNonce.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!nonceRow) throw new Error("nonce not found, expired, or already used");

  const ok = await verifySiweMessage(getPublicClient(parsed.chainId), {
    message: args.message,
    signature: args.signature,
    address: parsed.address,
    nonce: parsed.nonce,
    ...(args.expectedDomain ? { domain: args.expectedDomain } : {}),
  });
  if (!ok) throw new Error("signature verification failed");

  const address = parsed.address.toLowerCase() as `0x${string}`;

  // Burn the nonce. If two requests race, the unique-PK + this update keep us safe.
  const consumed = await db
    .update(siweNonce)
    .set({ consumedAt: new Date() })
    .where(
      and(eq(siweNonce.nonce, parsed.nonce), isNull(siweNonce.consumedAt)),
    )
    .returning({ nonce: siweNonce.nonce });
  if (consumed.length === 0) throw new Error("nonce consumed concurrently");

  // Upsert user.
  await db
    .insert(user)
    .values({ address })
    .onConflictDoUpdate({
      target: user.address,
      set: { lastSeenAt: new Date() },
    });

  const token = randomHex(TOKEN_BYTES);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(siweSession).values({ token, address, expiresAt });

  return { token, address, expiresAt };
}

export interface ResolvedSession {
  token: string;
  address: `0x${string}`;
  expiresAt: Date;
}

export async function resolveSession(
  token: string | null | undefined,
): Promise<ResolvedSession | null> {
  if (!token) return null;
  const [row] = await db
    .select()
    .from(siweSession)
    .where(and(eq(siweSession.token, token), gt(siweSession.expiresAt, new Date())))
    .limit(1);
  if (!row) return null;

  // Best-effort lastSeen update; fire-and-forget.
  void db
    .update(user)
    .set({ lastSeenAt: new Date() })
    .where(eq(user.address, row.address))
    .catch(() => {});

  return {
    token: row.token,
    address: row.address as `0x${string}`,
    expiresAt: row.expiresAt,
  };
}

export async function revokeSession(token: string): Promise<void> {
  await db.delete(siweSession).where(eq(siweSession.token, token));
}

/** Garbage-collect expired nonces. Safe to call on a timer. */
export async function gcExpiredNonces(): Promise<number> {
  const res = await db
    .delete(siweNonce)
    .where(lt(siweNonce.expiresAt, new Date()))
    .returning({ nonce: siweNonce.nonce });
  return res.length;
}
