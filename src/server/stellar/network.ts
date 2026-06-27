import { Asset, Horizon } from '@stellar/stellar-sdk';
import { env } from '@/server/config/env';
import { publicEnv } from '@/server/config/env';

export const HORIZON_URL = env.STELLAR_HORIZON_URL;
export const NETWORK_PASSPHRASE = env.STELLAR_NETWORK_PASSPHRASE;
export const USDC_ISSUER = publicEnv.NEXT_PUBLIC_USDC_ISSUER;
export const USDC_CODE = 'USDC';

export const server = new Horizon.Server(HORIZON_URL);

export type AssetId = 'XLM' | 'USDC';

/** Resolve an asset id to a Stellar SDK Asset (XLM = native, no trustline). */
export function resolveAsset(assetId: AssetId): Asset {
  if (assetId === 'USDC') return new Asset(USDC_CODE, USDC_ISSUER);
  return Asset.native();
}

export function isValidAsset(value: unknown): value is AssetId {
  return value === 'XLM' || value === 'USDC';
}

/** Stroop-based fee/balance helpers handled by money.ts; this keeps explorer links. */
export function txExplorerUrl(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

export function accountExplorerUrl(account: string): string {
  return `https://stellar.expert/explorer/testnet/account/${account}`;
}
