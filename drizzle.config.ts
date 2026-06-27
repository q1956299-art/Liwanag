import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/server/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DRIZZLE_DATABASE_URL ?? '',
  },
  // Scope push to this project's tables only — the dev DB is shared across
  // hackathon projects, so an unscoped push would try to drop unrelated tables.
  tablesFilter: ['campaigns', 'donations', 'spend_items', 'sessions'],
  strict: true,
  verbose: true,
});
