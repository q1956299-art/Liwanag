#!/usr/bin/env node
/**
 * 55-donor load test against Liwanag prod (Stellar testnet).
 * Phase A: generate 55 random donor keypairs, Friendbot-fund (concurrency 10).
 * Phase B: each donor builds + signs + submits a 1-XLM donation against
 *          the active XLM campaign from SMOKE_CAMPAIGN_ID.
 *
 * Usage:
 *   SMOKE_CAMPAIGN_ID=<id> node scripts/loadtest-55-wallets.mjs
 *
 * Outputs:
 *   scripts/loadtest-55-wallets.keys.json     (gitignored — never commit)
 *   scripts/loadtest-55-wallets.results.json  (gitignored — never commit)
 *   docs/loadtest-testnet-report.md           (committed summary)
 */
import { setTimeout as sleep } from 'node:timers/promises';
import { writeFileSync } from 'node:fs';
import { Keypair, TransactionBuilder } from '@stellar/stellar-sdk';

const API = process.env.LIWANAG_API ?? 'https://liwanag-stellar.vercel.app';
const FRIENDBOT = 'https://friendbot.stellar.org';
const PASSPHRASE = 'Test SDF Network ; September 2015';
const CAMPAIGN_ID = process.env.SMOKE_CAMPAIGN_ID ?? '';
const N = Number(process.env.LOADTEST_N ?? 55);
const CONCURRENCY = 10;

if (!CAMPAIGN_ID) {
  console.error('SMOKE_CAMPAIGN_ID required (active XLM campaign id).');
  process.exit(2);
}

async function fetchJson(url, opts = {}, deadline = 90_000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), deadline);
  try {
    const r = await fetch(url, { ...opts, signal: ctl.signal });
    const j = await r.json().catch(() => ({}));
    return { status: r.status, body: j };
  } finally {
    clearTimeout(timer);
  }
}

function pct(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

async function runPool(items, fn, concurrency) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (true) {
        const i = next++;
        if (i >= items.length) return;
        results[i] = await fn(items[i], i);
      }
    }),
  );
  return results;
}

async function main() {
  console.log(`Generating ${N} donor keypairs...`);
  const donors = Array.from({ length: N }, () => Keypair.random());
  writeFileSync(
    'scripts/loadtest-55-wallets.keys.json',
    JSON.stringify(donors.map((k) => ({ publicKey: k.publicKey(), secret: k.secret() })), null, 2),
  );

  console.log('Friendbot funding...');
  await runPool(
    donors,
    async (k) => {
      const r = await fetch(`${FRIENDBOT}?addr=${k.publicKey()}`);
      if (!r.ok) throw new Error(`friendbot ${k.publicKey()} -> ${r.status}`);
    },
    CONCURRENCY,
  );

  console.log('Phase B: build/submit donations...');
  const buildStart = Date.now();
  const buildResults = await runPool(
    donors,
    async (k) => {
      const t0 = Date.now();
      try {
        const r = await fetchJson(`${API}/api/donations/build`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ donorAddress: k.publicKey(), campaignId: CAMPAIGN_ID, amount: '1' }),
        });
        if (r.status !== 200 || !r.body.xdr) return { ok: false, phase: 'build', status: r.status, err: r.body.error ?? 'no xdr', ms: Date.now() - t0 };
        const tx = TransactionBuilder.fromXDR(r.body.xdr, PASSPHRASE);
        tx.sign(k);
        return { ok: true, phase: 'build', status: r.status, xdr: tx.toXDR(), ms: Date.now() - t0 };
      } catch (e) {
        return { ok: false, phase: 'build', err: e instanceof Error ? e.message : String(e), ms: Date.now() - t0 };
      }
    },
    CONCURRENCY,
  );

  const submitStart = Date.now();
  const submitResults = await runPool(
    buildResults,
    async (r) => {
      const t0 = Date.now();
      if (!r.ok) return { ok: false, phase: 'submit', err: 'build failed upstream', ms: 0 };
      try {
        const res = await fetchJson(`${API}/api/donations/submit`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ signedXdr: r.xdr, campaignId: CAMPAIGN_ID, donorAddress: '', amount: '1' }),
        });
        return { ok: res.status === 201, phase: 'submit', status: res.status, txHash: res.body.txHash, err: res.body.error, ms: Date.now() - t0 };
      } catch (e) {
        return { ok: false, phase: 'submit', err: e instanceof Error ? e.message : String(e), ms: Date.now() - t0 };
      }
    },
    CONCURRENCY,
  );
  const submitWallMs = Date.now() - submitStart;

  const ok = submitResults.filter((r) => r.ok).length;
  const errs = submitResults.filter((r) => !r.ok);

  const buildMs = buildResults.map((r) => r.ms).filter((x) => x > 0);
  const submitMs = submitResults.map((r) => r.ms).filter((x) => x > 0);

  const report = {
    campaignId: CAMPAIGN_ID,
    donors: N,
    build: {
      n: buildResults.length,
      success: buildResults.filter((r) => r.ok).length,
      error: buildResults.filter((r) => !r.ok).length,
      p50: pct(buildMs, 50),
      p90: pct(buildMs, 90),
      p99: pct(buildMs, 99),
    },
    submit: {
      n: submitResults.length,
      success: ok,
      error: errs.length,
      p50: pct(submitMs, 50),
      p90: pct(submitMs, 90),
      p99: pct(submitMs, 99),
      wallMs: submitWallMs,
      throughputPerSec: ok / (submitWallMs / 1000),
    },
    topErrors: Object.entries(
      errs.reduce((acc, r) => {
        const k = String(r.err ?? 'unknown');
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {}),
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3),
  };
  writeFileSync('scripts/loadtest-55-wallets.results.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});