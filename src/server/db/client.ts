import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '@/server/config/env';
import * as schema from '@/server/db/schema';

const globalForDb = globalThis as unknown as { pgPool: Pool | undefined };

// Reuse one small pool per serverless instance (cached on globalThis even in
// production) so concurrent invocations don't churn connections and exhaust the
// Supabase session pooler under load.
const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString: env.DRIZZLE_DATABASE_URL,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });

globalForDb.pgPool = pool;

export const db = drizzle(pool, { schema });
export type Database = typeof db;
