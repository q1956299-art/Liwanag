import { StrKey } from '@stellar/stellar-sdk';
import { type NextRequest, NextResponse } from 'next/server';
import { buildEnableUsdcXdr, describeStellarError } from '@/server/stellar/payments';

export async function POST(req: NextRequest) {
  try {
    const { account } = await req.json();
    if (!account || !StrKey.isValidEd25519PublicKey(account)) {
      return NextResponse.json({ error: 'Invalid account' }, { status: 400 });
    }
    const xdr = await buildEnableUsdcXdr(account);
    return NextResponse.json({ xdr });
  } catch (err) {
    return NextResponse.json({ error: describeStellarError(err) }, { status: 400 });
  }
}
