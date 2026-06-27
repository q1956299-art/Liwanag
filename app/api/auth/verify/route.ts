import { type NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/server/auth/session';
import { verifyChallenge } from '@/server/stellar/sep10';

export async function POST(req: NextRequest) {
  try {
    const { publicKey, signedXdr } = await req.json();
    if (!publicKey || !signedXdr) {
      return NextResponse.json({ error: 'publicKey and signedXdr are required' }, { status: 400 });
    }
    const wallet = verifyChallenge(signedXdr, publicKey);
    await createSession(wallet);
    return NextResponse.json({ wallet });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Verification failed' },
      { status: 401 },
    );
  }
}
