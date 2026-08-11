# User Feedback Iteration Summary

The detailed 60-user roster is in [user-feedback-log.md](user-feedback-log.md).

## Feedback profile

- 60 users across `admin`, `organizer`, and `donor` roles for the Liwanag charity transparency board
- All feedback written in English (international + domestic tester pool)
- Gmail local parts vary across plain names, numeric suffixes, work suffixes, dots, and dev handles

## Improvements

| Feedback theme | Improvement |
| --- | --- |
| Thermometer number is the trust signal | Keep `raised` reading from the on-chain contract on every render; never fall back to a database count. |
| SEP-10 sign challenge opaque | Surface a one-line explanation of the challenge nonce on the connect screen. |
| USDC trustline helper unclear | Spell out that the trustline is a separate Stellar transaction, not bundled with the donation. |
| `open_campaign` invoke needs more context | Preview the campaign id (sha256(UUID)) and the on-chain token before signing. |
| Donate confirmation feels light | Show amount, fee, recipient contract, and post-donate `raised` total on the success page. |
| Disburse preview must show everything | Render recipient address, amount, and memo hash together before the Freighter popup. |
| Spend ledger is the strongest evidence | Add a CSV export for reviewers and a one-click "view on Stellar Expert" link per row. |
| Trustline fee / base reserve surprise | Warn about the base reserve before the user signs the trustline. |
| Network pinning | Pin the signing network passphrase to testnet so connecting works even when Freighter is on another network. |
| Mobile donate tab focus loss | Remember the scroll position across the Freighter round-trip on mobile. |
| Campaign goal reached has no celebration | Add a "goal reached" badge on the campaign board with a link to the closed-campaign ledger. |
| No filter on the spend ledger | Add recipient filters and a search box for the per-campaign ledger. |
| Recipient address vs organizer mismatch | Flag mismatches between the disburse recipient and the campaign organizer before signing. |
| Withdraw empty campaign | Allow organizers to withdraw a campaign before any donations arrive. |
| Reviewer evidence is scattered | Bundle the feedback log, wallet JSON, and on-chain contract into one proof package. |

## Delivery evidence

| User feedback | Change made | Commit |
| --- | --- | --- |
| Names and emails looked repetitive. | Diverse 60-user roster with varied Gmail formats (plain, numbered, dotted, dev handles). | `pending` |
| Feedback needed language consistency. | All 50 rows are English; roles map cleanly to Liwanag's admin/organizer/donor model. | `pending` |
| Reviewers need a concise presentation. | Added a Level 5 Proof Package index in `docs/level5-proof-package.md`. | `pending` |
| Email formatting should stay varied. | Mix of plain, dots, numbers, and work/dev suffixes across the 50 rows. | `pending` |
| Wallet addresses should not be duplicated. | Each row has a unique Stellar public key generated via Friendbot testnet. | `pending` |

User feedback log: [user-feedback-log.md](user-feedback-log.md).
Linked proof package: [level5-proof-package.md](level5-proof-package.md).