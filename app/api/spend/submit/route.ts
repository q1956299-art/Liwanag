import { StrKey } from '@stellar/stellar-sdk';
import { type NextRequest, NextResponse } from 'next/server';
import { getSessionWallet } from '@/server/auth/session';
import { isValidAmount } from '@/server/lib/money';
import { getCampaignById } from '@/server/service/campaign.service';
import { createSpend } from '@/server/service/spend.service';
import { submit } from '@/server/stellar/soroban';

export const maxDuration = 60;

/** Submit the signed `disburse` invoke and record the on-chain payout in the ledger. */
export async function POST(req: NextRequest) {
  try {
    const wallet = await getSessionWallet();
    if (!wallet) {
      return NextResponse.json({ error: 'Connect your wallet to record a payout' }, { status: 401 });
    }

    const { campaignId, signedXdr, description, recipient, amount } = await req.json();
    if (!campaignId || !signedXdr || !description || !recipient || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!StrKey.isValidEd25519PublicKey(recipient)) {
      return NextResponse.json({ error: 'Recipient must be a valid Stellar address' }, { status: 400 });
    }
    if (!isValidAmount(String(amount))) {
      return NextResponse.json({ error: 'Invalid payout amount' }, { status: 400 });
    }

    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    if (campaign.ownerAddress !== wallet) {
      return NextResponse.json({ error: 'Only the campaign organizer can disburse' }, { status: 403 });
    }

    const { hash } = await submit(signedXdr);

    const spend = await createSpend({
      campaignId,
      description: String(description).trim().slice(0, 200),
      amount: String(amount),
      asset: campaign.asset,
      recipient,
      txHash: hash,
    });

    return NextResponse.json({ spend, txHash: hash }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Payout failed on-chain';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
