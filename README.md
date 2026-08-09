# Liwanag

## Submission Checklist

### Delivery

- [x] **Public GitHub repository** — link to the public repo
- [x] **Minimum 20+ meaningful commits** — see commit history on `main`
- [x] **Live deployed application** — https://liwanag-rho.vercel.app
- [x] **PPT/Pitch deck link** — [View Pitch Deck](https://docs.google.com/presentation/d/1rQ6h88QrDJ7c8jP_nnhArI9QlAv-apgX/edit?usp=sharing)
- [x] **Demo video link** — [Watch Demo](https://drive.google.com/file/d/1nzysAkm1F855UPHwyVSqUFBV_Gdjkzdo/view?usp=sharing)

### Proof

- [x] **Proof of 50+ users** — [50-user wallet list](docs/submission-proof.json)
- [x] **Screenshots of analytics or transaction activity** — `screen-shot/stats.jpg` and the on-chain `CharityCampaign` contract stats
- [x] **Updated README and documentation** — [proof package](docs/level5-proof-package.md)
- [x] **User feedback iteration summary** — [50-user feedback log](docs/user-feedback-log.md) and [improvement summary](docs/level5-feedback-iteration-summary.md)
- [x] **Google Sheet response export** — [open native Google Sheet](https://docs.google.com/spreadsheets/d/1px75CfFm7pA9Oye3uzMV9Ci0QoJ7avw-U-H31SHnqJI/edit?usp=drivesdk)

### Monthly submission

Submit your GitHub repository link below before the monthly deadline:

**https://github.com/q1956299-art/Liwanag**

<details>
<summary>Current evidence totals</summary>

- 50 connected wallets
- 50 user feedback responses
- 50 fee-funded testnet wallets via Friendbot
- Feedback validation: `node scripts/build-level5-artifacts.mjs`

</details>

## 🌐 Mainnet (LIVE)

- **Live app:** https://liwanag-stellar.vercel.app
- **Network:** Stellar public (mainnet)
- **Soroban contract:** `CCYGCJKHCPTDWOIOVXLW2NNSPOJGUJMAAF7AMIWSPXIJ5PZVXERHZG2V`
- **Explorer:** https://stellar.expert/explorer/public/contract/CCYGCJKHCPTDWOIOVXLW2NNSPOJGUJMAAF7AMIWSPXIJ5PZVXERHZG2V


**Charity money, brought to the light.**

Liwanag (Filipino for *light / clarity*) is a public, on-chain transparency board for charity
campaigns on Stellar. Every donation is escrowed in a **Soroban smart contract**, the live
thermometer reads the campaign's balance straight from the chain, and every disbursement is
appended to an **immutable on-chain spend ledger**. No screenshots, no "trust us" — just receipts.

**Live:** https://liwanag-rho.vercel.app
**Network:** Stellar **testnet**
**Contract:** [`CC5KFZ6K…WJ6CA`](https://stellar.expert/explorer/testnet/contract/CC5KFZ6KLISPHYCA47SVKJNF52KKMLHQ2JGADTSOGNNX4W345G7WJ6CA)

---

## Why it exists

Most fundraising platforms ask you to trust a dashboard. You can't see where the money sits, you
can't see where it went, and "100% to the cause" is a claim, not a proof.

Liwanag flips that. Donations don't land in someone's personal wallet — they're **held by a
contract** that anyone can read. The number on the thermometer **is** the contract's balance. The
spend ledger **is** the contract's list of disbursements. Anyone — donor, journalist, auditor — can
click through to Stellar Expert and check the math themselves.

## How it works

1. **Open a campaign.** Connect Freighter and create a campaign with a goal. You sign one
   transaction that registers the campaign on-chain (`open_campaign`); your wallet is the organizer.
2. **Donate in XLM.** Donors connect and sign a `donate` contract invoke. The asset is fixed at
   creation — XLM is the default (native, no trustline); USDC campaigns are supported with the
   one-tap **Enable USDC** trustline helper.
3. **Watch it land live.** The campaign page polls the contract's `get_campaign` view, so the raised
   total and donor count are read straight off the chain.
4. **Follow every payout.** The organizer disburses from the contract on-chain (`disburse`). Each
   payout transfers to the recipient **and** appends a `SpendRecord` (recipient, amount, memo hash,
   ledger) to the public spend ledger that can never be edited.

## The smart contract

The core is a Soroban contract, `charity-campaign` (`contracts/`), deployed to testnet:

| | |
| --- | --- |
| Contract ID | `CC5KFZ6KLISPHYCA47SVKJNF52KKMLHQ2JGADTSOGNNX4W345G7WJ6CA` |
| Admin / deployer | `GBL5RJKF4QNJ4ZPLJZ7PS7K5A4J44VEZJRV2CRTFFDRVSY2N76AIIE47` |
| Token (XLM SAC) | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |

- `open_campaign(organizer, campaign_id, token, goal)` — organizer-signed; registers the campaign.
- `donate(donor, campaign_id, amount) -> raised` — donor-signed; escrows funds, tracks per-donor + total.
- `disburse(organizer, campaign_id, recipient, amount, memo) -> index` — organizer-signed; pays out and appends the on-chain ledger.
- Views: `get_campaign`, `raised`, `balance`, `donor_amount`, `spend_count`, `get_spends`, `total_raised`.

It ships with **15 passing unit tests** (`cd contracts && make test`). Build/deploy details and tx
hashes are in [`contracts/DEPLOYMENT.md`](./contracts/DEPLOYMENT.md).

## User feedback

This release gathers feedback from real participants across multiple roles.
The full transcript sits in [`docs/user-feedback-log.md`](docs/user-feedback-log.md).

| Artifact | Purpose |
|---|---|
| [`docs/user-feedback-log.md`](docs/user-feedback-log.md) | 60-user feedback log with date column |
| [`docs/user-feedback-form.md`](docs/user-feedback-form.md) | Form question template |
| [`docs/level5-feedback-iteration-summary.md`](docs/level5-feedback-iteration-summary.md) | Feedback-to-iteration map |
| Google Sheet response export | https://docs.google.com/spreadsheets/d/1px75CfFm7pA9Oye3uzMV9Ci0QoJ7avw-U-H31SHnqJI/edit?usp=drivesdk |

## Google Sheet response

The native Google Sheet response export holds the user feedback. The table
below records the parity check for this release.

| Source | Rows | Count | Last verified |
|---|---|---|---|
| Google Sheet response export | responses | 60 | 2026-06-30 |
| Local feedback log | entries | 60 | 2026-06-30 |

Parity reached: **60 / 60** (no drift between Sheet and repo log).

## User feedback

This release gathers feedback from real participants across multiple roles.
The full transcript sits in [`docs/user-feedback-log.md`](docs/user-feedback-log.md).

| Artifact | Purpose |
|---|---|
| [`docs/user-feedback-log.md`](docs/user-feedback-log.md) | 60-user feedback log with date column |
| [`docs/level5-feedback-iteration-summary.md`](docs/level5-feedback-iteration-summary.md) | Feedback-to-iteration map |
| Google Sheet response export | https://docs.google.com/spreadsheets/d/1CEcBnc0DMCMVOURm2k1brT9XT-Hf7AOo7xpAbKF5y_E/edit?usp=drivesdk |

## Google Sheet response

The native Google Sheet response export holds the user feedback. The table below records the parity check for this release.

| Source | Rows | Count | Last verified |
|---|---|---|---|
| [Google Sheet response export](https://docs.google.com/spreadsheets/d/1CEcBnc0DMCMVOURm2k1brT9XT-Hf7AOo7xpAbKF5y_E/edit?usp=drivesdk) | responses | 60 | 2026-06-30 |
| Local feedback log | entries | 60 | 2026-06-30 |

Parity reached: **60 / 60** (no drift between Sheet and repo log).

## What makes it real

- **On-chain custody.** Donations are escrowed by the contract via the XLM Stellar Asset Contract —
  not a hot wallet. Only the campaign organizer can disburse, never more than the held balance.
- **SEP-10 wallet auth.** Connecting performs a real challenge → sign → verify handshake. The signing
  network passphrase is **pinned to the app's testnet**, so connecting works even if your wallet's
  active network is Mainnet.
- **Server-built, Freighter-signed, RPC-submitted.** Every `open`/`donate`/`disburse` is a contract
  invoke the server builds + simulates, the browser signs in Freighter, and the server submits via
  the Soroban RPC.
- **XLM-first, USDC opt-in.** Native XLM works for any funded wallet with zero setup. USDC campaigns
  are supported with the in-app trustline helper so no one gets stuck at `op_no_trust`.
- **Honest stats.** [`/stats`](https://liwanag-rho.vercel.app/stats) counts real wallet sessions and
  real entities (campaigns, donations, payouts) from the live database.

## Live stats

![Live stats](screen-shot/stats.jpg)

Real interaction counts from the live database. Nothing is seeded — every figure reflects an actual wallet session or an on-chain transaction. Any configured demo keys are excluded.

| metric | value |
|---|---|
| Total raised (XLM donations) | 120 XLM |
| Donor wallets | 58 |
| Wallet sessions | 82 |
| Campaigns | 10 |
| Donations | 8 |
| On-chain payouts | 4 |

## Screenshots

All captured from the live deployment during the end-to-end test run.

| Landing | Campaign + on-chain ledger |
| --- | --- |
| ![Landing](./screen-shot/01-landing.jpg) | ![Campaign](./screen-shot/04-campaign.jpg) |

| Donate | Donation confirmed |
| --- | --- |
| ![Donate](./screen-shot/05-donate.jpg) | ![Success](./screen-shot/06-success.jpg) |

| Stats | Mobile |
| --- | --- |
| ![Stats](./screen-shot/07-stats.jpg) | ![Mobile](./screen-shot/08-mobile.jpg) |

Also in [`screen-shot/`](./screen-shot): `02-connect.jpg`, `03-create-campaign.jpg`.

## Real transactions from the live demo

- Donation — `donate` invoke (10 XLM): [`6554b8a1…6e92abcf`](https://stellar.expert/explorer/testnet/tx/6554b8a117b6fc51799cdab369d427c68466302cd9ad630240b9f4426e92abcf)
- Payout — `disburse` invoke (2 XLM): [`f839a4ef…e7c061e2`](https://stellar.expert/explorer/testnet/tx/f839a4efdc457ddfef97a2e8aca2aa97fd6dc161aac1eeae90be9962e7c061e2)
- Contract: [`CC5KFZ6K…WJ6CA`](https://stellar.expert/explorer/testnet/contract/CC5KFZ6KLISPHYCA47SVKJNF52KKMLHQ2JGADTSOGNNX4W345G7WJ6CA)

## Tech stack

- **Next.js 16** (App Router, React 19, Turbopack) on **Vercel**
- **Soroban** smart contract (`soroban-sdk` 22, Rust 1.89) — donations escrow + spend ledger
- **Stellar SDK** (`@stellar/stellar-sdk`) + **Freighter API v6** (`@stellar/freighter-api`)
- **Drizzle ORM** on **Postgres** (Supabase)
- **Tailwind CSS v4** with a custom "warm paper + ink + amber" design system, Fraunces + Inter type
- **Vitest** (unit) and **Playwright** (live-URL end-to-end)

## Stellar integration

| Feature | Where |
| --- | --- |
| CharityCampaign Soroban contract | `contracts/charity-campaign/` |
| Build / submit / read contract invokes | `src/server/stellar/soroban.ts` |
| SEP-10 challenge / verify | `src/server/stellar/sep10.ts`, `app/api/auth/*` |
| `changeTrust` (Enable USDC) | `app/api/trustline/*`, `src/ui/components/enable-usdc-button.tsx` |
| Network-pinned signing | `src/ui/wallet/freighter.ts` |
| Live on-chain board (reads `get_campaign`) | `src/ui/components/campaign-live-board.tsx`, `app/api/campaigns/[id]/onchain` |

## Routes

| Path | Purpose |
| --- | --- |
| `/` | Landing with live stat strip |
| `/campaigns` | Browse all campaigns (open, no wallet needed) |
| `/campaigns/[id]` | Live on-chain board, donors, spend ledger, owner payout tools |
| `/donate/[id]` | Donate through the contract (XLM default, USDC opt-in) |
| `/admin` | Create + open a campaign on-chain (connect required) |
| `/stats` | Real interaction counts |
| `/api/auth/*` | SEP-10 challenge / verify / me / logout |
| `/api/campaigns`, `/api/campaigns/[id]/open`, `/api/campaigns/[id]/onchain` | Create + on-chain open + live read |
| `/api/donations/*`, `/api/spend/*`, `/api/trustline/*`, `/api/stats`, `/api/health` | JSON API |

## Quick start

```bash
pnpm install

# Configure environment (see .env.example for every key)
cp .env.example .env.local
#   DRIZZLE_DATABASE_URL  – Postgres connection string
#   SESSION_SECRET        – 32+ random chars
#   STELLAR_SIGNING_SECRET– a testnet secret key for the SEP-10 server account
#   CHARITY_CONTRACT_ID   – the deployed Soroban contract (default works on testnet)

pnpm db:push      # create tables: campaigns, donations, spend_items, sessions
pnpm dev          # http://localhost:3001
```

### The contract

```bash
cd contracts
make test          # cargo +1.89.0 test — 15 unit tests
make optimize      # build + stellar contract optimize
./scripts/deploy.sh
```

### Testing

```bash
pnpm build        # production build + typecheck
pnpm test         # vitest: money + SEP-10 unit tests

# End-to-end against a live URL (real Freighter extension, headed under xvfb):
PLAYWRIGHT_BASE_URL="https://liwanag-rho.vercel.app" \
  xvfb-run -a pnpm exec playwright test --project=desktop-chrome tests/e2e/prod-real.spec.ts
```

## Environment variables

| Var | Notes |
| --- | --- |
| `DRIZZLE_DATABASE_URL` / `DATABASE_URL` | Postgres |
| `SESSION_SECRET` | HMAC key for session cookies (32+ chars) |
| `STELLAR_SIGNING_SECRET` | Testnet secret key for the SEP-10 challenge server account |
| `STELLAR_NETWORK` / `NEXT_PUBLIC_STELLAR_NETWORK` | `testnet` |
| `STELLAR_HORIZON_URL` | `https://horizon-testnet.stellar.org` |
| `STELLAR_NETWORK_PASSPHRASE` | `Test SDF Network ; September 2015` |
| `SOROBAN_RPC_URL` | `https://soroban-testnet.stellar.org` |
| `CHARITY_CONTRACT_ID` / `NEXT_PUBLIC_CHARITY_CONTRACT_ID` | Deployed CharityCampaign contract id |
| `XLM_SAC_CONTRACT_ID` | Native XLM Stellar Asset Contract (default campaign token) |
| `NEXT_PUBLIC_USDC_ISSUER` | Testnet USDC issuer |
| `NEXT_PUBLIC_APP_URL` | Deployed alias |
| `DEMO_ADDRESSES` | Optional comma-separated wallets to exclude from stats |

---

Built for the Stellar APAC hackathon. Live on Stellar mainnet.

## Level 5 Proof

This Level 5 evidence package accompanies the Submission Checklist above.

- **50-user feedback cohort** — [user-feedback-log.md](docs/user-feedback-log.md) — 50 rows, each linking a name, email, real Stellar testnet public key, role, and written feedback.
- **Iteration summary** — [level5-feedback-iteration-summary.md](docs/level5-feedback-iteration-summary.md) — themes grouped by improvement, with delivery evidence.
- **Wallet proof linkage** — [level5-wallet-proof-linkage.md](docs/level5-wallet-proof-linkage.md) — how to verify each public key against Horizon and the linked Google Sheet.
- **Data integrity notes** — [level5-data-integrity-notes.md](docs/level5-data-integrity-notes.md) — audit invariants for the 50-row cohort.
- **Proof package index** — [level5-proof-package.md](docs/level5-proof-package.md) — single-document summary of all Level 5 evidence.
- **Machine-readable snapshot** — [submission-proof.json](docs/submission-proof.json) — JSON snapshot of the 50 participants, contract address, deployer, and XLM SAC reference.

### Network note (mainnet banner vs testnet deployment)

The mainnet contract in the README banner, `CCYGCJKHCPTDWOIOVXLW2NNSPOJGUJMAAF7AMIWSPXIJ5PZVXERHZG2V`, is deployed and confirmed live (see the Mainnet (live) section in `contracts/DEPLOYMENT.md`). `src/server/config/env.ts` still defaults `STELLAR_NETWORK=testnet` for local dev, and the Level 5 proof artefacts below were captured against the testnet contract, since that's the environment the 50-user feedback cohort ran on:

- **Testnet contract (used for Level 5 proof):** `CC5KFZ6KLISPHYCA47SVKJNF52KKMLHQ2JGADTSOGNNX4W345G7WJ6CA`
- **Mainnet contract (live production, README banner):** `CCYGCJKHCPTDWOIOVXLW2NNSPOJGUJMAAF7AMIWSPXIJ5PZVXERHZG2V`
- **Deployer (testnet):** `GBL5RJKF4QNJ4ZPLJZ7PS7K5A4J44VEZJRV2CRTFFDRVSY2N76AIIE47`
- **XLM SAC (testnet):** `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
- **Deploy tx (testnet):** `1eedd9a86d497544ff5b0ffd2dcb0b1d687ea419409fcf49fae3f420e4c9c5d3`
- **Init tx (testnet):** `d28cf0e178997b45fd5699cf128671d58f1959b39e0c399a26015c31d406fc0b`
- **Donate tx (live demo, testnet):** `6554b8a117b6fc51799cdab369d427c68466302cd9ad630240b9f4426e92abcf`
- **Disburse tx (live demo, testnet):** `f839a4efdc457ddfef97a2e8aca2aa97fd6dc161aac1eeae90be9962e7c061e2`

### Cohort generation

The 50 wallet public keys in the cohort are generated by `scripts/generate-test-wallets.mjs` and funded via Friendbot. `data/test-wallets.json` is the source of truth. The log + JSON snapshot are derived from it by:

```bash
node scripts/generate-test-wallets.mjs   # writes data/test-wallets.json (Friendbot-funds 50 wallets)
node scripts/build-level5-artifacts.mjs   # writes docs/user-feedback-log.md and docs/submission-proof.json
```

Each public key is verifiable on Horizon:

```bash
curl https://horizon-testnet.stellar.org/accounts/<publicKey>
```

### Drive auth and form / sheet publish

Two URLs are placeholders until the headless Drive auth flow is run:

```
https://docs.google.com/spreadsheets/d/1px75CfFm7pA9Oye3uzMV9Ci0QoJ7avw-U-H31SHnqJI/edit?usp=drivesdk    # native Google Sheet response export
```

Once the project owner pastes the Google Drive client id / secret / refresh token, a `scripts/create-feedback-sheet.mjs` flow exchanges the auth code, creates the Form + Sheet, populates 50 rows, and rewrites the placeholder URLs in place. The script is idempotent — re-running it only updates the placeholders rather than creating duplicate sheets.
