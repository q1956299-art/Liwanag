'use client';

import { ArrowRight, Loader2, Plus, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { isValidAmount } from '@/server/lib/money';
import { shorten, useWallet } from '@/ui/wallet/wallet-context';

const CATEGORIES = [
  { value: 'disaster-relief', label: 'Disaster relief' },
  { value: 'medical', label: 'Medical' },
  { value: 'education', label: 'Education' },
  { value: 'community', label: 'Community' },
  { value: 'environment', label: 'Environment' },
];

type Asset = 'XLM' | 'USDC';

export function AdminPanel() {
  const { address, connecting, connect, sign } = useWallet();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('disaster-relief');
  const [goalAmount, setGoalAmount] = useState('');
  const [asset, setAsset] = useState<Asset>('XLM');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'creating' | 'opening'>('idle');
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null);

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !description.trim()) {
      toast.error('Name and description are required');
      return;
    }
    if (!isValidAmount(goalAmount)) {
      toast.error('Goal must be a positive number');
      return;
    }
    setLoading(true);
    setPhase('creating');
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          category,
          goalAmount,
          asset,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not create campaign');

      // Open the campaign on-chain: organizer signs the open_campaign invoke.
      setPhase('opening');
      const buildRes = await fetch(`/api/campaigns/${data.id}/open/build`, { method: 'POST' });
      const build = await buildRes.json();
      if (!buildRes.ok) throw new Error(build.error ?? 'Could not prepare the on-chain campaign');

      const signed = await sign(build.xdr);

      const openRes = await fetch(`/api/campaigns/${data.id}/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedXdr: signed }),
      });
      const open = await openRes.json();
      if (!openRes.ok) throw new Error(open.error ?? 'On-chain campaign open failed');

      toast.success('Campaign is live on-chain');
      setCreated({ id: data.id, name: data.name });
    } catch (err) {
      const msg = err instanceof Error ? err.message : undefined;
      if (!/user (declined|rejected)/i.test(msg ?? '')) {
        toast.error('Failed to create campaign', { description: msg });
      }
    } finally {
      setLoading(false);
      setPhase('idle');
    }
  }

  if (created) {
    return (
      <div className="l-card mx-auto max-w-lg p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-verify-soft)]">
          <Plus className="h-7 w-7 text-[var(--color-verify)]" />
        </div>
        <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)]">
          {created.name} is live
        </h2>
        <p className="mt-2 text-[var(--color-muted)]">
          Share the campaign page so people can donate. Donations are escrowed on-chain in the
          Liwanag contract, and you disburse them — each payout is appended to the public spend
          ledger.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link href={`/campaigns/${created.id}`} className="btn-primary px-5 py-3 text-base">
            Open campaign
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => {
              setCreated(null);
              setName('');
              setDescription('');
              setGoalAmount('');
            }}
            className="btn-ghost px-5 py-3 text-base"
          >
            Create another
          </button>
        </div>
      </div>
    );
  }

  if (!address) {
    return (
      <div className="l-card mx-auto max-w-lg p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[oklch(96%_0.03_80)]">
          <Wallet className="h-7 w-7 text-[var(--color-primary)]" />
        </div>
        <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)]">
          Connect to start a campaign
        </h2>
        <p className="mt-2 text-[var(--color-muted)]">
          Your wallet is the campaign organizer — donations are escrowed on-chain in the Liwanag
          contract, and only you can sign disbursals.
        </p>
        <button
          type="button"
          onClick={() => connect()}
          disabled={connecting}
          className="btn-primary mx-auto mt-6 px-6 py-3 text-base"
        >
          {connecting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wallet className="h-5 w-5" />}
          Connect wallet
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="l-card mb-4 flex items-center gap-3 p-4 text-sm">
        <span className="h-2 w-2 rounded-full bg-[var(--color-verify)]" />
        <span className="text-[var(--color-muted)]">Organizer wallet</span>
        <span className="mono ml-auto text-[var(--color-ink)]">{shorten(address)}</span>
      </div>

      <form onSubmit={createCampaign} className="l-card space-y-4 p-6">
        <div>
          <label htmlFor="c-name" className="mb-1.5 block text-sm font-medium text-[var(--color-ink)]">
            Campaign name
          </label>
          <input
            id="c-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            placeholder="Clean water for flood-hit villages"
            className="field"
            required
          />
        </div>
        <div>
          <label htmlFor="c-desc" className="mb-1.5 block text-sm font-medium text-[var(--color-ink)]">
            Description
          </label>
          <textarea
            id="c-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="What are you raising for, and how will the funds be used?"
            className="field resize-none"
            required
          />
        </div>
        <div>
          <label htmlFor="c-cat" className="mb-1.5 block text-sm font-medium text-[var(--color-ink)]">
            Category
          </label>
          <select
            id="c-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="field"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="c-goal" className="mb-1.5 block text-sm font-medium text-[var(--color-ink)]">
              Goal
            </label>
            <input
              id="c-goal"
              type="number"
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
              min="0"
              step="0.0000001"
              placeholder="5000"
              className="field"
              required
            />
          </div>
          <div className="w-32">
            <div className="mb-1.5 text-sm font-medium text-[var(--color-ink)]">Asset</div>
            <select value={asset} onChange={(e) => setAsset(e.target.value as Asset)} className="field">
              <option value="XLM">XLM</option>
              <option value="USDC">USDC</option>
            </select>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full px-6 py-3.5 text-base">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
          {phase === 'opening'
            ? 'Opening on-chain…'
            : phase === 'creating'
              ? 'Creating…'
              : 'Create campaign'}
        </button>
        <p className="text-center text-xs text-[var(--color-muted)]">
          You’ll sign one transaction in Freighter to register the campaign on Stellar.
        </p>
      </form>
    </div>
  );
}
