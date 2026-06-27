import { randomBytes } from 'node:crypto';
import {
  Account,
  BASE_FEE,
  Keypair,
  Operation,
  StrKey,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { env } from '@/server/config/env';
import { NETWORK_PASSPHRASE } from './network';

const HOME_DOMAIN = 'liwanag.app';
const AUTH_KEY = `${HOME_DOMAIN} auth`;

function serverKeypair(): Keypair {
  if (!env.STELLAR_SIGNING_SECRET) {
    throw new Error('STELLAR_SIGNING_SECRET is not configured');
  }
  return Keypair.fromSecret(env.STELLAR_SIGNING_SECRET);
}

/**
 * Build a SEP-10 style challenge transaction (sequence 0, signed by the server),
 * pinned to the app's network passphrase. The client signs it to prove key ownership.
 */
export function buildChallenge(clientPublicKey: string): string {
  if (!StrKey.isValidEd25519PublicKey(clientPublicKey)) {
    throw new Error('Invalid Stellar public key');
  }
  const serverKp = serverKeypair();
  // sequence '-1' so the built transaction has sequence 0 (required by SEP-10).
  const serverAccount = new Account(serverKp.publicKey(), '-1');
  const nonce = randomBytes(48).toString('base64');

  const tx = new TransactionBuilder(serverAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.manageData({
        name: AUTH_KEY,
        value: nonce,
        source: clientPublicKey,
      }),
    )
    .setTimeout(300)
    .build();

  tx.sign(serverKp);
  return tx.toXDR();
}

/**
 * Verify a client-signed challenge. Returns the authenticated public key.
 * Throws if structure, timebounds, or signatures are invalid.
 */
export function verifyChallenge(signedXdr: string, claimedPublicKey: string): string {
  const serverKp = serverKeypair();
  const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE) as ReturnType<
    typeof TransactionBuilder.fromXDR
  > & {
    source: string;
    sequence: string;
    operations: Array<{ type: string; source?: string; name?: string }>;
    timeBounds?: { minTime: string; maxTime: string };
    signatures: Array<{ signature: () => Buffer }>;
    hash: () => Buffer;
  };

  if (tx.source !== serverKp.publicKey()) {
    throw new Error('Challenge has wrong server account');
  }
  if (tx.sequence !== '0') {
    throw new Error('Challenge sequence must be 0');
  }

  const now = Math.floor(Date.now() / 1000);
  if (tx.timeBounds) {
    if (now < Number(tx.timeBounds.minTime) || now > Number(tx.timeBounds.maxTime)) {
      throw new Error('Challenge has expired');
    }
  }

  const op = tx.operations[0];
  if (!op || op.type !== 'manageData' || op.name !== AUTH_KEY) {
    throw new Error('Challenge missing auth operation');
  }
  if (op.source !== claimedPublicKey) {
    throw new Error('Challenge operation source mismatch');
  }

  const hash = tx.hash();
  const serverVerified = tx.signatures.some((s) => {
    try {
      return serverKp.verify(hash, s.signature());
    } catch {
      return false;
    }
  });
  if (!serverVerified) throw new Error('Missing server signature');

  const clientKp = Keypair.fromPublicKey(claimedPublicKey);
  const clientVerified = tx.signatures.some((s) => {
    try {
      return clientKp.verify(hash, s.signature());
    } catch {
      return false;
    }
  });
  if (!clientVerified) throw new Error('Invalid wallet signature');

  return claimedPublicKey;
}
