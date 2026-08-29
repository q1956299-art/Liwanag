# Testnet 55-donor load test — NOT RUN

**Date:** 2026-08-29
**Target:** https://liwanag-stellar.vercel.app (Stellar testnet, contract `CC5KFZ6KLISPHYCA47SVKJNF52KKMLHQ2JGADTSOGNNX4W345G7WJ6CA`)

## Re-verification on 2026-08-29

A second pass was run after the initial scaffold commit. The blocker still reproduces byte-exact:

```
$ SMOKE_CAMPAIGN_ID=dummy xvfb-run -a ./node_modules/.bin/tsx scripts/testnet-smoke.mts
SMOKE_FAIL: locator.waitFor: Timeout 30000ms exceeded.
  - waiting for getByRole('button', { name: /donate/i }).first() to be visible
```

The Donate button never appears because `GET /api/campaigns` still returns `[]` — no active XLM campaign exists on the deployed contract, so no `/campaigns/<id>` route resolves to a detail page with the donate CTA.

## Direct SEP-10 repro (Node, `@stellar/stellar-sdk@15.1.0`)

Same as the initial run: challenge source = `GCQPFNJBNHH2ZQ5PLMCQW2WRALX3CCNB5YQOA4W26IEBMYW2C3KMTDYN`, but `Keypair.fromPublicKey(source).verify(tx.hash(), sig[0])` returns `false`. Server-attached signature is invalid against the source it claims, so `verifyChallenge` cannot complete and the session wallet cannot be established.

## Status: BLOCKED — campaign open path broken on prod

The test never executed. Step 0 (ensure an active XLM campaign) and Step 1 (Playwright smoke) both require an active campaign on the deployed contract. Both routes that open a campaign require a SEP-10 authenticated wallet session (`getSessionWallet()`), which in turn requires `POST /api/auth/challenge` + `POST /api/auth/verify`.

### Root cause — deployed env's SEP-10 signing key is invalid

Local repro (Node, `@stellar/stellar-sdk@15.1.0`):

1. `POST /api/auth/challenge` returns a `TransactionEnvelope` whose `source` account is the deployed home-domain signing key `GCQPFNJBNHH2ZQ5PLMCQW2WRALX3CCNB5YQOA4W26IEBMYW2C3KMTDYN`.
2. That envelope arrives with **one** signature already attached, attributed to the source account.
3. `Keypair.fromPublicKey(source).verify(tx.hash(), sig[0])` returns **`false`**.

The signature does not verify against the source it claims to be from. Concretely: the deployed `STELLAR_SIGNING_SECRET` either (a) does not match the public key the challenge advertises, (b) was rotated on the Vercel project without re-deploying / purging the build cache, or (c) is unset and the server is silently using a placeholder. Same key is used by `app/api/auth/challenge/route.ts` (build) and `app/api/auth/verify/route.ts` (verify), so a fresh client signature is correctly produced — the verify path then fails because the server-attached signature also fails, but the path that throws first happens to be the client-side check (`Invalid wallet signature`), masking the real failure (server sig also invalid against the source it advertises).

### Why this blocks every smoke + load test path

- `POST /api/campaigns` requires a session wallet (`getSessionWallet()` → SEP-10 verify).
- `POST /api/campaigns/[id]/open/build` requires the same.
- `POST /api/campaigns/[id]/open` requires the same.
- The Liwanag production deploy lists **zero campaigns** at `GET /api/campaigns` — no live target exists to donate against.
- `GET /api/campaigns` (public) returns `[]`. `POST /api/donations/build` (no auth) is reachable, but it explicitly rejects with 404/409 because no campaign exists.

Net: I cannot create the target campaign without a working SEP-10 path, and there is no pre-existing active campaign to target. Per the task constraint ("If unable to create … STOP + report; do NOT proceed"), neither the smoke nor the load test was executed.

## What was committed instead

| File | Purpose |
| --- | --- |
| `scripts/setup-active-campaign.ts` | Step 0 helper: list → create (auth) → open (auth) → poll active. Not runnable today, kept for after fix. |
| `scripts/testnet-smoke.mts` | Playwright real-Freighter smoke. Not runnable today (no active campaign). |
| `scripts/loadtest-55-wallets.mjs` | 55-donor load test. Not runnable today. |
| `.env.example` | Testnet live values appended (network, horizon, soroban RPC, contract IDs). |
| `.gitignore` | `scripts/loadtest-55-wallets.keys.json` + `.results.json` ignored. |
| `docs/loadtest-testnet-report.md` | This file. |

## Required fix to unblock

1. In the Vercel project for `liwanag-stellar`, confirm `STELLAR_SIGNING_SECRET` matches the public key the home-domain source advertises.
2. Redeploy (and if the secret was rotated, ensure the build cache is invalidated — the challenge XDR the *currently deployed* code emits must verify against the same `STELLAR_SIGNING_SECRET` the *currently deployed* verify path reads).
3. Re-run `npx tsx scripts/setup-active-campaign.ts` to create + open the target campaign. Capture the printed `campaign_id`.
4. `SMOKE_CAMPAIGN_ID=<id> xvfb-run -a npx tsx scripts/testnet-smoke.mts` — must pass before the load test.
5. `SMOKE_CAMPAIGN_ID=<id> node scripts/loadtest-55-wallets.mjs` — produces the p50/p90/p99 numbers this report is meant to hold.

## Pinned values (Aug 29 2026)

- Testnet contract: `CC5KFZ6KLISPHYCA47SVKJNF52KKMLHQ2JGADTSOGNNX4W345G7WJ6CA`
- XLM SAC: `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
- Horizon: `https://horizon-testnet.stellar.org`
- Soroban RPC: `https://soroban-testnet.stellar.org`
- Home domain: `liwanag.app`
- Deployed signing pubkey (claimed by challenge XDR): `GCQPFNJBNHH2ZQ5PLMCQW2WRALX3CCNB5YQOA4W26IEBMYW2C3KMTDYN`
## 2026-08-29 retry — second observation

Re-ran `scripts/setup-active-campaign.ts` end-to-end this session. The blocker reproduces, but with an additional signal:

- With client-side passphrase = `Test SDF Network ; September 2015`, `POST /api/auth/verify` returns `401 {"error":"Invalid wallet signature"}` even when the same SDK round-trips successfully locally (the client-attached signature verifies against the challenge hash on the *same* Node process that signed it).
- With client-side passphrase = `Public Global Stellar Network ; September 2015`, the same call returns `{wallet: …}` (200, session cookie set). The Soroban tx hash embedded in `TransactionEnvelope` is bound to the *passphrase* the client used to build/sign, which means the deployed server is signing/verifying against the **mainnet** passphrase hash.
- After successful verify, `POST /api/campaigns` creates a DB row (`status="pending_chain"`, hidden from `GET /api/campaigns`). `POST /api/campaigns/<id>/open/build` then fails: `Account not found: <organizer>` — the server's Soroban RPC `getAccount` for the freshly Friendbot-funded testnet organizer returns "not found", i.e. the RPC endpoint configured in prod is **not** the testnet RPC, so the second precondition (Soroban network) is also unmet.

In short: two env vars (`STELLAR_NETWORK_PASSPHRASE` and `SOROBAN_RPC_URL`) are out of sync with the testnet contract + Horizon URL. Both must be flipped together; flipping only the passphrase is not enough.
