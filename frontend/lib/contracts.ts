// lib/contracts.ts — Contract addresses and ABIs for deployed Sepolia contracts
// ABIs extracted from contracts/target/release/*.contract_class.json

export const HEADER_VERIFIER_ADDRESS =
  '0x050f4ce210000ec235937da131fb71ce40d6afff0d16f642881405565c41c187';

export const ORDINAL_REGISTRY_ADDRESS =
  '0x05fa527701e55cc68a3b1db6bd9cd7f939c934e8eb138d564f90abff886f3294';

export const SYNTHETIC_ORDINALS_ADDRESS =
  '0x0742b64f6056c16f937d184e53a7829f9b8fcc9d64a5a1c666896234a0147898';

export const STARKSCAN_BASE = 'https://sepolia.starkscan.co';

// --- Shared type definitions used across ABIs ---

const U256_TYPE = {
  type: 'struct',
  name: 'core::integer::u256',
  members: [
    { name: 'low', type: 'core::integer::u128' },
    { name: 'high', type: 'core::integer::u128' },
  ],
} as const;

const BOOL_TYPE = {
  type: 'enum',
  name: 'core::bool',
  variants: [
    { name: 'False', type: '()' },
    { name: 'True', type: '()' },
  ],
} as const;

const BLOCK_HEADER_TYPE = {
  type: 'struct',
  name: 'ordinalsync::types::BlockHeader',
  members: [
    { name: 'version', type: 'core::integer::u32' },
    { name: 'prev_block_hash', type: 'core::integer::u256' },
    { name: 'merkle_root', type: 'core::integer::u256' },
    { name: 'timestamp', type: 'core::integer::u32' },
    { name: 'bits', type: 'core::integer::u32' },
    { name: 'nonce', type: 'core::integer::u32' },
  ],
} as const;

// --- HeaderVerifier ABI ---

export const HEADER_VERIFIER_ABI = [
  {
    type: 'impl',
    name: 'HeaderVerifierImpl',
    interface_name: 'ordinalsync::header_verifier::IHeaderVerifier',
  },
  U256_TYPE,
  BLOCK_HEADER_TYPE,
  BOOL_TYPE,
  {
    type: 'interface',
    name: 'ordinalsync::header_verifier::IHeaderVerifier',
    items: [
      {
        type: 'function',
        name: 'submit_header',
        inputs: [
          { name: 'header', type: 'ordinalsync::types::BlockHeader' },
          { name: 'block_height', type: 'core::integer::u64' },
        ],
        outputs: [],
        state_mutability: 'external',
      },
      {
        type: 'function',
        name: 'get_chain_tip',
        inputs: [],
        outputs: [{ type: 'core::integer::u64' }],
        state_mutability: 'view',
      },
      {
        type: 'function',
        name: 'get_merkle_root',
        inputs: [{ name: 'block_height', type: 'core::integer::u64' }],
        outputs: [{ type: 'core::integer::u256' }],
        state_mutability: 'view',
      },
      {
        type: 'function',
        name: 'verify_tx_inclusion',
        inputs: [
          { name: 'tx_hash', type: 'core::integer::u256' },
          { name: 'merkle_path', type: 'core::array::Array::<core::integer::u256>' },
          { name: 'merkle_direction', type: 'core::array::Array::<core::bool>' },
          { name: 'block_height', type: 'core::integer::u64' },
        ],
        outputs: [{ type: 'core::bool' }],
        state_mutability: 'view',
      },
    ],
  },
  {
    type: 'event',
    name: 'ordinalsync::header_verifier::HeaderVerifier::Event',
    kind: 'enum',
    variants: [],
  },
];

// --- OrdinalRegistry ABI ---

export const ORDINAL_REGISTRY_ABI = [
  {
    type: 'impl',
    name: 'OrdinalRegistryImpl',
    interface_name: 'ordinalsync::ordinal_registry::IOrdinalRegistry',
  },
  U256_TYPE,
  BOOL_TYPE,
  BLOCK_HEADER_TYPE,
  {
    type: 'struct',
    name: 'ordinalsync::types::TxInclusionProof',
    members: [
      { name: 'tx_hash', type: 'core::integer::u256' },
      { name: 'merkle_path', type: 'core::array::Array::<core::integer::u256>' },
      { name: 'merkle_direction', type: 'core::array::Array::<core::bool>' },
      { name: 'block_header', type: 'ordinalsync::types::BlockHeader' },
    ],
  },
  {
    type: 'struct',
    name: 'ordinalsync::types::TokenizeProof',
    members: [
      { name: 'inclusion_proof', type: 'ordinalsync::types::TxInclusionProof' },
      { name: 'inscription_id', type: 'core::felt252' },
      { name: 'btc_utxo', type: 'core::felt252' },
      { name: 'owner_btc_address', type: 'core::felt252' },
      { name: 'starknet_recipient', type: 'core::starknet::contract_address::ContractAddress' },
    ],
  },
  {
    type: 'struct',
    name: 'ordinalsync::types::SpentProof',
    members: [
      { name: 'spending_tx_inclusion', type: 'ordinalsync::types::TxInclusionProof' },
      { name: 'spent_utxo', type: 'core::felt252' },
      { name: 'inscription_id', type: 'core::felt252' },
      { name: 'has_recommit', type: 'core::bool' },
      { name: 'new_utxo', type: 'core::felt252' },
    ],
  },
  {
    type: 'enum',
    name: 'ordinalsync::types::Status',
    variants: [
      { name: 'Idle', type: '()' },
      { name: 'Active', type: '()' },
      { name: 'Invalidated', type: '()' },
    ],
  },
  {
    type: 'struct',
    name: 'ordinalsync::types::RegistryEntry',
    members: [
      { name: 'owner_starknet', type: 'core::starknet::contract_address::ContractAddress' },
      { name: 'btc_utxo', type: 'core::felt252' },
      { name: 'commit_block', type: 'core::integer::u64' },
      { name: 'status', type: 'ordinalsync::types::Status' },
      { name: 'synthetic_token_id', type: 'core::integer::u256' },
    ],
  },
  {
    type: 'interface',
    name: 'ordinalsync::ordinal_registry::IOrdinalRegistry',
    items: [
      {
        type: 'function',
        name: 'tokenize',
        inputs: [{ name: 'proof', type: 'ordinalsync::types::TokenizeProof' }],
        outputs: [{ type: 'core::integer::u256' }],
        state_mutability: 'external',
      },
      {
        type: 'function',
        name: 'invalidate',
        inputs: [{ name: 'proof', type: 'ordinalsync::types::SpentProof' }],
        outputs: [{ type: 'core::bool' }],
        state_mutability: 'external',
      },
      {
        type: 'function',
        name: 'recommit',
        inputs: [{ name: 'proof', type: 'ordinalsync::types::SpentProof' }],
        outputs: [{ type: 'core::bool' }],
        state_mutability: 'external',
      },
      {
        type: 'function',
        name: 'release',
        inputs: [{ name: 'inscription_id', type: 'core::felt252' }],
        outputs: [{ type: 'core::bool' }],
        state_mutability: 'external',
      },
      {
        type: 'function',
        name: 'get_status',
        inputs: [{ name: 'inscription_id', type: 'core::felt252' }],
        outputs: [{ type: 'ordinalsync::types::Status' }],
        state_mutability: 'view',
      },
      {
        type: 'function',
        name: 'get_entry',
        inputs: [{ name: 'inscription_id', type: 'core::felt252' }],
        outputs: [{ type: 'ordinalsync::types::RegistryEntry' }],
        state_mutability: 'view',
      },
    ],
  },
  {
    type: 'constructor',
    name: 'constructor',
    inputs: [
      { name: 'header_verifier_address', type: 'core::starknet::contract_address::ContractAddress' },
    ],
  },
  {
    type: 'event',
    name: 'ordinalsync::ordinal_registry::OrdinalRegistry::Event',
    kind: 'enum',
    variants: [],
  },
];

// --- SyntheticOrdinals ABI (read-only from frontend) ---

export const SYNTHETIC_ORDINALS_ABI = [
  {
    type: 'impl',
    name: 'SyntheticOrdinalsImpl',
    interface_name: 'ordinalsync::synthetic_nft::ISyntheticOrdinals',
  },
  U256_TYPE,
  BOOL_TYPE,
  {
    type: 'interface',
    name: 'ordinalsync::synthetic_nft::ISyntheticOrdinals',
    items: [
      {
        type: 'function',
        name: 'owner_of',
        inputs: [{ name: 'token_id', type: 'core::integer::u256' }],
        outputs: [{ type: 'core::starknet::contract_address::ContractAddress' }],
        state_mutability: 'view',
      },
      {
        type: 'function',
        name: 'is_frozen',
        inputs: [{ name: 'token_id', type: 'core::integer::u256' }],
        outputs: [{ type: 'core::bool' }],
        state_mutability: 'view',
      },
      {
        type: 'function',
        name: 'get_inscription_id',
        inputs: [{ name: 'token_id', type: 'core::integer::u256' }],
        outputs: [{ type: 'core::felt252' }],
        state_mutability: 'view',
      },
    ],
  },
  {
    type: 'event',
    name: 'ordinalsync::synthetic_nft::SyntheticOrdinals::Event',
    kind: 'enum',
    variants: [],
  },
];
