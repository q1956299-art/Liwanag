function getEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing env var: ${key}`);
  return value;
}

export const env = {
  DRIZZLE_DATABASE_URL: getEnv('DRIZZLE_DATABASE_URL'),
  SESSION_SECRET: getEnv('SESSION_SECRET', 'dev-secret-key-change-in-production-32chars'),
  STELLAR_SIGNING_SECRET: process.env.STELLAR_SIGNING_SECRET ?? '',
  STELLAR_NETWORK: getEnv('STELLAR_NETWORK', 'testnet'),
  STELLAR_HORIZON_URL: getEnv('STELLAR_HORIZON_URL', 'https://horizon-testnet.stellar.org'),
  STELLAR_NETWORK_PASSPHRASE: getEnv(
    'STELLAR_NETWORK_PASSPHRASE',
    'Test SDF Network ; September 2015',
  ),
  SOROBAN_RPC_URL: getEnv('SOROBAN_RPC_URL', 'https://soroban-testnet.stellar.org'),
  // CharityCampaign Soroban contract — custodies donations & holds the on-chain spend ledger.
  CHARITY_CONTRACT_ID: getEnv(
    'CHARITY_CONTRACT_ID',
    'CC5KFZ6KLISPHYCA47SVKJNF52KKMLHQ2JGADTSOGNNX4W345G7WJ6CA',
  ),
  // Native XLM Stellar Asset Contract (SAC) — default campaign token, no trustline.
  XLM_SAC_CONTRACT_ID: getEnv(
    'XLM_SAC_CONTRACT_ID',
    'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
  ),
  // Comma-separated wallet addresses excluded from public stats counts.
  DEMO_ADDRESSES: (process.env.DEMO_ADDRESSES ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
};

export const publicEnv = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001',
  NEXT_PUBLIC_STELLAR_NETWORK: process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet',
  NEXT_PUBLIC_USDC_ISSUER:
    process.env.NEXT_PUBLIC_USDC_ISSUER ??
    'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
  NEXT_PUBLIC_CHARITY_CONTRACT_ID:
    process.env.NEXT_PUBLIC_CHARITY_CONTRACT_ID ??
    'CC5KFZ6KLISPHYCA47SVKJNF52KKMLHQ2JGADTSOGNNX4W345G7WJ6CA',
};
