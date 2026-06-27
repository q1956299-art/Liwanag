import { NextResponse } from 'next/server';
import { getSessionWallet } from '@/server/auth/session';

export async function GET() {
  const wallet = await getSessionWallet();
  return NextResponse.json({ wallet });
}
