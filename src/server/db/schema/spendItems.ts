import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { campaigns } from './campaigns';

export const spendItems = pgTable('spend_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id')
    .notNull()
    .references(() => campaigns.id),
  description: text('description').notNull(),
  amount: text('amount').notNull(),
  asset: text('asset').notNull().default('XLM'),
  recipient: text('recipient').notNull(),
  // Real Horizon transaction hash of the payout from the campaign wallet.
  txHash: text('tx_hash').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type SpendItem = typeof spendItems.$inferSelect;
export type NewSpendItem = typeof spendItems.$inferInsert;
