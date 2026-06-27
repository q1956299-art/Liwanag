import { type NextRequest, NextResponse } from 'next/server';
import { getSessionWallet } from '@/server/auth/session';
import { toStroops } from '@/server/lib/money';
import { getCampaignById } from '@/server/service/campaign.service';
import { isValidAsset } from '@/server/stellar/network';
import { buildOpenCampaign, sacForAsset } from '@/server/stellar/soroban';

export const maxDuration = 60;

/** Build the organizer-signed open_campaign invoke that registers the campaign on-chain. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const wallet = await getSessionWallet();
    if (!wallet) {
      return NextResponse.json({ error: 'Connect your wallet to open a campaign' }, { status: 401 });
    }
    const { id } = await params;
    const campaign = await getCampaignById(id);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    if (campaign.ownerAddress !== wallet) {
      return NextResponse.json({ error: 'Only the organizer can open this campaign' }, { status: 403 });
    }

    const asset = isValidAsset(campaign.asset) ? campaign.asset : 'XLM';
    const xdr = await buildOpenCampaign({
      organizer: wallet,
      campaignUuid: id,
      token: sacForAsset(asset),
      goal: toStroops(campaign.goalAmount),
    });
    return NextResponse.json({ xdr });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Could not prepare the on-chain campaign';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
