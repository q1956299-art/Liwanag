# Testnet load test — 55 wallets, 2026-08-29

## Setup

- Network: Stellar **testnet**
- App URL: <https://liwanag-rho.vercel.app>
- Contract: `CC5KFZ6KLISPHYCA47SVKJNF52KKMLHQ2JGADTSOGNNX4W345G7WJ6CA`
- Wallets: 55 × `Keypair.random()`, Friendbot-funded
- Campaign: `11780b12-ba22-4f47-ade0-c944bdc69e53` (XLM, `active`, opened via `scripts/setup-active-campaign.ts`)

## Results

| Phase          | n  | Success | Error | p50 (ms) | p90 (ms) | p99 (ms) | Wall (ms) | Throughput (tx/s) |
| -------------- | -- | ------- | ----- | -------- | -------- | -------- | --------- | ----------------- |
| `donate/build` | 55 | 55      | 0     | 677      | 2085     | 2203     | —         | —                 |
| `donate/submit`| 55 | 55      | 0     | 5007     | 5285     | 6141     | 30448     | 1.81              |

**Overall: 55/55 donations succeeded end-to-end** — every donor built, signed, submitted, and Horizon confirmed a 1-XLM donation.

## Notes

- Concurrency 10 per phase. Submit throughput at ~1.8 tx/s is bounded by the Vercel function's `buildInvoke` polling loop (`src/server/stellar/soroban.ts`) which waits for the testnet Soroban RPC to observe each finalised tx — that's a network-side floor, not app-side. Build phase peaks at ~2 s p99 because RPC `simulateTransaction` occasionally retries under contention.
- Server-side `campaigns.raised_amount` sync from contract state runs lazily; endpoint may report `null` immediately after a burst. Individual `POST /api/donations/submit` responses each return 201 with a real `txHash`.
- No 5xx surfaced. No timeouts. Only client-side error path exercised during the initial run was a stale bug in `scripts/loadtest-55-wallets.mjs` that sent an empty `donorAddress` — fixed in the same commit as this report.

## Reproduce

```bash
# 1. Ensure at least one active XLM campaign on testnet contract:
npx tsx scripts/setup-active-campaign.ts
# -> prints { campaign_id, txHash, source }

# 2. Run the load test (55 donors, concurrency 10):
SMOKE_CAMPAIGN_ID=<campaign_id> node scripts/loadtest-55-wallets.mjs
```

Raw per-request data: `scripts/loadtest-55-wallets.results.json` (gitignored, generated at runtime).

## Prior blocker (resolved before this run)

An earlier run on <https://liwanag-stellar.vercel.app> failed every SEP-10 login with `Invalid wallet signature`. Root cause: that hostname does not alias any deployment inside the `uit1/liwanag` Vercel project — it belongs to a separate legacy project outside our env-flip. The correct hostname for this project's deployments is `liwanag-rho.vercel.app`. All scripts here point at the correct hostname.
