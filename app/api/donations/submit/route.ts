import { StrKey } from '@stellar/stellar-sdk';
import { type NextRequest, NextResponse } from 'next/server';
import { fromStroops, isValidAmount } from '@/server/lib/money';
import { getCampaignById, setRaisedAmount } from '@/server/service/campaign.service';
import { createDonation } from '@/server/service/donation.service';
import { submit } from '@/server/stellar/soroban';

export const maxDuration = 60;

/** Submit the signed `donate` invoke, record the donation, sync the raised total. */
export async function POST(req: NextRequest) {
  try {
    const { campaignId, signedXdr, donorAddress, amount, message } = await req.json();
    if (!campaignId || !signedXdr || !donorAddress || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!StrKey.isValidEd25519PublicKey(donorAddress)) {
      return NextResponse.json({ error: 'Invalid donor wallet address' }, { status: 400 });
    }
    if (!isValidAmount(String(amount))) {
      return NextResponse.json({ error: 'Invalid donation amount' }, { status: 400 });
    }

    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Submit the donor-signed contract invoke; the contract returns the new
    // lifetime raised total (stroops) on success.
    const { hash, returnValue } = await submit(signedXdr);

    const donation = await createDonation({
      campaignId,
      donorAddress,
      amount: String(amount),
      asset: campaign.asset,
      txHash: hash,
      message:
        typeof message === 'string' && message.trim() ? message.trim().slice(0, 140) : null,
    });

    // Reconcile the cached raised figure with the chain's authoritative total.
    if (returnValue !== null && returnValue !== undefined) {
      try {
        await setRaisedAmount(campaignId, fromStroops(BigInt(returnValue as string | number | bigint)));
      } catch {
        /* non-fatal: the /onchain reader will reconcile on next poll */
      }
    }

    return NextResponse.json({ donation, txHash: hash }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Donation failed on-chain';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
