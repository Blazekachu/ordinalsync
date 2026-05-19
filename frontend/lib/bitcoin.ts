// Bitcoin TX building helpers — Phase 1 PoC stubs
// Real implementation will use scure-btc-signer to build actual Bitcoin transactions

export interface CommitTxResult {
  txHex: string;
  txId: string;
  opReturn: string;
}

/**
 * Build a TOKENIZE commit transaction.
 * Phase 1: Returns mock TX data. Real impl will construct:
 * - Input: UTXO from address holding the inscription
 * - Output: OP_RETURN "STRK|T|<inscriptionId>|<starknetAddress>"
 * - Output: change back to user
 */
export function buildCommitTx(inscriptionId: string, starknetAddress: string): CommitTxResult {
  const opReturn = `STRK|T|${inscriptionId}|${starknetAddress}`;
  return {
    txHex: `02000000...mock_commit_tx...${Date.now().toString(16)}`,
    txId: `mock_${inscriptionId.slice(0, 8)}_${Date.now().toString(16)}`,
    opReturn,
  };
}

/**
 * Build a RECOMMIT transaction (UTXO resize, same owner).
 * Phase 1: Returns mock TX data.
 */
export function buildRecommitTx(inscriptionId: string, newUtxo: string): CommitTxResult {
  const opReturn = `STRK|R|${inscriptionId}|${newUtxo}`;
  return {
    txHex: `02000000...mock_recommit_tx...${Date.now().toString(16)}`,
    txId: `mock_recommit_${Date.now().toString(16)}`,
    opReturn,
  };
}

/**
 * Build a RELEASE transaction (voluntary un-tokenize).
 * Phase 1: Returns mock TX data.
 */
export function buildReleaseTx(inscriptionId: string): CommitTxResult {
  const opReturn = `STRK|X|${inscriptionId}`;
  return {
    txHex: `02000000...mock_release_tx...${Date.now().toString(16)}`,
    txId: `mock_release_${Date.now().toString(16)}`,
    opReturn,
  };
}
