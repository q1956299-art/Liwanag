import { type NextRequest, NextResponse } from 'next/server';
import { getSessionWallet } from '@/server/auth/session';
import { getCampaignById, markCampaignOpened } from '@/server/service/campaign.service';
import { submit, waitForCampaignReadable } from '@/server/stellar/soroban';

export const maxDuration = 60;

/** Submit the signed open_campaign invoke and mark the campaign live once it confirms. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const wallet = await getSessionWallet();
    if (!wallet) {
      return NextResponse.json({ error: 'Connect your wallet to open a campaign' }, { status: 401 });
    }
    const { id } = await params;
    const { signedXdr } = await req.json();
    if (!signedXdr) {
      return NextResponse.json({ error: 'Missing signed transaction' }, { status: 400 });
    }
    const campaign = await getCampaignById(id);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    if (campaign.ownerAddress !== wallet) {
      return NextResponse.json({ error: 'Only the organizer can open this campaign' }, { status: 403 });
    }

    const { hash } = await submit(signedXdr);
    // Ensure the campaign is queryable on-chain before we report it live, so the
    // donor's very next `donate` build doesn't race the open's confirmation.
    await waitForCampaignReadable(id);
    await markCampaignOpened(id, hash);
    const updated = await getCampaignById(id);
    return NextResponse.json({ campaign: updated, txHash: hash }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'On-chain campaign open failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
