use soroban_sdk::{contracttype, Address, BytesN};

/// Lifecycle of a campaign.
/// A campaign starts `Active`; the organizer may `Closed` it once the relief
/// work is done. Closing only blocks *new donations* — the organizer can still
/// disburse the remaining held balance to recipients.
#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum CampaignStatus {
    Active = 0,
    Closed = 1,
}

/// A single fundraising campaign, keyed in storage by a 32-byte `campaign_id`
/// (the app passes `sha256(<campaign UUID>)`).
///
/// The contract custodies exactly `balance` minor units of `token` for this
/// campaign. `raised` is the lifetime sum ever donated (never decremented), so
/// the UI can always show "total raised". `disbursed` + `balance` == `raised`.
#[contracttype]
#[derive(Clone)]
pub struct Campaign {
    /// The organizer who opened the campaign; the only address allowed to disburse.
    pub organizer: Address,
    /// Stellar Asset Contract (SAC) address of the campaign asset (XLM SAC by default).
    pub token: Address,
    /// Fundraising target, in the token's minor units (7 dp).
    pub goal: i128,
    /// Lifetime total ever donated (monotonic; survives disbursements).
    pub raised: i128,
    /// Funds currently held in the contract for this campaign (raised - disbursed).
    pub balance: i128,
    /// Lifetime total ever paid out to recipients.
    pub disbursed: i128,
    /// Number of distinct donor wallets that have funded this campaign.
    pub donors: u32,
    /// Number of disbursements recorded in the on-chain spend ledger.
    pub spends: u32,
    pub status: CampaignStatus,
}

/// One immutable entry in a campaign's on-chain spend ledger. Appended on every
/// `disburse` and never mutated — this is the transparency record auditors read.
#[contracttype]
#[derive(Clone)]
pub struct SpendRecord {
    /// Wallet the funds were paid to.
    pub recipient: Address,
    /// Amount paid out, in the token's minor units (7 dp).
    pub amount: i128,
    /// `sha256(<payout description>)` — ties the on-chain entry to its off-chain note.
    pub memo: BytesN<32>,
    /// Ledger sequence at which the payout was recorded (on-chain timestamp).
    pub ledger: u32,
}
