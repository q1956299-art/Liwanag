import { count, countDistinct, notInArray, sql, sum } from 'drizzle-orm';
import { readPoolBalanceStroops } from '@/server/stellar/soroban';
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
  poolBalanceXlm: string;
}

const demo = env.DEMO_ADDRESSES;

function formatXlmFourDp(stroopsText: string): string {
  const stroops = BigInt(stroopsText);
  const whole = stroops / 10_000_000n;
  const frac = ((stroops % 10_000_000n) / 1000n).toString().padStart(4, '0');
  return `${whole}.${frac}`;
}

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

  let poolBalanceXlm = '0.0000';
  try {
    const stroops = await readPoolBalanceStroops();
    poolBalanceXlm = formatXlmFourDp(stroops);
  } catch {
    poolBalanceXlm = '0.0000';
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
