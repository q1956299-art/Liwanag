import { Keypair, TransactionBuilder, hash, StrKey } from '@stellar/stellar-sdk';
import { Horizon } from '@stellar/stellar-sdk';
import { writeFileSync } from 'node:fs';

const API = 'https://liwanag-stellar.vercel.app';
const FRIENDBOT = 'https://friendbot.stellar.org';
const HORIZON = 'https://horizon-testnet.stellar.org';
const PASSPHRASE = 'Test SDF Network ; September 2015';

async function main() {
  const list = await (await fetch(`${API}/api/campaigns`)).json();
  const active = (list as Array<{ id: string; asset: string; status: string }>).find(
    (c) => c.status === 'active' && c.asset === 'XLM',
  );
  if (active) {
    console.log(JSON.stringify({ campaign_id: active.id, source: 'reused' }));
    return;
  }

  const organizer = Keypair.random();
  await fetch(`${FRIENDBOT}?addr=${organizer.publicKey()}`).then((r) => r.json());

  const challengeRes = await fetch(`${API}/api/auth/challenge`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ publicKey: organizer.publicKey() }),
  });
  const challengeJson = (await challengeRes.json()) as { xdr?: string; error?: string };
  if (!challengeJson.xdr) throw new Error(`challenge: ${challengeJson.error}`);
  const challengeTx = TransactionBuilder.fromXDR(challengeJson.xdr, PASSPHRASE);
  challengeTx.sign(organizer);

  const verifyRes = await fetch(`${API}/api/auth/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ publicKey: organizer.publicKey(), signedXdr: challengeTx.toXDR() }),
  });
  const setCookie = verifyRes.headers.get('set-cookie');
  if (!setCookie) throw new Error(`verify failed: ${(await verifyRes.json()).error ?? 'no cookie'}`);
  const cookie = setCookie.split(';')[0];

  const createRes = await fetch(`${API}/api/campaigns`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({
      name: 'load-test-target',
      description: 'Testnet load test target — donations of 1 XLM x 55.',
      goalAmount: '100',
      asset: 'XLM',
      category: 'community',
    }),
  });
  const created = (await createRes.json()) as { id?: string; error?: string };
  if (!created.id) throw new Error(`create: ${created.error}`);
  const campaignId = created.id;

  const buildRes = await fetch(`${API}/api/campaigns/${campaignId}/open/build`, {
    method: 'POST',
    headers: { cookie },
  });
  const buildJson = (await buildRes.json()) as { xdr?: string; error?: string };
  if (!buildJson.xdr) throw new Error(`open/build: ${buildJson.error}`);

  const openTx = TransactionBuilder.fromXDR(buildJson.xdr, PASSPHRASE);
  openTx.sign(organizer);
  const submitRes = await fetch(`${API}/api/campaigns/${campaignId}/open`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ signedXdr: openTx.toXDR() }),
  });
  const submitJson = (await submitRes.json()) as { txHash?: string; error?: string };
  if (!submitJson.txHash) throw new Error(`open/submit: ${submitJson.error}`);

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const c = (await (await fetch(`${API}/api/campaigns/${campaignId}`)).json()) as {
      status: string;
    };
    if (c.status === 'active') break;
    await new Promise((r) => setTimeout(r, 1000));
  }

  const final = (await (await fetch(`${API}/api/campaigns/${campaignId}`)).json()) as {
    status: string;
  };
  if (final.status !== 'active') throw new Error(`campaign not active after open: ${final.status}`);

  console.log(JSON.stringify({ campaign_id: campaignId, txHash: submitJson.txHash, source: 'created' }));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
