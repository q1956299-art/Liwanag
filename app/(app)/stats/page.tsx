import { Coins, HeartHandshake, Receipt, Users, Wallet } from 'lucide-react';
import Link from 'next/link';
import { formatAmount } from '@/server/lib/money';
import { getPublicStats } from '@/server/service/stats.service';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Stats' };

export default async function StatsPage() {
  const stats = await getPublicStats();

  const cards = [
    { label: 'Donor wallets', value: stats.uniqueWallets, icon: Users, hint: 'Unique wallets that authenticated via SEP-10' },
    { label: 'Wallet sessions', value: stats.logins, icon: Wallet, hint: 'Total verified connect events' },
    { label: 'Campaigns', value: stats.campaigns, icon: HeartHandshake, hint: 'Fundraisers created on Liwanag' },
    { label: 'Donations', value: stats.donations, icon: Coins, hint: 'On-chain gifts recorded' },
    { label: 'On-chain payouts', value: stats.payouts, icon: Receipt, hint: 'Disbursements signed from campaign wallets' },
  ];

  return (
    <div>
      <div className="mb-8 max-w-xl">
        <h1 className="font-display text-3xl font-semibold text-[var(--color-ink)]">
          Liwanag in numbers
        </h1>
        <p className="mt-2 text-[var(--color-muted)]">
          Real interaction counts from the live database. Nothing is seeded — every figure reflects
          an actual wallet session or an on-chain transaction. Any configured demo keys are excluded.
        </p>
      </div>

      <div className="mb-6 l-card flex flex-col gap-1 bg-[var(--color-ink)] p-7 text-[var(--color-paper)] sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-[oklch(80%_0.03_80)]">
            Total raised (XLM donations)
          </div>
          <div className="font-display text-5xl font-semibold text-[var(--color-glow)]">
            {formatAmount(stats.totalRaisedXlm)} <span className="text-2xl">XLM</span>
          </div>
        </div>
        <p className="max-w-xs text-sm text-[oklch(82%_0.02_80)]">
          Summed from verified XLM payments into campaign wallets.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="l-card p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[oklch(96%_0.03_80)] text-[var(--color-primary)]">
              <c.icon className="h-5 w-5" />
            </div>
            <div className="mt-4 font-display text-4xl font-semibold text-[var(--color-ink)]">
              {c.value}
            </div>
            <div className="mt-1 text-sm font-medium text-[var(--color-ink)]">{c.label}</div>
            <p className="mt-1 text-xs text-[var(--color-muted)]">{c.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3 text-sm">
        <Link href="/campaigns" className="btn-primary px-5 py-2.5">
          Browse campaigns
        </Link>
        <Link href="/admin" className="btn-ghost px-5 py-2.5">
          Start a campaign
        </Link>
      </div>
    </div>
  );
}
