use starknet::ContractAddress;

// Status of a tokenized inscription
#[derive(Drop, Copy, Serde, starknet::Store, PartialEq)]
pub enum Status {
    #[default]
    Idle,
    Active,
    Invalidated,
}

// Bitcoin block header (80 bytes total on Bitcoin, stored as fields here)
#[derive(Drop, Copy, Serde)]
pub struct BlockHeader {
    pub version: u32,
    pub prev_block_hash: u256,
    pub merkle_root: u256,
    pub timestamp: u32,
    pub bits: u32,
    pub nonce: u32,
}

// A proof that a TX exists in a Bitcoin block
#[derive(Drop, Serde)]
pub struct TxInclusionProof {
    pub tx_hash: u256,
    pub merkle_path: Array<u256>,
    pub merkle_direction: Array<bool>,
    pub block_header: BlockHeader,
}

// The full proof package for tokenization
#[derive(Drop, Serde)]
pub struct TokenizeProof {
    pub inclusion_proof: TxInclusionProof,
    pub inscription_id: felt252,
    pub btc_utxo: felt252,
    pub owner_btc_address: felt252,
    pub starknet_recipient: ContractAddress,
}

// Proof that a UTXO was spent (for invalidation)
#[derive(Drop, Serde)]
pub struct SpentProof {
    pub spending_tx_inclusion: TxInclusionProof,
    pub spent_utxo: felt252,
    pub inscription_id: felt252,
    pub has_recommit: bool,
    pub new_utxo: felt252,
}

// Registry entry for a tokenized inscription
#[derive(Drop, Copy, Serde, starknet::Store)]
pub struct RegistryEntry {
    pub owner_starknet: ContractAddress,
    pub btc_utxo: felt252,
    pub commit_block: u64,
    pub status: Status,
    pub synthetic_token_id: u256,
}
