'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from './connect-button';
import { LiwanagMark } from './logo';

const links = [
  { href: '/campaigns', label: 'Campaigns' },
  { href: '/stats', label: 'Stats' },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-[oklch(98.4%_0.007_85_/_0.85)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <LiwanagMark className="h-8 w-8" />
          <div className="leading-none">
            <div className="font-display text-lg font-semibold text-[var(--color-ink)]">Liwanag</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
              On-chain transparency
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'text-[var(--color-ink)]'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/admin" className="btn-ghost hidden px-3 py-2 text-sm sm:inline-flex">
            Start a campaign
          </Link>
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
