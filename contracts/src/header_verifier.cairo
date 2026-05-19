use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess, StoragePointerWriteAccess};
use ordinalsync::types::BlockHeader;
use ordinalsync::merkle::verify_merkle_proof;

#[starknet::interface]
pub trait IHeaderVerifier<TContractState> {
    fn submit_header(ref self: TContractState, header: BlockHeader, block_height: u64);
    fn get_chain_tip(self: @TContractState) -> u64;
    fn get_merkle_root(self: @TContractState, block_height: u64) -> u256;
    fn verify_tx_inclusion(
        self: @TContractState,
        tx_hash: u256,
        merkle_path: Array<u256>,
        merkle_direction: Array<bool>,
        block_height: u64,
    ) -> bool;
}

#[starknet::contract]
pub mod HeaderVerifier {
    use super::{IHeaderVerifier, BlockHeader, verify_merkle_proof};
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess, StoragePointerWriteAccess};

    #[storage]
    struct Storage {
        chain_tip: u64,
        merkle_roots: Map<u64, u256>,
    }

    #[abi(embed_v0)]
    impl HeaderVerifierImpl of IHeaderVerifier<ContractState> {
        fn submit_header(ref self: ContractState, header: BlockHeader, block_height: u64) {
            // PoC: Trust submitter. Production: verify PoW + chain continuity.
            self.merkle_roots.write(block_height, header.merkle_root);
            let current_tip = self.chain_tip.read();
            if block_height > current_tip {
                self.chain_tip.write(block_height);
            }
        }

        fn get_chain_tip(self: @ContractState) -> u64 {
            self.chain_tip.read()
        }

        fn get_merkle_root(self: @ContractState, block_height: u64) -> u256 {
            self.merkle_roots.read(block_height)
        }

        fn verify_tx_inclusion(
            self: @ContractState,
            tx_hash: u256,
            merkle_path: Array<u256>,
            merkle_direction: Array<bool>,
            block_height: u64,
        ) -> bool {
            let stored_root = self.merkle_roots.read(block_height);
            if stored_root == 0 {
                return false;
            }

            if merkle_path.len() == 0 {
                return tx_hash == stored_root;
            }

            verify_merkle_proof(tx_hash, merkle_path, merkle_direction, stored_root)
        }
    }
}
