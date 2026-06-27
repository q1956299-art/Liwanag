'use client';

import { Loader2, ShieldPlus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useWallet } from '@/ui/wallet/wallet-context';

/** One-tap "Enable USDC" — builds, signs and submits a changeTrust to the USDC issuer. */
export function EnableUsdcButton({ onDone }: { onDone?: () => void }) {
  const { address, connect, sign } = useWallet();
  const [loading, setLoading] = useState(false);

  async function enable() {
    setLoading(true);
    try {
      const acct = address ?? (await connect());
      if (!acct) return;

      const buildRes = await fetch('/api/trustline/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: acct }),
      });
      const build = await buildRes.json();
      if (!buildRes.ok) throw new Error(build.error ?? 'Could not build trustline');

      const signed = await sign(build.xdr);

      const subRes = await fetch('/api/trustline/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedXdr: signed }),
      });
      const sub = await subRes.json();
      if (!subRes.ok) throw new Error(sub.error ?? 'Could not submit trustline');

      toast.success('USDC enabled', { description: 'Your wallet now trusts the testnet USDC asset.' });
      onDone?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to enable USDC';
      if (!/user (declined|rejected)/i.test(msg)) toast.error('Enable USDC failed', { description: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button type="button" onClick={enable} disabled={loading} className="btn-ghost px-3 py-2 text-sm">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldPlus className="h-4 w-4" />}
      Enable USDC
    </button>
  );
}
