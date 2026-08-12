import { count, countDistinct, notInArray, sql, sum } from 'drizzle-orm';
import { env } from '@/server/config/env';
import { db } from '@/server/db/client';
import { campaigns, donations, sessions, spendItems } from '@/server/db/schema';

export interface PublicStats {
  uniqueWallets: number;
  logins: number;
  campaigns: number;
  donations: number;
  payouts: number;
  totalRaisedXlm: string;
}

const demo = env.DEMO_ADDRESSES;

/** Real interaction counts. Demo/seed wallets excluded from wallet + login counts. */
export async function getPublicStats(): Promise<PublicStats> {
  const walletFilter = demo.length ? notInArray(sessions.publicKey, demo) : undefined;

  const [walletRow] = await db
    .select({ value: countDistinct(sessions.publicKey) })
    .from(sessions)
    .where(walletFilter);

  const [loginRow] = await db
    .select({ value: count() })
    .from(sessions)
    .where(walletFilter);

  const [campaignRow] = await db.select({ value: count() }).from(campaigns);
  const [donationRow] = await db.select({ value: count() }).from(donations);
  const [payoutRow] = await db.select({ value: count() }).from(spendItems);

  const [xlmRow] = await db
    .select({ total: sum(donations.amount) })
    .from(donations)
    .where(sql`${donations.asset} = 'XLM'`);
  const totalRaisedXlm = xlmRow?.total ?? '0';

  return {
    uniqueWallets: walletRow?.value ?? 0,
    logins: loginRow?.value ?? 0,
    campaigns: campaignRow?.value ?? 0,
    donations: donationRow?.value ?? 0,
    payouts: payoutRow?.value ?? 0,
    totalRaisedXlm,
  };
}
