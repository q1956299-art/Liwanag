import { type NextRequest, NextResponse } from 'next/server';
import { buildChallenge } from '@/server/stellar/sep10';

export async function POST(req: NextRequest) {
  try {
    const { publicKey } = await req.json();
    if (!publicKey || typeof publicKey !== 'string') {
      return NextResponse.json({ error: 'publicKey is required' }, { status: 400 });
    }
    const xdr = buildChallenge(publicKey);
    return NextResponse.json({ xdr });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to build challenge' },
      { status: 400 },
    );
  }
}
