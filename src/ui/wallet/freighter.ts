// Thin wrapper over @stellar/freighter-api v6 that PINS the signing network
// passphrase to the app's NEXT_PUBLIC_STELLAR_NETWORK (testnet), regardless of
// the wallet's active network.
import {
  getAddress,
  isConnected,
  requestAccess,
  signTransaction,
} from '@stellar/freighter-api';

const NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'public';

export const APP_NETWORK_PASSPHRASE =
  NETWORK === 'public'
    ? 'Public Global Stellar Network ; September 2015'
    : 'Test SDF Network ; September 2015';

function unwrapAddress(res: unknown): string {
  if (typeof res === 'string') return res;
  const r = res as { address?: string; error?: string };
  if (r?.error) throw new Error(r.error);
  if (!r?.address) throw new Error('No wallet address returned');
  return r.address;
}

/** True if the Freighter extension is installed and available. */
export async function hasFreighter(): Promise<boolean> {
  try {
    const res = await isConnected();
    if (typeof res === 'boolean') return res;
    return Boolean((res as { isConnected?: boolean })?.isConnected);
  } catch {
    return false;
  }
}

/** Prompt the user to grant access; returns the public key. */
export async function connectFreighter(): Promise<string> {
  return unwrapAddress(await requestAccess());
}

/** Read the currently allowed address (no prompt). */
export async function currentAddress(): Promise<string | null> {
  try {
    return unwrapAddress(await getAddress());
  } catch {
    return null;
  }
}

/** Sign an XDR with the network passphrase pinned to the app network. */
export async function signXdr(xdr: string, address: string): Promise<string> {
  const res = await signTransaction(xdr, {
    networkPassphrase: APP_NETWORK_PASSPHRASE,
    address,
  });
  if (typeof res === 'string') return res;
  const r = res as { signedTxXdr?: string; error?: string };
  if (r?.error) throw new Error(r.error);
  if (!r?.signedTxXdr) throw new Error('Wallet did not return a signed transaction');
  return r.signedTxXdr;
}
