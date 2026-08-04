'use client';

import { ChevronDown, LogOut, Loader2, Wallet } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { shorten, useWallet } from '@/ui/wallet/wallet-context';

export function ConnectButton() {
  const { address, connecting, connect, disconnect } = useWallet();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!address) {
    return (
      <button
        type="button"
        onClick={() => connect()}
        disabled={connecting}
        className="btn-primary px-4 py-2 text-sm"
        data-testid="connect-button"
      >
        {connecting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wallet className="h-4 w-4" />
        )}
        {connecting ? 'Connecting…' : 'Connect wallet'}
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn-ghost px-3 py-2 text-sm"
        data-testid="wallet-chip"
      >
        <span className="h-2 w-2 rounded-full bg-[var(--color-verify)]" />
        <span className="mono">{shorten(address)}</span>
        <ChevronDown className="h-3.5 w-3.5 text-[var(--color-muted)]" />
      </button>
      {open && (
        <div className="l-card absolute right-0 z-50 mt-2 w-56 p-2 shadow-xl">
          <div className="px-2 py-1.5 text-xs text-[var(--color-muted)]">Connected wallet</div>
          <div className="mono break-all px-2 pb-2 text-xs text-[var(--color-ink)]">{address}</div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              disconnect();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-[var(--color-ink)] hover:bg-[oklch(96%_0.01_80)]"
          >
            <LogOut className="h-4 w-4" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
