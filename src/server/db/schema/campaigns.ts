import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  // Decimal asset-unit strings (e.g. "1000" = 1000 XLM). Display asset is `asset`.
  goalAmount: text('goal_amount').notNull().default('0'),
  raisedAmount: text('raised_amount').notNull().default('0'),
  asset: text('asset').notNull().default('XLM'),
  // The on-chain wallet that receives donations for this campaign.
  stellarAccount: text('stellar_account').notNull(),
  // The wallet that created/owns the campaign (signs the on-chain open + disbursals).
  ownerAddress: text('owner_address').notNull().default(''),
  // Soroban tx hash of open_campaign — proof the campaign exists on-chain.
  openTxHash: text('open_tx_hash'),
  // 'pending_chain' until open_campaign confirms, then 'active', then 'closed'.
  status: text('status').notNull().default('active'),
  category: text('category').notNull().default('disaster-relief'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
