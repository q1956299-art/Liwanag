'use client';

import { CheckCircle2, ExternalLink, Heart, Loader2, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { isValidAmount } from '@/server/lib/money';
import { EnableUsdcButton } from './enable-usdc-button';
import { shorten, useWallet } from '@/ui/wallet/wallet-context';

interface Props {
  campaignId: string;
  campaignName: string;
  asset: string;
  contractId: string;
}

const PRESETS = ['10', '25', '50', '100', '250'];
type Asset = 'XLM' | 'USDC';

export function DonateForm({ campaignId, campaignName, asset: campaignAsset, contractId }: Props) {
  const { address, connecting, connect, sign } = useWallet();
  const asset: Asset = campaignAsset === 'USDC' ? 'USDC' : 'XLM';
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ txHash: string } | null>(null);

  const amountValid = amount !== '' && isValidAmount(amount);

  async function donate(e: React.FormEvent) {
    e.preventDefault();
    if (!amountValid) {
      toast.error('Enter a valid amount greater than 0');
      return;
    }
    setLoading(true);
    try {
      const donor = address ?? (await connect());
      if (!donor) return;

      const buildRes = await fetch('/api/donations/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, amount, donorAddress: donor }),
      });
      const build = await buildRes.json();
      if (!buildRes.ok) throw new Error(build.error ?? 'Could not prepare donation');

      const signed = await sign(build.xdr);

      const subRes = await fetch('/api/donations/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, signedXdr: signed, donorAddress: donor, amount, message }),
      });
      const sub = await subRes.json();
      if (!subRes.ok) throw new Error(sub.error ?? 'Donation failed on-chain');

      setResult({ txHash: sub.txHash });
      toast.success('Thank you! Your donation is on-chain.', {
        description: `${amount} ${asset} sent to ${campaignName}.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      if (!/user (declined|rejected)/i.test(msg)) toast.error('Donation failed', { description: msg });
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-verify-soft)]">
          <CheckCircle2 className="h-7 w-7 text-[var(--color-verify)]" />
        </div>
        <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)]">Donation confirmed</h2>
        <p className="mt-2 text-[var(--color-muted)]">
          {amount} {asset} is now part of this campaign’s public ledger.
        </p>
        <a
          href={`https://stellar.expert/explorer/mainnet/tx/${result.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mono mt-4 inline-flex items-center gap-1.5 break-all rounded-lg bg-[oklch(96%_0.01_80)] px-3 py-2 text-xs text-[var(--color-primary)] hover:underline"
        >
          {shorten(result.txHash)}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <div className="mt-6 flex flex-col gap-2">
          <Link href={`/campaigns/${campaignId}`} className="btn-primary px-5 py-3 text-base">
            View campaign
          </Link>
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setAmount('');
              setMessage('');
            }}
            className="btn-ghost px-5 py-3 text-base"
          >
            Give again
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={donate} className="space-y-6">
      {/* Campaign asset — fixed at creation (XLM default, no trustline) */}
      <div>
        <div className="mb-2 text-sm font-medium text-[var(--color-ink)]">Asset</div>
        <div className="flex items-center justify-between rounded-xl border border-[var(--color-primary)] bg-[oklch(96%_0.03_80)] px-4 py-3 text-sm font-semibold text-[var(--color-primary)]">
          <span>{asset}</span>
          <span className="text-xs font-normal text-[var(--color-muted)]">
            {asset === 'XLM' ? 'native · no trustline' : 'campaign denominated in USDC'}
          </span>
        </div>
        {asset === 'USDC' && (
          <div className="mt-2 flex items-center justify-between rounded-xl bg-[oklch(96%_0.01_80)] px-3 py-2 text-xs text-[var(--color-muted)]">
            <span>USDC needs a trustline on your wallet.</span>
            <EnableUsdcButton />
          </div>
        )}
      </div>

      {/* Amount */}
      <div>
        <div className="mb-2 text-sm font-medium text-[var(--color-ink)]">Amount ({asset})</div>
        <div className="mb-3 grid grid-cols-5 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(p)}
              className={`rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                amount === p
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[oklch(96%_0.01_80)] text-[var(--color-ink)] hover:bg-[oklch(93%_0.01_80)]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <input
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Custom amount"
          min="0"
          step="0.0000001"
          className="field"
        />
        {amount !== '' && !amountValid && (
          <p className="mt-1.5 text-xs text-red-600">Enter a positive number (up to 7 decimals).</p>
        )}
      </div>

      {/* Optional message */}
      <div>
        <label htmlFor="msg" className="mb-2 block text-sm font-medium text-[var(--color-ink)]">
          Message <span className="font-normal text-[var(--color-muted)]">(optional)</span>
        </label>
        <input
          id="msg"
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={140}
          placeholder="Wishing you strength"
          className="field"
        />
      </div>

      {/* Destination — the on-chain CharityCampaign contract holds the funds */}
      <div className="rounded-xl bg-[oklch(96%_0.01_80)] p-4 text-sm">
        <div className="mb-1 font-medium text-[var(--color-ink)]">
          Escrowed by the Liwanag campaign contract
        </div>
        <div className="mono break-all text-xs text-[var(--color-muted)]">{contractId}</div>
        <p className="mt-1.5 text-xs text-[var(--color-muted)]">
          Your gift is held on-chain until the organizer disburses it — every payout is public.
        </p>
      </div>

      <button type="submit" disabled={loading || connecting} className="btn-primary w-full px-6 py-4 text-base">
        {loading || connecting ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : address ? (
          <Heart className="h-5 w-5" />
        ) : (
          <Wallet className="h-5 w-5" />
        )}
        {loading
          ? 'Confirming on-chain…'
          : address
            ? `Donate ${amount ? `${amount} ${asset}` : ''}`.trim()
            : 'Connect wallet to donate'}
      </button>
      <p className="text-center text-xs text-[var(--color-muted)]">
        You’ll review and sign the payment in Freighter. Network is pinned to Stellar mainnet.
      </p>
    </form>
  );
}
