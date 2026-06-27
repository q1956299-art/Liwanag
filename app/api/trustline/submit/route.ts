import { type NextRequest, NextResponse } from 'next/server';
import { describeStellarError, submitSignedXdr } from '@/server/stellar/payments';

export async function POST(req: NextRequest) {
  try {
    const { signedXdr } = await req.json();
    if (!signedXdr) {
      return NextResponse.json({ error: 'Missing signedXdr' }, { status: 400 });
    }
    const txHash = await submitSignedXdr(signedXdr);
    return NextResponse.json({ txHash });
  } catch (err) {
    return NextResponse.json({ error: describeStellarError(err) }, { status: 400 });
  }
}
