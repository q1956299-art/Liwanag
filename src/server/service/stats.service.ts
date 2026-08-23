import { count, countDistinct, notInArray, sql } from 'drizzle-orm';
import { env } from '@/server/config/env';
import { db } from '@/server/db/client';
import { campaigns, donations, sessions, spendItems } from '@/server/db/schema';
import { addAmounts } from '@/server/lib/money';
import { readPoolBalanceStroops } from '@/server/stellar/soroban';

export interface PublicStats {
  uniqueWallets: number;
  logins: number;
  campaigns: number;
  donations: number;
  payouts: number;
  totalRaisedXlm: string;
  poolBalanceXlm: string;
}

function formatXlm4dp(stroops: bigint): string {
  const whole = stroops / 10_000_000n;
  const frac4 = (stroops % 10_000_000n).toString().padStart(7, '0').slice(0, 4);
  return `${whole}.${frac4}`;
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

  // Sum XLM donations only (asset = 'XLM') for a headline raised figure.
  const xlmDonations = await db
    .select({ amount: donations.amount })
    .from(donations)
    .where(sql`${donations.asset} = 'XLM'`);
  let totalRaisedXlm = '0';
  for (const d of xlmDonations) totalRaisedXlm = addAmounts(totalRaisedXlm, d.amount);

  let poolBalanceXlm = '0.0000';
  try {
    poolBalanceXlm = formatXlm4dp(BigInt(await readPoolBalanceStroops()));
  } catch {
    /* keep '0.0000' */
  }

  return {
    uniqueWallets: walletRow?.value ?? 0,
    logins: loginRow?.value ?? 0,
    campaigns: campaignRow?.value ?? 0,
    donations: donationRow?.value ?? 0,
    payouts: payoutRow?.value ?? 0,
    totalRaisedXlm,
    poolBalanceXlm,
  };
}
