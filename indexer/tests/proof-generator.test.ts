import { describe, it, expect } from 'vitest';
import { computeMerkleRoot, generateMerkleProof } from '../src/proof-generator.js';

describe('computeMerkleRoot', () => {
  it('single tx hash is its own root', () => {
    const txHash = '0000000000000000000000000000000000000000000000000000000000000001';
    const root = computeMerkleRoot([txHash]);
    expect(root).toBe(txHash);
  });

  it('two tx hashes produce a deterministic root', () => {
    const tx1 = 'aaaa000000000000000000000000000000000000000000000000000000000001';
    const tx2 = 'bbbb000000000000000000000000000000000000000000000000000000000002';
    const root = computeMerkleRoot([tx1, tx2]);
    expect(root).not.toBe(tx1);
    expect(root).not.toBe(tx2);
    expect(root.length).toBe(64);
  });

  it('is deterministic (same input = same output)', () => {
    const tx1 = 'aaaa000000000000000000000000000000000000000000000000000000000001';
    const tx2 = 'bbbb000000000000000000000000000000000000000000000000000000000002';
    const root1 = computeMerkleRoot([tx1, tx2]);
    const root2 = computeMerkleRoot([tx1, tx2]);
    expect(root1).toBe(root2);
  });
});

describe('generateMerkleProof', () => {
  it('empty proof for single-tx block', () => {
    const txHash = '0000000000000000000000000000000000000000000000000000000000000001';
    const proof = generateMerkleProof([txHash], 0);
    expect(proof.path).toHaveLength(0);
    expect(proof.direction).toHaveLength(0);
    expect(proof.root).toBe(txHash);
  });

  it('generates valid proof for 2-tx block', () => {
    const tx1 = 'aaaa000000000000000000000000000000000000000000000000000000000001';
    const tx2 = 'bbbb000000000000000000000000000000000000000000000000000000000002';
    const txs = [tx1, tx2];

    const proof = generateMerkleProof(txs, 0);
    expect(proof.path).toHaveLength(1);
    expect(proof.path[0]).toBe(tx2);
    expect(proof.direction[0]).toBe(true);

    const root = computeMerkleRoot(txs);
    expect(proof.root).toBe(root);
  });

  it('generates valid proof for 4-tx block', () => {
    const txs = [
      'aaaa000000000000000000000000000000000000000000000000000000000001',
      'bbbb000000000000000000000000000000000000000000000000000000000002',
      'cccc000000000000000000000000000000000000000000000000000000000003',
      'dddd000000000000000000000000000000000000000000000000000000000004',
    ];

    const proof = generateMerkleProof(txs, 2);
    expect(proof.path).toHaveLength(2);
    const root = computeMerkleRoot(txs);
    expect(proof.root).toBe(root);
  });
});
