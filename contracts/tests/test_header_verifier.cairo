use ordinalsync::header_verifier::{IHeaderVerifierDispatcher, IHeaderVerifierDispatcherTrait};
use ordinalsync::types::BlockHeader;
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait};

fn deploy_verifier() -> IHeaderVerifierDispatcher {
    let contract = declare("HeaderVerifier").unwrap().contract_class();
    let (contract_address, _) = contract.deploy(@array![]).unwrap();
    IHeaderVerifierDispatcher { contract_address }
}

#[test]
fn test_submit_and_verify_header() {
    let verifier = deploy_verifier();

    let header = BlockHeader {
        version: 0x20000000,
        prev_block_hash: 0x0,
        merkle_root: 0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890,
        timestamp: 1700000000,
        bits: 0x1d00ffff,
        nonce: 12345,
    };

    verifier.submit_header(header, 1_u64);
    let tip = verifier.get_chain_tip();
    assert(tip == 1_u64, 'chain tip should be 1');
}

#[test]
fn test_verify_tx_in_submitted_block() {
    let verifier = deploy_verifier();

    let merkle_root: u256 = 0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890;
    let header = BlockHeader {
        version: 0x20000000,
        prev_block_hash: 0x0,
        merkle_root,
        timestamp: 1700000000,
        bits: 0x1d00ffff,
        nonce: 12345,
    };

    verifier.submit_header(header, 1_u64);

    // Single-TX block: tx_hash == merkle_root
    let result = verifier.verify_tx_inclusion(merkle_root, array![], array![], 1_u64);
    assert(result == true, 'tx should be in block');
}

#[test]
fn test_reject_tx_for_unknown_block() {
    let verifier = deploy_verifier();

    let tx_hash: u256 = 0x1234;
    let result = verifier.verify_tx_inclusion(tx_hash, array![], array![], 999_u64);
    assert(result == false, 'unknown block should fail');
}
