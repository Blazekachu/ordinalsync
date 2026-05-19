use starknet::ContractAddress;

#[starknet::interface]
pub trait ISyntheticOrdinals<TContractState> {
    fn mint(
        ref self: TContractState,
        to: ContractAddress,
        inscription_id: felt252,
        content_type: felt252,
        content_hash: u256,
        sat_number: u64,
    ) -> u256;
    fn freeze(ref self: TContractState, token_id: u256);
    fn unfreeze(ref self: TContractState, token_id: u256);
    fn burn(ref self: TContractState, token_id: u256);
    fn owner_of(self: @TContractState, token_id: u256) -> ContractAddress;
    fn is_frozen(self: @TContractState, token_id: u256) -> bool;
    fn get_inscription_id(self: @TContractState, token_id: u256) -> felt252;
    fn transfer(ref self: TContractState, from: ContractAddress, to: ContractAddress, token_id: u256);
}

#[starknet::contract]
pub mod SyntheticOrdinals {
    use super::ISyntheticOrdinals;
    use starknet::ContractAddress;
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess, StoragePointerWriteAccess};

    #[storage]
    struct Storage {
        registry: ContractAddress,
        next_token_id: u256,
        owners: Map<u256, ContractAddress>,
        frozen: Map<u256, bool>,
        inscription_ids: Map<u256, felt252>,
    }

    #[constructor]
    fn constructor(ref self: ContractState, registry_address: ContractAddress) {
        self.registry.write(registry_address);
        self.next_token_id.write(1);
    }

    #[abi(embed_v0)]
    impl SyntheticOrdinalsImpl of ISyntheticOrdinals<ContractState> {
        fn mint(
            ref self: ContractState,
            to: ContractAddress,
            inscription_id: felt252,
            content_type: felt252,
            content_hash: u256,
            sat_number: u64,
        ) -> u256 {
            // NOTE: In production, assert caller == registry. Skipped in PoC due to
            // get_caller_address syscall v3 issue with USC 2.8.0
            let token_id = self.next_token_id.read();
            self.next_token_id.write(token_id + 1);
            self.owners.write(token_id, to);
            self.inscription_ids.write(token_id, inscription_id);
            self.frozen.write(token_id, false);
            token_id
        }

        fn freeze(ref self: ContractState, token_id: u256) {
            self.frozen.write(token_id, true);
        }

        fn unfreeze(ref self: ContractState, token_id: u256) {
            self.frozen.write(token_id, false);
        }

        fn burn(ref self: ContractState, token_id: u256) {
            let zero: ContractAddress = 0_felt252.try_into().unwrap();
            self.owners.write(token_id, zero);
            self.frozen.write(token_id, false);
        }

        fn owner_of(self: @ContractState, token_id: u256) -> ContractAddress {
            self.owners.read(token_id)
        }

        fn is_frozen(self: @ContractState, token_id: u256) -> bool {
            self.frozen.read(token_id)
        }

        fn get_inscription_id(self: @ContractState, token_id: u256) -> felt252 {
            self.inscription_ids.read(token_id)
        }

        fn transfer(ref self: ContractState, from: ContractAddress, to: ContractAddress, token_id: u256) {
            assert(self.frozen.read(token_id) == false, 'token frozen');
            let owner = self.owners.read(token_id);
            assert(owner == from, 'not owner');
            self.owners.write(token_id, to);
        }
    }
}
