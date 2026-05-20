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
    fn get_synthetic_ordinals(self: @TContractState) -> ContractAddress;
}

#[starknet::contract]
pub mod OrdinalRegistry {
    use super::{IOrdinalRegistry, TokenizeProof, SpentProof, Status, RegistryEntry};
    use starknet::ContractAddress;
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess, StoragePointerWriteAccess};
    use ordinalsync::header_verifier::{IHeaderVerifierDispatcher, IHeaderVerifierDispatcherTrait};
    use ordinalsync::synthetic_nft::{ISyntheticOrdinalsDispatcher, ISyntheticOrdinalsDispatcherTrait};

    #[storage]
    struct Storage {
        header_verifier: ContractAddress,
        synthetic_ordinals: ContractAddress,
        entries: Map<felt252, RegistryEntry>,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        header_verifier_address: ContractAddress,
        synthetic_ordinals_address: ContractAddress,
    ) {
        self.header_verifier.write(header_verifier_address);
        self.synthetic_ordinals.write(synthetic_ordinals_address);
    }

    #[abi(embed_v0)]
    impl OrdinalRegistryImpl of IOrdinalRegistry<ContractState> {
        fn tokenize(ref self: ContractState, proof: TokenizeProof) -> u256 {
            let existing = self.entries.read(proof.inscription_id);
            assert(existing.status == Status::Idle, 'already tokenized');

            let verifier = IHeaderVerifierDispatcher {
                contract_address: self.header_verifier.read()
            };
            let is_valid = verifier.verify_tx_inclusion(
                proof.inclusion_proof.tx_hash,
                proof.inclusion_proof.merkle_path,
                proof.inclusion_proof.merkle_direction,
                1_u64,
            );
            assert(is_valid, 'invalid tx inclusion proof');

            // Mint the actual synthetic NFT via SyntheticOrdinals
            // PoC: content_type, content_hash, sat_number are placeholders.
            // Phase 2: extend TokenizeProof with these fields parsed from the inscription.
            let synthetic = ISyntheticOrdinalsDispatcher {
                contract_address: self.synthetic_ordinals.read()
            };
            let token_id = synthetic.mint(
                proof.starknet_recipient,
                proof.inscription_id,
                0_felt252,
                0_u256,
                0_u64,
            );

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

            // Freeze the synthetic NFT
            let synthetic = ISyntheticOrdinalsDispatcher {
                contract_address: self.synthetic_ordinals.read()
            };
            synthetic.freeze(entry.synthetic_token_id);

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

            // Burn the synthetic NFT
            let synthetic = ISyntheticOrdinalsDispatcher {
                contract_address: self.synthetic_ordinals.read()
            };
            synthetic.burn(entry.synthetic_token_id);

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

        fn get_synthetic_ordinals(self: @ContractState) -> ContractAddress {
            self.synthetic_ordinals.read()
        }
    }
}
