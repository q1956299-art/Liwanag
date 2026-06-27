import { type NextRequest, NextResponse } from 'next/server';
import { getCampaignById } from '@/server/service/campaign.service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(campaign);
}
