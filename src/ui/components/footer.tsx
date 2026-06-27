import Link from 'next/link';
import { LiwanagMark } from './logo';

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-line)] bg-[var(--color-card)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2.5">
          <LiwanagMark className="h-7 w-7" />
          <div className="text-sm">
            <div className="font-display font-semibold text-[var(--color-ink)]">Liwanag</div>
            <div className="text-xs text-[var(--color-muted)]">
              Charity money, brought to light · Stellar testnet
            </div>
          </div>
        </div>
        <nav className="flex items-center gap-5 text-sm text-[var(--color-muted)]">
          <Link href="/campaigns" className="hover:text-[var(--color-ink)]">
            Campaigns
          </Link>
          <Link href="/stats" className="hover:text-[var(--color-ink)]">
            Stats
          </Link>
          <Link href="/admin" className="hover:text-[var(--color-ink)]">
            Start a campaign
          </Link>
          <a
            href="https://stellar.expert/explorer/testnet"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--color-ink)]"
          >
            Explorer
          </a>
        </nav>
      </div>
    </footer>
  );
}
