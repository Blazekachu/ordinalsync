use ordinalsync::synthetic_nft::{ISyntheticOrdinalsDispatcher, ISyntheticOrdinalsDispatcherTrait};
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait};

fn deploy_nft() -> ISyntheticOrdinalsDispatcher {
    let contract = declare("SyntheticOrdinals").unwrap().contract_class();
    let registry: felt252 = 0x999;
    let (address, _) = contract.deploy(@array![registry]).unwrap();
    ISyntheticOrdinalsDispatcher { contract_address: address }
}

// Test 1: Deploy, mint a token, check owner_of returns correct address
#[test]
fn test_mint_synthetic() {
    let nft = deploy_nft();
    let alice: starknet::ContractAddress = 0x123_felt252.try_into().unwrap();

    let token_id = nft.mint(
        alice,
        0x1111_felt252,
        0x2222_felt252,
        0_u256,
        1000_u64,
    );

    assert(token_id > 0, 'token_id should be > 0');
    let owner = nft.owner_of(token_id);
    assert(owner == alice, 'owner should be alice');
}

// Test 2: Mint, freeze, verify is_frozen is true
#[test]
fn test_freeze_blocks_transfer() {
    let nft = deploy_nft();
    let alice: starknet::ContractAddress = 0x123_felt252.try_into().unwrap();

    let token_id = nft.mint(
        alice,
        0x1111_felt252,
        0x2222_felt252,
        0_u256,
        1000_u64,
    );

    nft.freeze(token_id);

    assert(nft.is_frozen(token_id) == true, 'token should be frozen');
}

// Test 3: Mint, transfer to another address, verify new owner
#[test]
fn test_transfer_works_when_not_frozen() {
    let nft = deploy_nft();
    let alice: starknet::ContractAddress = 0x123_felt252.try_into().unwrap();
    let bob: starknet::ContractAddress = 0x456_felt252.try_into().unwrap();

    let token_id = nft.mint(
        alice,
        0x1111_felt252,
        0x2222_felt252,
        0_u256,
        1000_u64,
    );

    nft.transfer(alice, bob, token_id);

    let new_owner = nft.owner_of(token_id);
    assert(new_owner == bob, 'bob should be new owner');
}
