import { desc, eq } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { type NewSpendItem, type SpendItem, spendItems } from '@/server/db/schema';

export async function getSpendsByCampaign(campaignId: string): Promise<SpendItem[]> {
  return db
    .select()
    .from(spendItems)
    .where(eq(spendItems.campaignId, campaignId))
    .orderBy(desc(spendItems.createdAt));
}

export async function createSpend(data: NewSpendItem): Promise<SpendItem> {
  const rows = await db.insert(spendItems).values(data).returning();
  return rows[0];
}
