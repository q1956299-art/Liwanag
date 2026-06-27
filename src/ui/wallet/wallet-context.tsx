'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { shorten } from '@/ui/lib/format';
import { connectFreighter, hasFreighter, signXdr } from './freighter';

export { shorten };

interface WalletState {
  address: string | null;
  connecting: boolean;
  ready: boolean;
  connect: () => Promise<string | null>;
  disconnect: () => Promise<void>;
  sign: (xdr: string) => Promise<string>;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [ready, setReady] = useState(false);

  // Restore session on load via /api/auth/me.
  useEffect(() => {
    let active = true;
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (active && d?.wallet) setAddress(d.wallet);
      })
      .catch(() => {})
      .finally(() => active && setReady(true));
    return () => {
      active = false;
    };
  }, []);

  const connect = useCallback(async (): Promise<string | null> => {
    if (connecting) return null;
    setConnecting(true);
    try {
      if (!(await hasFreighter())) {
        toast.error('Freighter wallet not found', {
          description: 'Install the Freighter extension to connect.',
        });
        return null;
      }
      const pubKey = await connectFreighter();

      // SEP-10: challenge -> sign (network pinned to app) -> verify.
      const chRes = await fetch('/api/auth/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: pubKey }),
      });
      const chData = await chRes.json();
      if (!chRes.ok) throw new Error(chData.error ?? 'Challenge failed');

      const signed = await signXdr(chData.xdr, pubKey);

      const vRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: pubKey, signedXdr: signed }),
      });
      const vData = await vRes.json();
      if (!vRes.ok) throw new Error(vData.error ?? 'Verification failed');

      setAddress(vData.wallet);
      toast.success('Wallet connected', { description: shorten(vData.wallet) });
      return vData.wallet;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to connect';
      if (!/user (declined|rejected)/i.test(msg)) {
        toast.error('Connection failed', { description: msg });
      }
      return null;
    } finally {
      setConnecting(false);
    }
  }, [connecting]);

  const disconnect = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setAddress(null);
    toast.success('Wallet disconnected');
  }, []);

  const sign = useCallback(
    async (xdr: string) => {
      if (!address) throw new Error('Connect your wallet first');
      return signXdr(xdr, address);
    },
    [address],
  );

  return (
    <WalletContext.Provider value={{ address, connecting, ready, connect, disconnect, sign }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
