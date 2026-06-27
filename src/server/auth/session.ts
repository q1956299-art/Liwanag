import { createHmac, timingSafeEqual } from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { env } from '@/server/config/env';
import { db } from '@/server/db/client';
import { sessions } from '@/server/db/schema';

const COOKIE_NAME = 'liwanag_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function sign(value: string): string {
  return createHmac('sha256', env.SESSION_SECRET).update(value).digest('hex');
}

function tokenFor(sessionId: string): string {
  return `${sessionId}.${sign(sessionId)}`;
}

function parseToken(token: string): string | null {
  const idx = token.lastIndexOf('.');
  if (idx < 0) return null;
  const id = token.slice(0, idx);
  const mac = token.slice(idx + 1);
  const expected = sign(id);
  if (mac.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  return id;
}

/** Create a DB session for a wallet and set the signed cookie. */
export async function createSession(publicKey: string): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const rows = await db.insert(sessions).values({ publicKey, expiresAt }).returning();
  const session = rows[0];
  const store = await cookies();
  store.set(COOKIE_NAME, tokenFor(session.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });
}

/** Read the current authenticated wallet, or null. Validates signature + expiry. */
export async function getSessionWallet(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const id = parseToken(token);
  if (!id) return null;
  const rows = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0]?.publicKey ?? null;
}

/** Clear the session cookie (disconnect). */
export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
