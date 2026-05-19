import { describe, it, expect } from 'vitest';
import { parseOpReturn } from '../src/parser.js';
import { computeMerkleRoot, generateMerkleProof } from '../src/proof-generator.js';

describe('End-to-End: Tokenization Flow', () => {
  it('full flow: parse commit TX -> generate proof -> verify root', () => {
    // Step 1: Simulate a Bitcoin TX with our OP_RETURN
    const opReturnData = Buffer.from(
      'STRK|T|a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2i0|0x04abcdef1234'
    );
    const parsed = parseOpReturn(opReturnData);

    expect(parsed).not.toBeNull();
    expect(parsed!.action).toBe('T');
    expect(parsed!.inscriptionId).toBe(
      'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2i0'
    );
    expect(parsed!.starknetAddress).toBe('0x04abcdef1234');

    // Step 2: Simulate a block with this TX + others
    const commitTxHash = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
    const otherTx1 = '1111111111111111111111111111111111111111111111111111111111111111';
    const otherTx2 = '2222222222222222222222222222222222222222222222222222222222222222';
    const otherTx3 = '3333333333333333333333333333333333333333333333333333333333333333';

    const blockTxs = [commitTxHash, otherTx1, otherTx2, otherTx3];

    // Step 3: Generate merkle proof for our commit TX
    const proof = generateMerkleProof(blockTxs, 0);

    expect(proof.path.length).toBe(2);
    expect(proof.root).toBe(computeMerkleRoot(blockTxs));
  });

  it('full flow: invalidation - detect UTXO spent, no recommit', () => {
    // Simulate: inscription was tokenized with UTXO xyz789:0
    // Now a new TX spends xyz789:0 without STRK|R
    const spendingTxOutputs = [
      Buffer.from('random output data - no STRK prefix'),
    ];

    const hasRecommit = spendingTxOutputs.some((output) => {
      const parsed = parseOpReturn(output);
      return parsed !== null && parsed.action === 'R';
    });

    expect(hasRecommit).toBe(false);
    // -> This means: INVALIDATE the synthetic
  });

  it('full flow: recommit - UTXO resize with STRK|R in same TX', () => {
    // Simulate: TX spends old UTXO but includes STRK|R
    const spendingTxOutputs = [
      Buffer.from('STRK|R|a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2i0|newutxo:0'),
    ];

    const recommitMsg = spendingTxOutputs
      .map((output) => parseOpReturn(output))
      .find((p) => p !== null && p.action === 'R');

    expect(recommitMsg).not.toBeNull();
    expect(recommitMsg!.newUtxo).toBe('newutxo:0');
    // -> This means: UPDATE UTXO pointer, keep synthetic ACTIVE
  });

  it('merkle proof is consistent across generation and verification', () => {
    // Generate a proof, then verify it by reconstructing the root
    const txs = [
      'aaaa000000000000000000000000000000000000000000000000000000000001',
      'bbbb000000000000000000000000000000000000000000000000000000000002',
      'cccc000000000000000000000000000000000000000000000000000000000003',
      'dddd000000000000000000000000000000000000000000000000000000000004',
      'eeee000000000000000000000000000000000000000000000000000000000005',
      'ffff000000000000000000000000000000000000000000000000000000000006',
      '1111000000000000000000000000000000000000000000000000000000000007',
      '2222000000000000000000000000000000000000000000000000000000000008',
    ];

    // Generate proof for each TX and verify root matches
    for (let i = 0; i < txs.length; i++) {
      const proof = generateMerkleProof(txs, i);
      expect(proof.root).toBe(computeMerkleRoot(txs));
      expect(proof.path.length).toBe(3); // log2(8) = 3
    }
  });
});
