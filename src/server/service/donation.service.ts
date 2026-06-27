import { desc, eq } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { type Donation, donations, type NewDonation } from '@/server/db/schema';

export async function getDonationsByCampaign(campaignId: string): Promise<Donation[]> {
  return db
    .select()
    .from(donations)
    .where(eq(donations.campaignId, campaignId))
    .orderBy(desc(donations.createdAt));
}

export async function createDonation(data: NewDonation): Promise<Donation> {
  const rows = await db.insert(donations).values(data).returning();
  return rows[0];
}
