'use client';

import { Loader2, Receipt } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { isValidAmount } from '@/server/lib/money';
import { useWallet } from '@/ui/wallet/wallet-context';

interface Props {
  campaignId: string;
  ownerAddress: string;
  defaultAsset: string;
}

type Asset = 'XLM' | 'USDC';

/** Visible only to the campaign owner. Records a real on-chain payout. */
export function OwnerPayoutPanel({ campaignId, ownerAddress, defaultAsset }: Props) {
  const { address, sign } = useWallet();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const asset: Asset = defaultAsset === 'USDC' ? 'USDC' : 'XLM';
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  if (!address || address !== ownerAddress) return null;

  async function payout(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidAmount(amount)) {
      toast.error('Enter a valid amount');
      return;
    }
    if (!recipient.trim() || !description.trim()) {
      toast.error('Recipient and description are required');
      return;
    }
    setLoading(true);
    try {
      const buildRes = await fetch('/api/spend/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          amount,
          recipient: recipient.trim(),
          description: description.trim(),
        }),
      });
      const build = await buildRes.json();
      if (!buildRes.ok) throw new Error(build.error ?? 'Could not prepare payout');

      const signed = await sign(build.xdr);

      const subRes = await fetch('/api/spend/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          signedXdr: signed,
          description: description.trim(),
          recipient: recipient.trim(),
          amount,
        }),
      });
      const sub = await subRes.json();
      if (!subRes.ok) throw new Error(sub.error ?? 'Payout failed on-chain');

      toast.success('Payout recorded on-chain', { description: `${amount} ${asset} disbursed.` });
      setRecipient('');
      setAmount('');
      setDescription('');
      setOpen(false);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Payout failed';
      if (!/user (declined|rejected)/i.test(msg)) toast.error('Payout failed', { description: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="l-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-semibold text-[var(--color-ink)]">Owner tools</h3>
          <p className="text-xs text-[var(--color-muted)]">Record a transparent, on-chain payout.</p>
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} className="btn-ghost px-3 py-2 text-sm">
          <Receipt className="h-4 w-4" />
          {open ? 'Close' : 'Record payout'}
        </button>
      </div>

      {open && (
        <form onSubmit={payout} className="mt-4 space-y-3">
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Recipient address (G…)"
            className="field mono text-xs"
            required
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was this payout for?"
            maxLength={200}
            className="field"
            required
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              min="0"
              step="0.0000001"
              className="field"
              required
            />
            <div className="field flex w-28 items-center justify-center font-semibold text-[var(--color-muted)]">
              {asset}
            </div>
          </div>
          <p className="text-xs text-[var(--color-muted)]">
            Paid from the campaign’s on-chain balance and appended to the public spend ledger.
          </p>
          <button type="submit" disabled={loading} className="btn-primary w-full px-5 py-3 text-sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
            Sign &amp; record payout
          </button>
        </form>
      )}
    </div>
  );
}
