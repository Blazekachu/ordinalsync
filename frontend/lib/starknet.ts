// lib/starknet.ts — PoC proof construction for Starknet contract calls
// Mirrors Cairo test patterns: hardcoded header, single-TX block, block height 1
//
// starknet.js Contract class uses the ABI to serialize these objects automatically.
// We return plain JS objects matching the Cairo struct shapes — the Contract handles
// felt252/u256/ContractAddress encoding via the ABI type definitions.

import { shortString } from 'starknet';

// PoC test block header — matches values in contracts/tests/test_ordinal_registry.cairo
const POC_MERKLE_ROOT =
  '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

const POC_BLOCK_HEADER = {
  version: 0x20000000,
  prev_block_hash: { low: 0, high: 0 },
  merkle_root: POC_MERKLE_ROOT,
  timestamp: 1700000000,
  bits: 0x1d00ffff,
  nonce: 12345,
};

const POC_BLOCK_HEIGHT = 1;

/**
 * Build the calldata for HeaderVerifier.submit_header().
 * Returns [header, block_height] matching the PoC test header.
 */
export function buildPocHeaderCalldata() {
  return {
    header: POC_BLOCK_HEADER,
    block_height: POC_BLOCK_HEIGHT,
  };
}

/**
 * Build the calldata for OrdinalRegistry.tokenize().
 * Returns a TokenizeProof matching the Cairo struct shape.
 *
 * PoC: tx_hash == merkle_root (single-TX block), empty merkle path.
 */
export function buildPocTokenizeProof(
  inscriptionId: string,
  btcUtxo: string,
  ownerBtcAddress: string,
  starknetRecipient: string,
) {
  // Convert ASCII strings to felt252 hex (short strings, max 31 chars)
  // For strings longer than 31 chars, truncate — PoC only
  const inscriptionFelt = stringToFelt(inscriptionId);
  const utxoFelt = stringToFelt(btcUtxo);
  const ownerFelt = stringToFelt(ownerBtcAddress);

  return {
    inclusion_proof: {
      tx_hash: POC_MERKLE_ROOT,
      merkle_path: [],
      merkle_direction: [],
      block_header: POC_BLOCK_HEADER,
    },
    inscription_id: inscriptionFelt,
    btc_utxo: utxoFelt,
    owner_btc_address: ownerFelt,
    starknet_recipient: starknetRecipient,
  };
}

/**
 * Convert a string to a felt252 hex value.
 * Cairo felt252 can hold up to 31 ASCII bytes.
 * For longer strings, we use the first 31 chars — acceptable for PoC.
 */
function stringToFelt(s: string): string {
  const truncated = s.slice(0, 31);
  return shortString.encodeShortString(truncated);
}

/**
 * Decode a felt252 status variant index to a status string.
 * Cairo enum `Status` variants: 0=Idle, 1=Active, 2=Invalidated
 */
export function decodeStatus(
  statusVariant: { variant: { Idle?: unknown; Active?: unknown; Invalidated?: unknown } } | number | bigint,
): 'idle' | 'active' | 'invalidated' {
  // starknet.js may return the enum as an object with a variant key or as a number
  if (typeof statusVariant === 'object' && statusVariant !== null && 'variant' in statusVariant) {
    const v = statusVariant.variant;
    if ('Active' in v) return 'active';
    if ('Invalidated' in v) return 'invalidated';
    return 'idle';
  }
  // If returned as activeVariant index (BigInt/number)
  const idx = Number(statusVariant);
  if (idx === 1) return 'active';
  if (idx === 2) return 'invalidated';
  return 'idle';
}
