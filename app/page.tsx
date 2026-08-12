import { ArrowRight, Coins, Eye, Receipt, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { CampaignCard } from '@/ui/components/campaign-card';
import { getAllCampaigns } from '@/server/service/campaign.service';
import { getPublicStats } from '@/server/service/stats.service';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [campaigns, stats] = await Promise.all([getAllCampaigns(), getPublicStats()]);
  const featured = campaigns.slice(0, 3);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
          <span className="chip mb-5 inline-flex bg-[var(--color-verify-soft)] text-[var(--color-verify)]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Every figure is an on-chain transaction
          </span>
          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-[var(--color-ink)] sm:text-6xl sm:leading-[1.02]">
            Charity money,
            <br />
            brought to the light.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--color-muted)]">
            Liwanag is a public ledger for fundraising. Donations are escrowed on-chain in a Soroban
            contract, and every payout is a contract disbursement anyone can verify. No screenshots,
            no trust us — just receipts.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/campaigns" className="btn-primary px-6 py-3 text-base">
              Browse campaigns
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/admin" className="btn-ghost px-6 py-3 text-base">
              Start a campaign
            </Link>
          </div>

          {/* Live stat strip */}
          <dl className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-4">
            <Stat label="Campaigns" value={stats.campaigns} />
            <Stat label="Donations" value={stats.donations} />
            <Stat label="On-chain payouts" value={stats.payouts} />
            <Stat label="Donor wallets" value={stats.uniqueWallets} />
          </dl>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)]">
          Transparency by construction
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Step
            icon={<Coins className="h-5 w-5" />}
            title="Give in XLM or USDC"
            body="Connect Freighter and donate. The default is XLM — no trustline needed — or switch to USDC with one tap."
          />
          <Step
            icon={<Eye className="h-5 w-5" />}
            title="Watch it land live"
            body="A live thermometer reads the campaign's balance straight from the Soroban contract. The total you see is the chain's total."
          />
          <Step
            icon={<Receipt className="h-5 w-5" />}
            title="Follow every payout"
            body="Organizers disburse from the contract on-chain. Each payout appends to an immutable spend ledger with a verifiable tx hash."
          />
        </div>
      </section>

      {/* Featured campaigns */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)]">
            {featured.length ? 'Active campaigns' : 'Be the first'}
          </h2>
          {featured.length > 0 && (
            <Link
              href="/campaigns"
              className="text-sm font-medium text-[var(--color-primary)] hover:underline"
            >
              View all
            </Link>
          )}
        </div>
        {featured.length === 0 ? (
          <div className="l-card flex flex-col items-center gap-3 px-6 py-16 text-center">
            <Eye className="h-9 w-9 text-[var(--color-muted)]" />
            <p className="font-display text-lg text-[var(--color-ink)]">No campaigns yet</p>
            <p className="max-w-sm text-sm text-[var(--color-muted)]">
              Start the first transparent campaign — connect your wallet and open it on-chain in the
              Liwanag contract.
            </p>
            <Link href="/admin" className="btn-primary mt-2 px-5 py-2.5 text-sm">
              Start a campaign
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((c) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[var(--color-card)] px-5 py-5">
      <dd className="font-display text-3xl font-semibold text-[var(--color-ink)]">{value}</dd>
      <dt className="mt-1 text-xs uppercase tracking-wide text-[var(--color-muted)]">{label}</dt>
    </div>
  );
}

function Step({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="l-card p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[oklch(96%_0.03_80)] text-[var(--color-primary)]">
        {icon}
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-[var(--color-ink)]">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted)]">{body}</p>
    </div>
  );
}
