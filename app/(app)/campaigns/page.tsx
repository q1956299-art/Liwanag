import { Eye } from 'lucide-react';
import Link from 'next/link';
import { getAllCampaigns } from '@/server/service/campaign.service';
import { CampaignCard } from '@/ui/components/campaign-card';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Campaigns' };

export default async function CampaignsPage() {
  const campaigns = await getAllCampaigns();

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-[var(--color-ink)]">Campaigns</h1>
          <p className="mt-2 max-w-xl text-[var(--color-muted)]">
            Browsing is open to everyone. Connect a wallet only when you want to give, or to start a
            campaign of your own.
          </p>
        </div>
        <Link href="/admin" className="btn-primary shrink-0 px-5 py-2.5 text-sm">
          Start a campaign
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="l-card flex flex-col items-center gap-3 px-6 py-20 text-center">
          <Eye className="h-10 w-10 text-[var(--color-muted)]" />
          <p className="font-display text-xl text-[var(--color-ink)]">No campaigns yet</p>
          <p className="max-w-sm text-sm text-[var(--color-muted)]">
            There are no active campaigns right now. Be the first to create one — your connected
            wallet becomes the public collection account.
          </p>
          <Link href="/admin" className="btn-primary mt-2 px-5 py-2.5 text-sm">
            Start a campaign
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      )}
    </div>
  );
}
