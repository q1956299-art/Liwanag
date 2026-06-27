import { AdminPanel } from '@/ui/components/admin-panel';

export const metadata = { title: 'Start a campaign' };

export default function AdminPage() {
  return (
    <div>
      <div className="mx-auto mb-8 max-w-lg text-center">
        <h1 className="font-display text-3xl font-semibold text-[var(--color-ink)]">
          Start a campaign
        </h1>
        <p className="mt-2 text-[var(--color-muted)]">
          Spin up a transparent fundraiser in under a minute. No platform account — just your Stellar
          wallet.
        </p>
      </div>
      <AdminPanel />
    </div>
  );
}
