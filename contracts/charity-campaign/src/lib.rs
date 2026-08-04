#![no_std]
//! # Charity Campaign
//!
//! A Soroban smart contract that turns a charity fundraiser into a fully
//! on-chain, auditable object. It is the trust-minimized core of the **Liwanag**
//! transparency board: instead of donations landing in an organizer's personal
//! wallet that anyone has to *trust*, every donation is escrowed *in the
//! contract*, and every payout is appended to an immutable on-chain spend ledger.
//!
//! ## Properties
//! - **Real on-chain custody** via the Stellar Asset Contract (SAC). The default
//!   token recorded at init is the native **XLM** SAC — no trustline required.
//! - **Per-campaign + per-donor accounting** — `raised`, `balance`, `disbursed`,
//!   the distinct `donors` count, and each wallet's lifetime contribution are all
//!   tracked on-chain.
//! - **Immutable spend ledger** — `disburse` appends a `SpendRecord` (recipient,
//!   amount, memo hash, ledger) that is never mutated. This is the audit trail.
//! - **Authorization** — donors authorize their own donations; only the campaign
//!   `organizer` can disburse, and never more than the held balance.
//! - **Admin + upgradeable** — the admin is the deployer; the code can ship fixes
//!   without migrating campaign balances.
//! - **Events** — `init`, `open`, `donate`, `disburse`, `close` for indexers.

mod error;
mod storage;
mod types;

#[cfg(test)]
mod test;

use error::Error;
use storage::{
    DataKey, ENTRY_BUMP_AMOUNT, ENTRY_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT,
    INSTANCE_LIFETIME_THRESHOLD,
};
use types::{Campaign, CampaignStatus, SpendRecord};

use soroban_sdk::{
    contract, contractimpl, symbol_short, token, Address, BytesN, Env, Vec,
};

#[contract]
pub struct CharityCampaign;

#[contractimpl]
impl CharityCampaign {
    /// One-time setup. Records the admin (the deployer) and the default token
    /// (the XLM Stellar Asset Contract).
    pub fn initialize(env: Env, admin: Address, token: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::TotalRaised, &0i128);
        bump_instance(&env);
        env.events().publish((symbol_short!("init"),), (admin, token));
        Ok(())
    }

    /// Open a new campaign with a fundraising `goal`, owned by `organizer` and
    /// denominated in `token` (the XLM SAC by default). Fails if the id is taken.
    ///
    /// Auth: requires the organizer's signature.
    pub fn open_campaign(
        env: Env,
        organizer: Address,
        campaign_id: BytesN<32>,
        token: Address,
        goal: i128,
    ) -> Result<(), Error> {
        organizer.require_auth();
        if goal <= 0 {
            return Err(Error::InvalidGoal);
        }
        let key = DataKey::Campaign(campaign_id.clone());
        if env.storage().persistent().has(&key) {
            return Err(Error::CampaignExists);
        }
        let campaign = Campaign {
            organizer: organizer.clone(),
            token: token.clone(),
            goal,
            raised: 0,
            balance: 0,
            disbursed: 0,
            donors: 0,
            spends: 0,
            status: CampaignStatus::Active,
        };
        save_campaign(&env, &key, &campaign);
        env.storage()
            .persistent()
            .set(&DataKey::Spends(campaign_id.clone()), &Vec::<SpendRecord>::new(&env));
        bump_entry(&env, &DataKey::Spends(campaign_id.clone()));
        bump_instance(&env);
        env.events()
            .publish((symbol_short!("open"), organizer), (campaign_id, token, goal));
        Ok(())
    }

    /// Donate `amount` of the campaign's token toward `campaign_id`, locking it in
    /// the contract. Tracks the campaign total and the donor's lifetime amount;
    /// increments the distinct-donor count on a wallet's first gift. Returns the
    /// new lifetime raised total.
    ///
    /// Auth: requires the donor's signature. The same authorization covers the
    /// inner SAC `transfer(donor -> contract)`.
    pub fn donate(
        env: Env,
        donor: Address,
        campaign_id: BytesN<32>,
        amount: i128,
    ) -> Result<i128, Error> {
        donor.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let key = DataKey::Campaign(campaign_id.clone());
        let mut campaign = env
            .storage()
            .persistent()
            .get::<_, Campaign>(&key)
            .ok_or(Error::CampaignNotFound)?;
        if campaign.status == CampaignStatus::Closed {
            return Err(Error::CampaignClosed);
        }

        // Pull the donation into the contract's custody.
        token::Client::new(&env, &campaign.token).transfer(
            &donor,
            &env.current_contract_address(),
            &amount,
        );

        // Per-donor lifetime accounting (+ distinct-donor count on first gift).
        let donor_key = DataKey::Donor(campaign_id.clone(), donor.clone());
        let prev: i128 = env.storage().persistent().get(&donor_key).unwrap_or(0);
        if prev == 0 {
            campaign.donors += 1;
        }
        env.storage().persistent().set(&donor_key, &(prev + amount));
        bump_entry(&env, &donor_key);

        campaign.raised += amount;
        campaign.balance += amount;
        save_campaign(&env, &key, &campaign);

        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalRaised)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalRaised, &(total + amount));
        bump_instance(&env);

        env.events().publish(
            (symbol_short!("donate"), donor),
            (campaign_id, amount, campaign.raised),
        );
        Ok(campaign.raised)
    }

    /// Disburse `amount` of the held balance to `recipient`, appending an
    /// immutable `SpendRecord` (recipient, amount, `memo` = sha256 of the payout
    /// note, ledger sequence) to the campaign's on-chain spend ledger. Returns
    /// the index of the new ledger entry.
    ///
    /// Auth: requires the campaign organizer's signature; cannot exceed the held
    /// balance.
    pub fn disburse(
        env: Env,
        organizer: Address,
        campaign_id: BytesN<32>,
        recipient: Address,
        amount: i128,
        memo: BytesN<32>,
    ) -> Result<u32, Error> {
        organizer.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let key = DataKey::Campaign(campaign_id.clone());
        let mut campaign = env
            .storage()
            .persistent()
            .get::<_, Campaign>(&key)
            .ok_or(Error::CampaignNotFound)?;
        if campaign.organizer != organizer {
            return Err(Error::Unauthorized);
        }
        if amount > campaign.balance {
            return Err(Error::InsufficientBalance);
        }

        // Pay out from the contract's custody to the recipient.
        token::Client::new(&env, &campaign.token).transfer(
            &env.current_contract_address(),
            &recipient,
            &amount,
        );

        let spends_key = DataKey::Spends(campaign_id.clone());
        let mut spends: Vec<SpendRecord> = env
            .storage()
            .persistent()
            .get(&spends_key)
            .unwrap_or_else(|| Vec::new(&env));
        let index = spends.len();
        spends.push_back(SpendRecord {
            recipient: recipient.clone(),
            amount,
            memo,
            ledger: env.ledger().sequence(),
        });
        env.storage().persistent().set(&spends_key, &spends);
        bump_entry(&env, &spends_key);

        campaign.balance -= amount;
        campaign.disbursed += amount;
        campaign.spends += 1;
        save_campaign(&env, &key, &campaign);
        bump_instance(&env);

        env.events().publish(
            (symbol_short!("disburse"), organizer),
            (campaign_id, recipient, amount),
        );
        Ok(index)
    }

    /// Close a campaign to new donations (the organizer can still disburse the
    /// remaining held balance afterward). Auth: campaign organizer.
    pub fn close_campaign(
        env: Env,
        organizer: Address,
        campaign_id: BytesN<32>,
    ) -> Result<(), Error> {
        organizer.require_auth();
        let key = DataKey::Campaign(campaign_id.clone());
        let mut campaign = env
            .storage()
            .persistent()
            .get::<_, Campaign>(&key)
            .ok_or(Error::CampaignNotFound)?;
        if campaign.organizer != organizer {
            return Err(Error::Unauthorized);
        }
        campaign.status = CampaignStatus::Closed;
        save_campaign(&env, &key, &campaign);
        bump_instance(&env);
        env.events()
            .publish((symbol_short!("close"), organizer), campaign_id);
        Ok(())
    }

    // --- Views -------------------------------------------------------------

    pub fn get_campaign(env: Env, campaign_id: BytesN<32>) -> Result<Campaign, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
            .ok_or(Error::CampaignNotFound)
    }

    pub fn raised(env: Env, campaign_id: BytesN<32>) -> i128 {
        env.storage()
            .persistent()
            .get::<_, Campaign>(&DataKey::Campaign(campaign_id))
            .map(|c| c.raised)
            .unwrap_or(0)
    }

    pub fn balance(env: Env, campaign_id: BytesN<32>) -> i128 {
        env.storage()
            .persistent()
            .get::<_, Campaign>(&DataKey::Campaign(campaign_id))
            .map(|c| c.balance)
            .unwrap_or(0)
    }

    pub fn donor_amount(env: Env, campaign_id: BytesN<32>, donor: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Donor(campaign_id, donor))
            .unwrap_or(0)
    }

    pub fn spend_count(env: Env, campaign_id: BytesN<32>) -> u32 {
        env.storage()
            .persistent()
            .get::<_, Vec<SpendRecord>>(&DataKey::Spends(campaign_id))
            .map(|v| v.len())
            .unwrap_or(0)
    }

    pub fn get_spends(env: Env, campaign_id: BytesN<32>) -> Vec<SpendRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::Spends(campaign_id))
            .unwrap_or_else(|| Vec::new(&env))
    }

    pub fn total_raised(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalRaised)
            .unwrap_or(0)
    }

    pub fn get_token(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Token)
            .ok_or(Error::NotInitialized)
    }

    pub fn get_admin(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
    }

    // --- Admin -------------------------------------------------------------

    pub fn set_admin(env: Env, new_admin: Address) -> Result<(), Error> {
        admin(&env)?.require_auth();
        env.storage().instance().set(&DataKey::Admin, &new_admin);
        bump_instance(&env);
        Ok(())
    }

    /// Replace the contract's own code (admin-gated). Enables shipping fixes
    /// without migrating campaign balances.
    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) -> Result<(), Error> {
        admin(&env)?.require_auth();
        env.deployer().update_current_contract_wasm(new_wasm_hash);
        Ok(())
    }
}

// --- Internal helpers ------------------------------------------------------

fn admin(env: &Env) -> Result<Address, Error> {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .ok_or(Error::NotInitialized)
}

fn save_campaign(env: &Env, key: &DataKey, campaign: &Campaign) {
    env.storage().persistent().set(key, campaign);
    env.storage()
        .persistent()
        .extend_ttl(key, ENTRY_LIFETIME_THRESHOLD, ENTRY_BUMP_AMOUNT);
}

fn bump_entry(env: &Env, key: &DataKey) {
    env.storage()
        .persistent()
        .extend_ttl(key, ENTRY_LIFETIME_THRESHOLD, ENTRY_BUMP_AMOUNT);
}

fn bump_instance(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
}
