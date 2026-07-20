'use client';

import { Radio, TrendingUp, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { calcProgress, formatAmount, toStroops } from '@/server/lib/money';

interface Props {
  campaignId: string;
  asset: string;
  initialRaised: string;
  goal: string;
  donationCount: number;
}

interface OnchainState {
  raised: string;
  donors: number;
  spends: number;
}

/**
 * Live board fed straight from the CharityCampaign Soroban contract. It polls
 * `/api/campaigns/[id]/onchain`, which reads the contract's `get_campaign` view
 * via simulation — so the number on the thermometer IS the chain's number.
 */
export function CampaignLiveBoard({ campaignId, asset, initialRaised, goal, donationCount }: Props) {
  const [raised, setRaised] = useState(initialRaised);
  const [donors, setDonors] = useState(donationCount);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch(`/api/campaigns/${campaignId}/onchain`, { cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as OnchainState;
          if (active) {
            // The RPC simulation can briefly lag right after a write and read 0;
            // never let a transient 0 stomp a value we already know is positive.
            setRaised((prev) =>
              toStroops(data.raised) === 0n && toStroops(prev) > 0n ? prev : data.raised,
            );
            setDonors((prev) => (data.donors === 0 && prev > 0 ? prev : data.donors));
            setLive(true);
            setLastUpdate(new Date().toLocaleTimeString());
          }
        }
      } catch {
        /* transient — keep last value */
      }
      if (active) timer = setTimeout(poll, 6000);
    }

    poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [campaignId]);

  const progress = calcProgress(raised, goal);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Radio
          className={`h-3.5 w-3.5 ${live ? 'live-dot text-[var(--color-verify)]' : 'text-[var(--color-muted)]'}`}
        />
        <span className="text-xs font-medium text-[var(--color-muted)]">
          {live ? 'Live from the Soroban contract' : 'Reading the chain…'}
        </span>
        {lastUpdate && (
          <span className="ml-auto text-xs text-[var(--color-muted)]">Updated {lastUpdate}</span>
        )}
      </div>

      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-display text-3xl font-semibold text-[var(--color-ink)]">
          {formatAmount(raised)} <span className="text-lg text-[var(--color-muted)]">{asset}</span>
        </span>
        <span className="text-sm text-[var(--color-muted)]">
          goal {formatAmount(goal)} {asset}
        </span>
      </div>

      <div className="relative mb-2 h-7 overflow-hidden rounded-full bg-[oklch(94%_0.01_80)]">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-glow)] transition-all duration-700 ease-out"
          style={{ width: `${Math.max(progress, 2)}%` }}
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Donation progress"
        />
        {progress > 8 && (
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
            {Math.round(progress)}%
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
        <TrendingUp className="h-3.5 w-3.5" />
        <span>{donors} on-chain {donors === 1 ? 'donor' : 'donors'}</span>
        {progress >= 100 && (
          <span className="ml-auto flex items-center gap-1 font-semibold text-[var(--color-verify)]">
            <Zap className="h-3.5 w-3.5" />
            Goal reached
          </span>
        )}
      </div>
    </div>
  );
}
