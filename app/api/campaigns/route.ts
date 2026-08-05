import { StrKey } from '@stellar/stellar-sdk';
import { type NextRequest, NextResponse } from 'next/server';
import { getSessionWallet } from '@/server/auth/session';
import { isValidAmount } from '@/server/lib/money';
import { createCampaign, getAllCampaigns } from '@/server/service/campaign.service';
import { isValidAsset } from '@/server/stellar/network';

const CATEGORIES = ['disaster-relief', 'medical', 'education', 'community', 'environment'];

export async function GET() {
  const campaigns = await getAllCampaigns();
  return NextResponse.json(campaigns);
}

export async function POST(req: NextRequest) {
  // A connected wallet is required to create (and later sign payouts for) a campaign.
  const wallet = await getSessionWallet();
  if (!wallet) {
    return NextResponse.json({ error: 'Connect your wallet to create a campaign' }, { status: 401 });
  }

  const body = await req.json();
  const name = String(body.name ?? '').trim();
  const description = String(body.description ?? '').trim();
  const goalAmount = String(body.goalAmount ?? '').trim();
  const asset = body.asset ?? 'XLM';
  const category = CATEGORIES.includes(body.category) ? body.category : 'disaster-relief';

  if (!name || !description) {
    return NextResponse.json({ error: 'Name and description are required' }, { status: 400 });
  }
  if (name.length > 120) {
    return NextResponse.json({ error: 'Name is too long (max 120 chars)' }, { status: 400 });
  }
  if (description.length > 1000) {
    return NextResponse.json({ error: 'Description is too long (max 1000 chars)' }, { status: 400 });
  }
  if (!isValidAmount(goalAmount)) {
    return NextResponse.json({ error: 'Goal must be a positive number' }, { status: 400 });
  }
  if (!isValidAsset(asset)) {
    return NextResponse.json({ error: 'Invalid asset' }, { status: 400 });
  }
  if (!StrKey.isValidEd25519PublicKey(wallet)) {
    return NextResponse.json({ error: 'Invalid wallet' }, { status: 400 });
  }

  const campaign = await createCampaign({
    name,
    description,
    goalAmount,
    asset,
    // The connected wallet is the organizer; donations are custodied by the
    // CharityCampaign contract and the organizer signs disbursals.
    stellarAccount: wallet,
    ownerAddress: wallet,
    // Awaiting the on-chain open_campaign invoke (see /api/campaigns/[id]/open).
    status: 'pending_chain',
    category,
  });

  return NextResponse.json(campaign, { status: 201 });
}
