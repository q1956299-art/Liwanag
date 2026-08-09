import { StrKey } from '@stellar/stellar-sdk';
import { type NextRequest, NextResponse } from 'next/server';
import { isValidAmount, toStroops } from '@/server/lib/money';
import { getCampaignById } from '@/server/service/campaign.service';
import { buildDonate } from '@/server/stellar/soroban';

export const maxDuration = 60;

/** Build the donor-signed `donate` invoke against the CharityCampaign contract. */
export async function POST(req: NextRequest) {
  try {
    const { campaignId, amount, donorAddress } = await req.json();

    if (!campaignId || !amount || !donorAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!StrKey.isValidEd25519PublicKey(donorAddress)) {
      return NextResponse.json({ error: 'Invalid donor wallet address' }, { status: 400 });
    }
    if (!isValidAmount(String(amount))) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    if (campaign.status === 'pending_chain') {
      return NextResponse.json({ error: 'Campaign is not live on-chain yet' }, { status: 409 });
    }
    if (campaign.status === 'closed') {
      return NextResponse.json({ error: 'This campaign is closed to new donations' }, { status: 409 });
    }

    const xdr = await buildDonate({
      donor: donorAddress,
      campaignUuid: campaignId,
      amount: toStroops(String(amount)),
    });
    return NextResponse.json({ xdr });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Could not prepare the donation';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
