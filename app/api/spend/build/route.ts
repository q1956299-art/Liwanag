import { StrKey } from '@stellar/stellar-sdk';
import { type NextRequest, NextResponse } from 'next/server';
import { getSessionWallet } from '@/server/auth/session';
import { isValidAmount, toStroops } from '@/server/lib/money';
import { getCampaignById } from '@/server/service/campaign.service';
import { buildDisburse } from '@/server/stellar/soroban';

export const maxDuration = 60;

/** Build the organizer-signed `disburse` invoke (pays a recipient + appends the on-chain ledger). */
export async function POST(req: NextRequest) {
  try {
    const wallet = await getSessionWallet();
    if (!wallet) {
      return NextResponse.json({ error: 'Connect your wallet to record a payout' }, { status: 401 });
    }

    const { campaignId, amount, recipient, description } = await req.json();
    if (!campaignId || !amount || !recipient || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!StrKey.isValidEd25519PublicKey(recipient)) {
      return NextResponse.json({ error: 'Recipient must be a valid Stellar address' }, { status: 400 });
    }
    if (!isValidAmount(String(amount))) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    if (campaign.ownerAddress !== wallet) {
      return NextResponse.json({ error: 'Only the campaign organizer can disburse' }, { status: 403 });
    }

    const xdr = await buildDisburse({
      organizer: wallet,
      campaignUuid: campaignId,
      recipient,
      amount: toStroops(String(amount)),
      memoText: String(description).trim().slice(0, 200),
    });
    return NextResponse.json({ xdr });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Could not prepare the payout';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
