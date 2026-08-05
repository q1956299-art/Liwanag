import {
  Asset,
  BASE_FEE,
  Operation,
  Transaction,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import {
  type AssetId,
  NETWORK_PASSPHRASE,
  resolveAsset,
  server,
  USDC_CODE,
  USDC_ISSUER,
} from './network';

/** Build an UNSIGNED payment transaction XDR (network pinned to app testnet). */
export async function buildPaymentXdr(params: {
  source: string;
  destination: string;
  asset: AssetId;
  amount: string;
  memo?: string;
}): Promise<string> {
  const account = await server.loadAccount(params.source);
  const builder = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  }).addOperation(
    Operation.payment({
      destination: params.destination,
      asset: resolveAsset(params.asset),
      amount: params.amount,
    }),
  );
  const tx = builder.setTimeout(180).build();
  return tx.toXDR();
}

/** Build an UNSIGNED changeTrust (Enable USDC) transaction XDR. */
export async function buildEnableUsdcXdr(account: string): Promise<string> {
  const acct = await server.loadAccount(account);
  const tx = new TransactionBuilder(acct, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.changeTrust({
        asset: new Asset(USDC_CODE, USDC_ISSUER),
      }),
    )
    .setTimeout(180)
    .build();
  return tx.toXDR();
}

export interface SubmittedPayment {
  hash: string;
  source: string;
  destination: string;
  asset: AssetId;
  amount: string;
}

/**
 * Submit a client-signed XDR to Horizon and extract the (first) payment op.
 * The network passphrase is pinned to the app's testnet, NOT the wallet's.
 */
export async function submitPaymentXdr(signedXdr: string): Promise<SubmittedPayment> {
  const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE) as Transaction;
  const res = await server.submitTransaction(tx);

  // Parse the payment op from the validated transaction.
  const op = tx.operations.find((o) => o.type === 'payment') as
    | Operation.Payment
    | undefined;
  if (!op) throw new Error('No payment operation in transaction');

  const opAsset = op.asset as Asset;
  const asset: AssetId = opAsset.isNative() ? 'XLM' : 'USDC';

  return {
    hash: res.hash,
    source: op.source ?? tx.source,
    destination: op.destination,
    asset,
    amount: op.amount,
  };
}

/** Submit any signed XDR (e.g. changeTrust) and return the tx hash. */
export async function submitSignedXdr(signedXdr: string): Promise<string> {
  const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const res = await server.submitTransaction(tx);
  return res.hash;
}

/** Map a Horizon submit error into a friendly message + result codes. */
export function describeStellarError(err: unknown): string {
  const e = err as {
    response?: { data?: { extras?: { result_codes?: { operations?: string[]; transaction?: string } } } };
    message?: string;
  };
  const codes = e?.response?.data?.extras?.result_codes;
  if (codes?.operations?.includes('op_no_trust')) {
    return 'The receiving wallet has no USDC trustline. Use XLM, or ask the recipient to Enable USDC.';
  }
  if (codes?.operations?.includes('op_underfunded')) {
    return 'Insufficient balance for this amount (remember the XLM reserve).';
  }
  if (codes?.transaction === 'tx_bad_seq') {
    return 'Wallet sequence out of date. Please retry.';
  }
  if (codes?.operations?.length) {
    return `Transaction failed: ${codes.operations.join(', ')}`;
  }
  return e?.message ?? 'Transaction failed on the Stellar network.';
}
