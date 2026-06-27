import { desc, eq, ne } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { type Campaign, campaigns, type NewCampaign } from '@/server/db/schema';
import { addAmounts } from '@/server/lib/money';

export { addAmounts, calcProgress, formatAmount, isValidAmount } from '@/server/lib/money';

/** Public listing — only campaigns that have been confirmed on-chain (not pending). */
export async function getAllCampaigns(): Promise<Campaign[]> {
  return db
    .select()
    .from(campaigns)
    .where(ne(campaigns.status, 'pending_chain'))
    .orderBy(desc(campaigns.createdAt));
}

export async function getCampaignById(id: string): Promise<Campaign | undefined> {
  const rows = await db.select().from(campaigns).where(eq(campaigns.id, id));
  return rows[0];
}

export async function createCampaign(data: NewCampaign): Promise<Campaign> {
  const rows = await db.insert(campaigns).values(data).returning();
  return rows[0];
}

export async function updateRaisedAmount(id: string, amount: string): Promise<void> {
  const campaign = await getCampaignById(id);
  if (!campaign) throw new Error('Campaign not found');
  const newRaised = addAmounts(campaign.raisedAmount, amount);
  await db
    .update(campaigns)
    .set({ raisedAmount: newRaised, updatedAt: new Date() })
    .where(eq(campaigns.id, id));
}

/** Set the raised total from the contract's authoritative on-chain figure. */
export async function setRaisedAmount(id: string, raised: string): Promise<void> {
  await db
    .update(campaigns)
    .set({ raisedAmount: raised, updatedAt: new Date() })
    .where(eq(campaigns.id, id));
}

/** Mark a campaign as opened on-chain once open_campaign confirms. */
export async function markCampaignOpened(id: string, openTxHash: string): Promise<void> {
  await db
    .update(campaigns)
    .set({ status: 'active', openTxHash, updatedAt: new Date() })
    .where(eq(campaigns.id, id));
}
