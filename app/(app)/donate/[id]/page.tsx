import { ArrowLeft, Heart } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCampaignById } from '@/server/service/campaign.service';
import { charityContractId } from '@/server/stellar/soroban';
import { DonateForm } from '@/ui/components/donate-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Donate' };

export default async function DonatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign) notFound();

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href={`/campaigns/${id}`}
        className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to campaign
      </Link>

      <div className="l-card p-7 sm:p-8">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[oklch(96%_0.03_80)]">
            <Heart className="h-7 w-7 text-[var(--color-primary)]" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-ink)]">
            {campaign.name}
          </h1>
          <p className="mt-2 text-[var(--color-muted)]">
            Your gift settles on Stellar — public, traceable, irreversible.
          </p>
        </div>

        <DonateForm
          campaignId={id}
          campaignName={campaign.name}
          asset={campaign.asset}
          contractId={charityContractId}
        />
      </div>
    </div>
  );
}
