// @vitest-environment node
import { Keypair, TransactionBuilder } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';
import { buildChallenge, verifyChallenge } from '@/server/stellar/sep10';

const PASSPHRASE = 'Test SDF Network ; September 2015';

function signAsClient(xdr: string, secret: string): string {
  const tx = TransactionBuilder.fromXDR(xdr, PASSPHRASE);
  tx.sign(Keypair.fromSecret(secret));
  return tx.toXDR();
}

describe('SEP-10 challenge', () => {
  it('verifies a correctly signed challenge', () => {
    const client = Keypair.random();
    const xdr = buildChallenge(client.publicKey());
    const signed = signAsClient(xdr, client.secret());
    expect(verifyChallenge(signed, client.publicKey())).toBe(client.publicKey());
  });

  it('rejects an unsigned challenge', () => {
    const client = Keypair.random();
    const xdr = buildChallenge(client.publicKey());
    expect(() => verifyChallenge(xdr, client.publicKey())).toThrow();
  });

  it('rejects a challenge signed by the wrong key', () => {
    const client = Keypair.random();
    const attacker = Keypair.random();
    const xdr = buildChallenge(client.publicKey());
    const signed = signAsClient(xdr, attacker.secret());
    expect(() => verifyChallenge(signed, client.publicKey())).toThrow();
  });

  it('rejects an invalid public key', () => {
    expect(() => buildChallenge('not-a-key')).toThrow();
  });
});
