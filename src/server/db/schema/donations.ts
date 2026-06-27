import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { campaigns } from './campaigns';

export const donations = pgTable('donations', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id')
    .notNull()
    .references(() => campaigns.id),
  // The donor's on-chain wallet (G...). Source of the verified payment.
  donorAddress: text('donor_address').notNull(),
  amount: text('amount').notNull(),
  asset: text('asset').notNull().default('XLM'),
  // Real Horizon transaction hash of the verified payment.
  txHash: text('tx_hash').notNull(),
  message: text('message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Donation = typeof donations.$inferSelect;
export type NewDonation = typeof donations.$inferInsert;
