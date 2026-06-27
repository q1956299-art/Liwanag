import { NextResponse } from 'next/server';
import { getPublicStats } from '@/server/service/stats.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = await getPublicStats();
    return NextResponse.json(stats);
  } catch {
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
