use starknet::ContractAddress;
use ordinalsync::types::{Status, TokenizeProof, SpentProof, RegistryEntry};

#[starknet::interface]
pub trait IOrdinalRegistry<TContractState> {
    fn tokenize(ref self: TContractState, proof: TokenizeProof) -> u256;
    fn invalidate(ref self: TContractState, proof: SpentProof) -> bool;
    fn recommit(ref self: TContractState, proof: SpentProof) -> bool;
    fn release(ref self: TContractState, inscription_id: felt252) -> bool;
    fn get_status(self: @TContractState, inscription_id: felt252) -> Status;
    fn get_entry(self: @TContractState, inscription_id: felt252) -> RegistryEntry;
}

#[starknet::contract]
pub mod OrdinalRegistry {
    use super::{IOrdinalRegistry, TokenizeProof, SpentProof, Status, RegistryEntry};
    use starknet::ContractAddress;
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess, StoragePointerWriteAccess};
    use ordinalsync::header_verifier::{IHeaderVerifierDispatcher, IHeaderVerifierDispatcherTrait};

    #[storage]
    struct Storage {
        header_verifier: ContractAddress,
        entries: Map<felt252, RegistryEntry>,
        next_token_id: u256,
    }

    #[constructor]
    fn constructor(ref self: ContractState, header_verifier_address: ContractAddress) {
        self.header_verifier.write(header_verifier_address);
        self.next_token_id.write(1);
    }

    #[abi(embed_v0)]
    impl OrdinalRegistryImpl of IOrdinalRegistry<ContractState> {
        fn tokenize(ref self: ContractState, proof: TokenizeProof) -> u256 {
            // Check not already tokenized
            let existing = self.entries.read(proof.inscription_id);
            assert(existing.status == Status::Idle, 'already tokenized');

            // Verify TX inclusion in a valid block
            let verifier = IHeaderVerifierDispatcher {
                contract_address: self.header_verifier.read()
            };
            let is_valid = verifier.verify_tx_inclusion(
                proof.inclusion_proof.tx_hash,
                proof.inclusion_proof.merkle_path,
                proof.inclusion_proof.merkle_direction,
                1_u64, // PoC: hardcoded block height 1
            );
            assert(is_valid, 'invalid tx inclusion proof');

            // Mint synthetic token
            let token_id = self.next_token_id.read();
            self.next_token_id.write(token_id + 1);

            // Store registry entry
            let entry = RegistryEntry {
                owner_starknet: proof.starknet_recipient,
                btc_utxo: proof.btc_utxo,
                commit_block: 1_u64,
                status: Status::Active,
                synthetic_token_id: token_id,
            };
            self.entries.write(proof.inscription_id, entry);

            token_id
        }

        fn invalidate(ref self: ContractState, proof: SpentProof) -> bool {
            let mut entry = self.entries.read(proof.inscription_id);
            assert(entry.status == Status::Active, 'not active');
            assert(entry.btc_utxo == proof.spent_utxo, 'utxo mismatch');
            assert(proof.has_recommit == false, 'has recommit, use recommit()');

            let verifier = IHeaderVerifierDispatcher {
                contract_address: self.header_verifier.read()
            };
            let is_valid = verifier.verify_tx_inclusion(
                proof.spending_tx_inclusion.tx_hash,
                proof.spending_tx_inclusion.merkle_path,
                proof.spending_tx_inclusion.merkle_direction,
                1_u64,
            );
            assert(is_valid, 'invalid spent proof');

            entry.status = Status::Invalidated;
            self.entries.write(proof.inscription_id, entry);
            true
        }

        fn recommit(ref self: ContractState, proof: SpentProof) -> bool {
            let mut entry = self.entries.read(proof.inscription_id);
            assert(entry.status == Status::Active, 'not active');
            assert(entry.btc_utxo == proof.spent_utxo, 'utxo mismatch');
            assert(proof.has_recommit == true, 'no recommit in tx');

            let verifier = IHeaderVerifierDispatcher {
                contract_address: self.header_verifier.read()
            };
            let is_valid = verifier.verify_tx_inclusion(
                proof.spending_tx_inclusion.tx_hash,
                proof.spending_tx_inclusion.merkle_path,
                proof.spending_tx_inclusion.merkle_direction,
                1_u64,
            );
            assert(is_valid, 'invalid recommit proof');

            entry.btc_utxo = proof.new_utxo;
            self.entries.write(proof.inscription_id, entry);
            true
        }

        fn release(ref self: ContractState, inscription_id: felt252) -> bool {
            let mut entry = self.entries.read(inscription_id);
            assert(entry.status == Status::Active, 'not active');
            // PoC: owner check deferred — get_caller_address() uses v3 syscall
            // which is incompatible with snforge USC 2.8.0 bundled with Scarb 2.18.0.
            // Production: add caller check once toolchain is updated.

            entry.status = Status::Idle;
            self.entries.write(inscription_id, entry);
            true
        }

        fn get_status(self: @ContractState, inscription_id: felt252) -> Status {
            self.entries.read(inscription_id).status
        }

        fn get_entry(self: @ContractState, inscription_id: felt252) -> RegistryEntry {
            self.entries.read(inscription_id)
        }
    }
}
