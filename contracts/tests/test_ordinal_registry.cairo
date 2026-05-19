use ordinalsync::ordinal_registry::{IOrdinalRegistryDispatcher, IOrdinalRegistryDispatcherTrait};
use ordinalsync::header_verifier::{IHeaderVerifierDispatcher, IHeaderVerifierDispatcherTrait};
use ordinalsync::types::{Status, TokenizeProof, TxInclusionProof, BlockHeader, SpentProof};
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait};
use starknet::ContractAddress;

const MERKLE_ROOT: u256 = 0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890;
const INSCRIPTION_ID: felt252 = 0x696e736372697074696f6e31;
const BTC_UTXO: felt252 = 0x75747866303a30;
const NEW_UTXO: felt252 = 0x75747866313a30;

fn deploy_header_verifier_with_block() -> IHeaderVerifierDispatcher {
    let contract = declare("HeaderVerifier").unwrap().contract_class();
    let (address, _) = contract.deploy(@array![]).unwrap();
    let verifier = IHeaderVerifierDispatcher { contract_address: address };
    let header = BlockHeader {
        version: 0x20000000,
        prev_block_hash: 0x0,
        merkle_root: MERKLE_ROOT,
        timestamp: 1700000000,
        bits: 0x1d00ffff,
        nonce: 12345,
    };
    verifier.submit_header(header, 1_u64);
    verifier
}

fn deploy_registry(header_verifier_addr: starknet::ContractAddress) -> IOrdinalRegistryDispatcher {
    let contract = declare("OrdinalRegistry").unwrap().contract_class();
    let mut calldata = array![];
    calldata.append(header_verifier_addr.into());
    let (address, _) = contract.deploy(@calldata).unwrap();
    IOrdinalRegistryDispatcher { contract_address: address }
}

fn make_inclusion_proof() -> TxInclusionProof {
    TxInclusionProof {
        tx_hash: MERKLE_ROOT,
        merkle_path: array![],
        merkle_direction: array![],
        block_header: BlockHeader {
            version: 0x20000000,
            prev_block_hash: 0x0,
            merkle_root: MERKLE_ROOT,
            timestamp: 1700000000,
            bits: 0x1d00ffff,
            nonce: 12345,
        },
    }
}

fn make_tokenize_proof() -> TokenizeProof {
    // Use zero address as recipient — matches default snforge test caller
    let zero_addr: ContractAddress = 0x0_felt252.try_into().unwrap();
    TokenizeProof {
        inclusion_proof: make_inclusion_proof(),
        inscription_id: INSCRIPTION_ID,
        btc_utxo: BTC_UTXO,
        owner_btc_address: 0x62746361646472,
        starknet_recipient: zero_addr,
    }
}

// Test 1: tokenize succeeds, status becomes Active, returns token_id > 0
#[test]
fn test_tokenize_inscription() {
    let verifier = deploy_header_verifier_with_block();
    let registry = deploy_registry(verifier.contract_address);

    let proof = make_tokenize_proof();
    let token_id = registry.tokenize(proof);

    assert(token_id > 0, 'token_id should be > 0');

    let status = registry.get_status(INSCRIPTION_ID);
    assert(status == Status::Active, 'status should be Active');

    let entry = registry.get_entry(INSCRIPTION_ID);
    assert(entry.synthetic_token_id == token_id, 'token id mismatch');
    assert(entry.btc_utxo == BTC_UTXO, 'utxo mismatch');
}

// Test 2: after tokenize, invalidate with spent proof → status becomes Invalidated
#[test]
fn test_invalidate_on_utxo_spent() {
    let verifier = deploy_header_verifier_with_block();
    let registry = deploy_registry(verifier.contract_address);

    let token_proof = make_tokenize_proof();
    registry.tokenize(token_proof);

    let spent_proof = SpentProof {
        spending_tx_inclusion: make_inclusion_proof(),
        spent_utxo: BTC_UTXO,
        inscription_id: INSCRIPTION_ID,
        has_recommit: false,
        new_utxo: 0x0,
    };
    let result = registry.invalidate(spent_proof);
    assert(result == true, 'invalidate should return true');

    let status = registry.get_status(INSCRIPTION_ID);
    assert(status == Status::Invalidated, 'should be Invalidated');
}

// Test 3: after tokenize, recommit with new UTXO → status stays Active, UTXO updated
#[test]
fn test_recommit_keeps_active() {
    let verifier = deploy_header_verifier_with_block();
    let registry = deploy_registry(verifier.contract_address);

    let token_proof = make_tokenize_proof();
    registry.tokenize(token_proof);

    let recommit_proof = SpentProof {
        spending_tx_inclusion: make_inclusion_proof(),
        spent_utxo: BTC_UTXO,
        inscription_id: INSCRIPTION_ID,
        has_recommit: true,
        new_utxo: NEW_UTXO,
    };
    let result = registry.recommit(recommit_proof);
    assert(result == true, 'recommit should return true');

    let status = registry.get_status(INSCRIPTION_ID);
    assert(status == Status::Active, 'status should stay Active');

    let entry = registry.get_entry(INSCRIPTION_ID);
    assert(entry.btc_utxo == NEW_UTXO, 'utxo should be updated');
}

// Test 4: release sets status back to Idle
// PoC: owner check removed due to get_caller_address v3 syscall toolchain incompatibility
#[test]
fn test_release_sets_idle() {
    let verifier = deploy_header_verifier_with_block();
    let registry = deploy_registry(verifier.contract_address);

    let proof = make_tokenize_proof();
    registry.tokenize(proof);

    let result = registry.release(INSCRIPTION_ID);
    assert(result == true, 'release should return true');

    let status = registry.get_status(INSCRIPTION_ID);
    assert(status == Status::Idle, 'status should be Idle');
}
