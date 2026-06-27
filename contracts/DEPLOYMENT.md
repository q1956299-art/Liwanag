# CharityCampaign — Testnet Deployment

| Field | Value |
|-------|-------|
| **Network** | Stellar Testnet |
| **Contract ID** | `CC5KFZ6KLISPHYCA47SVKJNF52KKMLHQ2JGADTSOGNNX4W345G7WJ6CA` |
| **Wasm hash (optimized)** | `43cd830a9cde68c79cf51b7eeafbdf6a3c734dcb2b96764327b611cfbae52cc7` |
| **Admin / deployer** | `GBL5RJKF4QNJ4ZPLJZ7PS7K5A4J44VEZJRV2CRTFFDRVSY2N76AIIE47` |
| **Default token (XLM SAC)** | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| **RPC** | `https://soroban-testnet.stellar.org` |
| **Deploy tx** | `1eedd9a86d497544ff5b0ffd2dcb0b1d687ea419409fcf49fae3f420e4c9c5d3` |
| **Init tx** | `d28cf0e178997b45fd5699cf128671d58f1959b39e0c399a26015c31d406fc0b` |
| **Toolchain** | `cargo +1.89.0`, target `wasm32-unknown-unknown`, Stellar CLI v27 |

Explorer: https://stellar.expert/explorer/testnet/contract/CC5KFZ6KLISPHYCA47SVKJNF52KKMLHQ2JGADTSOGNNX4W345G7WJ6CA

## Entrypoints

- `initialize(admin, token)` — one-time; records the deployer as admin and the XLM SAC as the default token.
- `open_campaign(organizer, campaign_id, token, goal)` — organizer opens a campaign with a goal; organizer-signed.
- `donate(donor, campaign_id, amount) -> i128` — donor funds the campaign on-chain; tracks per-donor + total; returns new lifetime raised.
- `disburse(organizer, campaign_id, recipient, amount, memo) -> u32` — organizer pays a recipient and appends an immutable spend-ledger entry; returns the entry index.
- `close_campaign(organizer, campaign_id)` — stop new donations (disbursing the held balance still allowed).
- Views: `get_campaign`, `raised`, `balance`, `donor_amount`, `spend_count`, `get_spends`, `total_raised`, `get_token`, `get_admin`.
- Admin: `set_admin`, `upgrade`.

`campaign_id` is a `BytesN<32>` — the app passes `sha256(<campaign UUID>)`, so each Postgres campaign maps to a
stable on-chain key. `memo` on a spend is `sha256(<payout description>)`, tying each on-chain ledger entry to its
off-chain note.

## Rebuild / redeploy

```bash
cd contracts
make test          # cargo +1.89.0 test — 15 unit tests
make optimize      # build + stellar contract optimize
./scripts/deploy.sh
```

## Mainnet switch

Set `NETWORK=mainnet`, an `XLM_SAC` for mainnet, fund the deployer, then re-run `./scripts/deploy.sh`.
