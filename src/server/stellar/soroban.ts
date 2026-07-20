import { createHash } from 'node:crypto';
import {
  Account,
  Address,
  Asset,
  BASE_FEE,
  Contract,
  Keypair,
  nativeToScVal,
  rpc,
  scValToNative,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { env } from '@/server/config/env';
import { fromStroops } from '@/server/lib/money';
import type { AssetId } from './network';
import { NETWORK_PASSPHRASE, USDC_CODE, USDC_ISSUER } from './network';

/**
 * Server-side client for the CharityCampaign Soroban contract.
 *
 * Pattern (no secret keys on the server): the server *builds + simulates* an
 * invoke transaction sourced from the signer (donor or organizer) and returns
 * the prepared XDR; the browser signs it with Freighter; the server submits the
 * signed XDR via the Soroban RPC and polls until applied. Reads go through
 * simulation — no fee, no signature.
 */

const CONTRACT_ID = env.CHARITY_CONTRACT_ID;
const PASSPHRASE = env.STELLAR_NETWORK_PASSPHRASE;

// Highest account sequence we have built an invoke against, per source account.
// Lets `buildInvoke` serialize rapid same-account builds so a stale RPC node
// can't hand back an already-consumed sequence (which would be txBadSeq).
const lastBuiltSeq = new Map<string, bigint>();

function server(): rpc.Server {
  return new rpc.Server(env.SOROBAN_RPC_URL, {
    allowHttp: env.SOROBAN_RPC_URL.startsWith('http://'),
  });
}

function contract(): Contract {
  return new Contract(CONTRACT_ID);
}

/** Stable 32-byte on-chain key for a Postgres campaign UUID. */
export function campaignIdToBytes32(campaignUuid: string): Buffer {
  return createHash('sha256').update(campaignUuid).digest();
}

/** 32-byte memo committing a payout description to the on-chain spend ledger. */
export function memoToBytes32(text: string): Buffer {
  return createHash('sha256').update(text).digest();
}

/** Resolve an asset id to its Stellar Asset Contract (SAC) address. */
export function sacForAsset(asset: AssetId): string {
  if (asset === 'USDC') {
    return new Asset(USDC_CODE, USDC_ISSUER).contractId(PASSPHRASE);
  }
  return env.XLM_SAC_CONTRACT_ID;
}

/**
 * Build + simulate + assemble an invoke tx sourced from `source`, returning
 * unsigned XDR.
 *
 * `prepareTransaction` simulates the call, so it can transiently fail right
 * after a preceding write (e.g. donating immediately after a campaign was
 * opened) when the load-balanced testnet RPC node it lands on hasn't yet seen
 * that write. We retry a few times so the second invoke isn't penalised for the
 * first one's confirmation lag.
 */
async function buildInvoke(
  source: string,
  method: string,
  args: xdr.ScVal[],
): Promise<string> {
  const srv = server();
  let lastErr: unknown;
  // ~40s of retry budget rides out the cross-node propagation lag of a preceding
  // dependent write on the load-balanced public testnet RPC.
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const account: Account = await srv.getAccount(source);
      const seq = BigInt(account.sequenceNumber());

      // Serialize builds per source account: the load-balanced RPC can hand back
      // a stale (already-consumed) sequence right after a prior tx from the same
      // account, which would make this invoke fail with txBadSeq at submit. If we
      // haven't yet seen the account advance past the last sequence we built
      // against, wait for the node to catch up before building.
      const prev = lastBuiltSeq.get(source);
      if (prev !== undefined && seq <= prev) {
        await new Promise((r) => setTimeout(r, 4000));
        continue;
      }

      const tx = new TransactionBuilder(account, {
        fee: (Number(BASE_FEE) * 100).toString(),
        networkPassphrase: PASSPHRASE,
      })
        .addOperation(contract().call(method, ...args))
        // Generous bound: the user signs in Freighter between build and submit.
        .setTimeout(300)
        .build();

      // prepareTransaction simulates, then attaches the Soroban footprint,
      // resource fees, and auth entries required to submit.
      const prepared = await srv.prepareTransaction(tx);
      lastBuiltSeq.set(source, seq);
      return prepared.toXDR();
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 4000));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Failed to prepare contract invoke');
}

/** Poll until a freshly-opened campaign is readable on-chain (rides out RPC lag). */
export async function waitForCampaignReadable(
  campaignUuid: string,
  timeoutMs = 20_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const c = await readCampaign(campaignUuid).catch(() => null);
    if (c) return true;
    await new Promise((r) => setTimeout(r, 2500));
  }
  return false;
}

/** open_campaign(organizer, campaign_id, token, goal) — organizer-signed. */
export function buildOpenCampaign(args: {
  organizer: string;
  campaignUuid: string;
  token: string;
  goal: bigint;
}): Promise<string> {
  return buildInvoke(args.organizer, 'open_campaign', [
    new Address(args.organizer).toScVal(),
    xdr.ScVal.scvBytes(campaignIdToBytes32(args.campaignUuid)),
    new Address(args.token).toScVal(),
    nativeToScVal(args.goal, { type: 'i128' }),
  ]);
}

/** donate(donor, campaign_id, amount) — donor-signed. */
export function buildDonate(args: {
  donor: string;
  campaignUuid: string;
  amount: bigint;
}): Promise<string> {
  return buildInvoke(args.donor, 'donate', [
    new Address(args.donor).toScVal(),
    xdr.ScVal.scvBytes(campaignIdToBytes32(args.campaignUuid)),
    nativeToScVal(args.amount, { type: 'i128' }),
  ]);
}

/** disburse(organizer, campaign_id, recipient, amount, memo) — organizer-signed. */
export function buildDisburse(args: {
  organizer: string;
  campaignUuid: string;
  recipient: string;
  amount: bigint;
  memoText: string;
}): Promise<string> {
  return buildInvoke(args.organizer, 'disburse', [
    new Address(args.organizer).toScVal(),
    xdr.ScVal.scvBytes(campaignIdToBytes32(args.campaignUuid)),
    new Address(args.recipient).toScVal(),
    nativeToScVal(args.amount, { type: 'i128' }),
    xdr.ScVal.scvBytes(memoToBytes32(args.memoText)),
  ]);
}

export interface SubmitResult {
  hash: string;
  returnValue: unknown;
  /** True if the network accepted the tx but it hadn't been confirmed before the poll deadline. */
  pending: boolean;
}

/**
 * Submit a Freighter-signed invoke XDR and poll until applied.
 *
 * The tx was already validated by `prepareTransaction` (simulation) when it was
 * built, so it is well-formed and funded. We throw only when the network
 * *rejects* it (`sendTransaction` ERROR) or it *fails on-chain* (`FAILED`). The
 * public testnet RPC is load-balanced, so `getTransaction` can keep returning
 * NOT_FOUND from a lagging node well after the tx has actually landed; rather
 * than fail a genuinely-accepted transaction, we return it as `pending` and let
 * the on-chain reader reconcile state on the next poll.
 */
export async function submit(signedXdr: string): Promise<SubmitResult> {
  const srv = server();
  const tx = TransactionBuilder.fromXDR(signedXdr, PASSPHRASE);
  // Record the account sequence this tx was built against (its own sequence
  // minus one) so the next build for the same account waits until the node
  // reflects it — belt-and-braces against txBadSeq, consistent with buildInvoke.
  try {
    const t = tx as unknown as { source?: string; sequence?: string };
    if (t.source && t.sequence) {
      const builtAgainst = BigInt(t.sequence) - 1n;
      const prev = lastBuiltSeq.get(t.source);
      if (prev === undefined || builtAgainst > prev) lastBuiltSeq.set(t.source, builtAgainst);
    }
  } catch {
    /* non-fatal */
  }
  const sent = await srv.sendTransaction(tx);
  if (sent.status === 'ERROR') {
    throw new Error(`Soroban submit failed: ${JSON.stringify(sent.errorResult)}`);
  }

  let got = await srv.getTransaction(sent.hash);
  const deadline = Date.now() + 45_000;
  while (got.status === 'NOT_FOUND' && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2000));
    got = await srv.getTransaction(sent.hash);
  }

  if (got.status === 'FAILED') {
    throw new Error(`Transaction ${sent.hash} failed on-chain`);
  }

  let returnValue: unknown = null;
  try {
    returnValue =
      got.status === 'SUCCESS' && got.returnValue ? scValToNative(got.returnValue) : null;
  } catch {
    /* non-fatal */
  }
  return { hash: sent.hash, returnValue, pending: got.status !== 'SUCCESS' };
}

export interface OnchainCampaign {
  goal: string;
  raised: string;
  balance: string;
  disbursed: string;
  donors: number;
  spends: number;
  status: 'Active' | 'Closed';
}

/** Read a campaign's live on-chain state via simulation (no fee, no signature). */
export async function readCampaign(campaignUuid: string): Promise<OnchainCampaign | null> {
  const srv = server();
  const account = new Account(Keypair.random().publicKey(), '0');
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(
      contract().call(
        'get_campaign',
        xdr.ScVal.scvBytes(campaignIdToBytes32(campaignUuid)),
      ),
    )
    .setTimeout(60)
    .build();

  const sim = await srv.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim) || !sim.result?.retval) {
    return null; // campaign not opened on-chain yet
  }
  const c = scValToNative(sim.result.retval) as {
    goal: bigint;
    raised: bigint;
    balance: bigint;
    disbursed: bigint;
    donors: number;
    spends: number;
    status: { tag: string } | string;
  };
  const statusTag = typeof c.status === 'string' ? c.status : c.status?.tag;
  return {
    goal: fromStroops(BigInt(c.goal)),
    raised: fromStroops(BigInt(c.raised)),
    balance: fromStroops(BigInt(c.balance)),
    disbursed: fromStroops(BigInt(c.disbursed)),
    donors: Number(c.donors),
    spends: Number(c.spends),
    status: statusTag === 'Closed' ? 'Closed' : 'Active',
  };
}

/** stellar.expert link to the contract (used in UI/README). */
export function contractExplorerUrl(): string {
  const net = env.STELLAR_NETWORK === 'public' ? 'public' : 'testnet';
  return `https://stellar.expert/explorer/${net}/contract/${CONTRACT_ID}`;
}

export const charityContractId = CONTRACT_ID;
