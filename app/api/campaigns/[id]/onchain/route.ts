import { type NextRequest, NextResponse } from 'next/server';
import { getCampaignById, setRaisedAmount } from '@/server/service/campaign.service';
import { readCampaign } from '@/server/stellar/soroban';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Live on-chain campaign figures, read straight from the CharityCampaign
 * contract via simulation. Powers the campaign page's live board.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const onchain = await readCampaign(id);
    if (!onchain) {
      return NextResponse.json({ raised: '0', balance: '0', donors: 0, spends: 0 });
    }
    // Keep the cached DB figure in sync with the chain (best-effort).
    const campaign = await getCampaignById(id);
    if (campaign && campaign.raisedAmount !== onchain.raised) {
      await setRaisedAmount(id, onchain.raised).catch(() => {});
    }
    return NextResponse.json({
      raised: onchain.raised,
      balance: onchain.balance,
      disbursed: onchain.disbursed,
      donors: onchain.donors,
      spends: onchain.spends,
      status: onchain.status,
    });
  } catch {
    return NextResponse.json({ raised: '0', balance: '0', donors: 0, spends: 0 });
  }
}
