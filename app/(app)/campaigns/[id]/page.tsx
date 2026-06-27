import { ArrowLeft, ArrowUpRight, CheckCircle2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatAmount } from '@/server/lib/money';
import { getCampaignById } from '@/server/service/campaign.service';
import { getDonationsByCampaign } from '@/server/service/donation.service';
import { getSpendsByCampaign } from '@/server/service/spend.service';
import { txExplorerUrl } from '@/server/stellar/network';
import { charityContractId, contractExplorerUrl } from '@/server/stellar/soroban';
import { CampaignLiveBoard } from '@/ui/components/campaign-live-board';
import { OwnerPayoutPanel } from '@/ui/components/owner-payout-panel';
import { shorten } from '@/ui/lib/format';

export const dynamic = 'force-dynamic';

const CATEGORY_LABEL: Record<string, string> = {
  'disaster-relief': 'Disaster relief',
  medical: 'Medical',
  education: 'Education',
  community: 'Community',
  environment: 'Environment',
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await getCampaignById(id);
  return { title: campaign?.name ?? 'Campaign' };
}

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign) notFound();

  const [donations, spends] = await Promise.all([
    getDonationsByCampaign(id),
    getSpendsByCampaign(id),
  ]);

  return (
    <div>
      <Link
        href="/campaigns"
        className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]"
      >
        <ArrowLeft className="h-4 w-4" />
        All campaigns
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <div className="l-card p-6">
            <span className="chip mb-4 inline-flex bg-[oklch(96%_0.03_80)] text-[var(--color-primary)]">
              {CATEGORY_LABEL[campaign.category] ?? campaign.category}
            </span>
            <h1 className="font-display text-3xl font-semibold leading-tight text-[var(--color-ink)]">
              {campaign.name}
            </h1>
            <p className="mt-3 whitespace-pre-line text-[var(--color-muted)]">{campaign.description}</p>

            <div className="my-6 h-px bg-[var(--color-line)]" />

            <CampaignLiveBoard
              campaignId={campaign.id}
              asset={campaign.asset}
              initialRaised={campaign.raisedAmount}
              goal={campaign.goalAmount}
              donationCount={donations.length}
            />
          </div>

          {/* Spend ledger */}
          <div className="l-card p-6">
            <h2 className="font-display text-lg font-semibold text-[var(--color-ink)]">
              Spend ledger
            </h2>
            <p className="mb-4 text-sm text-[var(--color-muted)]">
              Every payout is a signed contract disbursement, appended to an immutable on-chain
              ledger and verifiable on Stellar Expert.
            </p>
            {spends.length === 0 ? (
              <p className="rounded-xl bg-[oklch(96%_0.01_80)] px-4 py-6 text-center text-sm text-[var(--color-muted)]">
                No payouts recorded yet. When the organizer disburses funds, each transaction appears
                here.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-line)]">
                {spends.map((s) => (
                  <li key={s.id} className="flex items-start gap-3 py-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-verify)]" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-[var(--color-ink)]">{s.description}</div>
                      <div className="mt-0.5 text-xs text-[var(--color-muted)]">
                        to <span className="mono">{shorten(s.recipient)}</span> ·{' '}
                        {new Date(s.createdAt).toLocaleDateString()}
                      </div>
                      <a
                        href={txExplorerUrl(s.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mono mt-1 inline-flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline"
                      >
                        {shorten(s.txHash)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="whitespace-nowrap font-semibold text-[var(--color-ink)]">
                      −{formatAmount(s.amount)} {s.asset}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <Link href={`/donate/${id}`} className="btn-primary w-full px-6 py-4 text-lg">
            Donate now
          </Link>

          <OwnerPayoutPanel
            campaignId={id}
            ownerAddress={campaign.ownerAddress}
            defaultAsset={campaign.asset}
          />

          <div className="l-card p-5">
            <h3 className="mb-2 text-sm font-semibold text-[var(--color-ink)]">Custody contract</h3>
            <p className="mb-2 text-xs text-[var(--color-muted)]">
              Donations are escrowed on-chain by this Soroban contract until the organizer disburses
              them.
            </p>
            <div className="mono break-all text-xs text-[var(--color-muted)]">{charityContractId}</div>
            <a
              href={contractExplorerUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline"
            >
              View contract on Stellar Expert
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="l-card p-5">
            <h3 className="mb-4 text-sm font-semibold text-[var(--color-ink)]">Recent donors</h3>
            {donations.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">
                No donations yet — be the first to give.
              </p>
            ) : (
              <ul className="space-y-3">
                {donations.slice(0, 8).map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2">
                    <a
                      href={txExplorerUrl(d.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0"
                    >
                      <div className="mono truncate text-sm font-medium text-[var(--color-ink)] hover:text-[var(--color-primary)]">
                        {shorten(d.donorAddress)}
                      </div>
                      <div className="truncate text-xs text-[var(--color-muted)]">
                        {d.message ? d.message : new Date(d.createdAt).toLocaleDateString()}
                      </div>
                    </a>
                    <div className="whitespace-nowrap text-sm font-semibold text-[var(--color-primary)]">
                      {formatAmount(d.amount)} {d.asset}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
