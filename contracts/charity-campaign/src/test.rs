#![cfg(test)]

use crate::types::CampaignStatus;
use crate::{CharityCampaign, CharityCampaignClient};

use soroban_sdk::testutils::Address as _;
use soroban_sdk::token::{Client as TokenClient, StellarAssetClient};
use soroban_sdk::{Address, BytesN, Env};

struct Setup<'a> {
    env: Env,
    client: CharityCampaignClient<'a>,
    contract: Address,
    token: Address,
    token_client: TokenClient<'a>,
    organizer: Address,
    donor: Address,
}

fn setup<'a>(donor_mint: i128) -> Setup<'a> {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let organizer = Address::generate(&env);
    let donor = Address::generate(&env);

    // Deploy a Stellar Asset Contract to stand in for the XLM SAC.
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token = sac.address();
    StellarAssetClient::new(&env, &token).mint(&donor, &donor_mint);

    let contract_id = env.register(CharityCampaign, ());
    let client = CharityCampaignClient::new(&env, &contract_id);
    client.initialize(&admin, &token);

    Setup {
        token_client: TokenClient::new(&env, &token),
        env,
        client,
        contract: contract_id,
        token,
        organizer,
        donor,
    }
}

fn id(env: &Env, tag: u8) -> BytesN<32> {
    BytesN::from_array(env, &[tag; 32])
}

fn memo(env: &Env, tag: u8) -> BytesN<32> {
    BytesN::from_array(env, &[tag; 32])
}

#[test]
fn initialize_records_admin_and_token() {
    let s = setup(1_000);
    assert_eq!(s.client.get_token(), s.token);
    assert_eq!(s.client.total_raised(), 0);
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")] // AlreadyInitialized
fn double_initialize_fails() {
    let s = setup(1_000);
    let admin2 = Address::generate(&s.env);
    s.client.initialize(&admin2, &s.token);
}

#[test]
fn open_campaign_records_organizer_and_goal() {
    let s = setup(1_000);
    let c = id(&s.env, 1);
    s.client.open_campaign(&s.organizer, &c, &s.token, &500);

    let campaign = s.client.get_campaign(&c);
    assert_eq!(campaign.organizer, s.organizer);
    assert_eq!(campaign.token, s.token);
    assert_eq!(campaign.goal, 500);
    assert_eq!(campaign.raised, 0);
    assert_eq!(campaign.balance, 0);
    assert_eq!(campaign.donors, 0);
    assert_eq!(campaign.status, CampaignStatus::Active);
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")] // CampaignExists
fn open_duplicate_campaign_fails() {
    let s = setup(1_000);
    let c = id(&s.env, 2);
    s.client.open_campaign(&s.organizer, &c, &s.token, &500);
    s.client.open_campaign(&s.organizer, &c, &s.token, &500);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")] // InvalidGoal
fn open_campaign_zero_goal_fails() {
    let s = setup(1_000);
    let c = id(&s.env, 3);
    s.client.open_campaign(&s.organizer, &c, &s.token, &0);
}

#[test]
fn donate_locks_funds_and_tracks_totals() {
    let s = setup(1_000);
    let c = id(&s.env, 4);
    s.client.open_campaign(&s.organizer, &c, &s.token, &500);

    let raised = s.client.donate(&s.donor, &c, &200);
    assert_eq!(raised, 200);

    // Donor debited, contract custodies the funds.
    assert_eq!(s.token_client.balance(&s.donor), 800);
    assert_eq!(s.token_client.balance(&s.contract), 200);

    let campaign = s.client.get_campaign(&c);
    assert_eq!(campaign.raised, 200);
    assert_eq!(campaign.balance, 200);
    assert_eq!(campaign.donors, 1);
    assert_eq!(s.client.donor_amount(&c, &s.donor), 200);
    assert_eq!(s.client.total_raised(), 200);
}

#[test]
fn multiple_donations_accumulate_distinct_donors() {
    let s = setup(1_000);
    let other = Address::generate(&s.env);
    StellarAssetClient::new(&s.env, &s.token).mint(&other, &1_000);
    let c = id(&s.env, 5);
    s.client.open_campaign(&s.organizer, &c, &s.token, &500);

    s.client.donate(&s.donor, &c, &100);
    s.client.donate(&s.donor, &c, &50); // same donor again — donors stays 1
    s.client.donate(&other, &c, &300);

    let campaign = s.client.get_campaign(&c);
    assert_eq!(campaign.raised, 450);
    assert_eq!(campaign.balance, 450);
    assert_eq!(campaign.donors, 2);
    assert_eq!(s.client.donor_amount(&c, &s.donor), 150);
    assert_eq!(s.client.donor_amount(&c, &other), 300);
    assert_eq!(s.client.total_raised(), 450);
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")] // InvalidAmount
fn donate_zero_amount_fails() {
    let s = setup(1_000);
    let c = id(&s.env, 6);
    s.client.open_campaign(&s.organizer, &c, &s.token, &500);
    s.client.donate(&s.donor, &c, &0);
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")] // CampaignNotFound
fn donate_to_unknown_campaign_fails() {
    let s = setup(1_000);
    let c = id(&s.env, 7);
    s.client.donate(&s.donor, &c, &50);
}

#[test]
fn disburse_pays_recipient_and_appends_ledger() {
    let s = setup(1_000);
    let recipient = Address::generate(&s.env);
    let c = id(&s.env, 8);
    s.client.open_campaign(&s.organizer, &c, &s.token, &500);
    s.client.donate(&s.donor, &c, &300);

    let idx = s.client.disburse(&s.organizer, &c, &recipient, &120, &memo(&s.env, 9));
    assert_eq!(idx, 0); // first ledger entry

    // Recipient received the funds; contract balance reduced.
    assert_eq!(s.token_client.balance(&recipient), 120);
    assert_eq!(s.token_client.balance(&s.contract), 180);

    let campaign = s.client.get_campaign(&c);
    assert_eq!(campaign.raised, 300); // lifetime raised unchanged
    assert_eq!(campaign.balance, 180);
    assert_eq!(campaign.disbursed, 120);
    assert_eq!(campaign.spends, 1);

    // Immutable on-chain spend ledger holds the entry.
    assert_eq!(s.client.spend_count(&c), 1);
    let spends = s.client.get_spends(&c);
    let record = spends.get(0).unwrap();
    assert_eq!(record.recipient, recipient);
    assert_eq!(record.amount, 120);
}

#[test]
#[should_panic(expected = "Error(Contract, #9)")] // InsufficientBalance
fn disburse_over_balance_fails() {
    let s = setup(1_000);
    let recipient = Address::generate(&s.env);
    let c = id(&s.env, 10);
    s.client.open_campaign(&s.organizer, &c, &s.token, &500);
    s.client.donate(&s.donor, &c, &100);
    s.client.disburse(&s.organizer, &c, &recipient, &101, &memo(&s.env, 1));
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")] // Unauthorized
fn disburse_by_non_organizer_fails() {
    let s = setup(1_000);
    let stranger = Address::generate(&s.env);
    let recipient = Address::generate(&s.env);
    let c = id(&s.env, 11);
    s.client.open_campaign(&s.organizer, &c, &s.token, &500);
    s.client.donate(&s.donor, &c, &100);
    // mock_all_auths lets `stranger` sign, but the contract rejects a non-organizer.
    s.client.disburse(&stranger, &c, &recipient, &50, &memo(&s.env, 1));
}

#[test]
fn close_campaign_blocks_new_donations_but_allows_disburse() {
    let s = setup(1_000);
    let recipient = Address::generate(&s.env);
    let c = id(&s.env, 12);
    s.client.open_campaign(&s.organizer, &c, &s.token, &500);
    s.client.donate(&s.donor, &c, &200);
    s.client.close_campaign(&s.organizer, &c);

    // Organizer can still pay out the held balance after closing.
    s.client.disburse(&s.organizer, &c, &recipient, &200, &memo(&s.env, 1));
    assert_eq!(s.token_client.balance(&recipient), 200);
    assert_eq!(s.client.get_campaign(&c).status, CampaignStatus::Closed);
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")] // CampaignClosed
fn donate_to_closed_campaign_fails() {
    let s = setup(1_000);
    let c = id(&s.env, 13);
    s.client.open_campaign(&s.organizer, &c, &s.token, &500);
    s.client.close_campaign(&s.organizer, &c);
    s.client.donate(&s.donor, &c, &50);
}

#[test]
fn campaigns_are_isolated() {
    let s = setup(1_000);
    let a = id(&s.env, 20);
    let b = id(&s.env, 21);
    s.client.open_campaign(&s.organizer, &a, &s.token, &500);
    s.client.open_campaign(&s.organizer, &b, &s.token, &500);

    s.client.donate(&s.donor, &a, &200);
    s.client.donate(&s.donor, &b, &50);

    assert_eq!(s.client.raised(&a), 200);
    assert_eq!(s.client.raised(&b), 50);
    assert_eq!(s.client.balance(&a), 200);
    assert_eq!(s.client.balance(&b), 50);
    assert_eq!(s.client.total_raised(), 250);
}
