import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import type { Campaign } from '@/server/db/schema';
import { calcProgress, formatAmount } from '@/server/lib/money';

const CATEGORY_LABEL: Record<string, string> = {
  'disaster-relief': 'Disaster relief',
  medical: 'Medical',
  education: 'Education',
  community: 'Community',
  environment: 'Environment',
};

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const progress = calcProgress(campaign.raisedAmount, campaign.goalAmount);
  const raised = formatAmount(campaign.raisedAmount);
  const goal = formatAmount(campaign.goalAmount);

  return (
    <Link
      href={`/campaigns/${campaign.id}`}
      className="l-card group flex flex-col p-5 transition-shadow hover:shadow-[0_18px_40px_-24px_oklch(40%_0.05_70_/_0.5)]"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="chip bg-[oklch(96%_0.03_80)] text-[var(--color-primary)]">
          {CATEGORY_LABEL[campaign.category] ?? campaign.category}
        </span>
        <ArrowUpRight className="h-4 w-4 text-[var(--color-muted)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>

      <h3 className="font-display text-lg font-semibold leading-snug text-[var(--color-ink)]">
        {campaign.name}
      </h3>
      <p className="mt-1.5 line-clamp-2 text-sm text-[var(--color-muted)]">{campaign.description}</p>

      <div className="mt-auto pt-5">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-sm font-semibold text-[var(--color-ink)]">
            {raised} <span className="text-[var(--color-muted)]">{campaign.asset}</span>
          </span>
          <span className="text-xs text-[var(--color-muted)]">
            {Math.round(progress)}% of {goal}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[oklch(94%_0.01_80)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-glow)] transition-all duration-700"
            style={{ width: `${Math.max(progress, 2)}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
