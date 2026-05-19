import { createHash } from 'crypto';

export interface MerkleProof {
  path: string[];
  direction: boolean[];
  root: string;
}

function doubleSha256(data: Buffer): Buffer {
  const first = createHash('sha256').update(data).digest();
  return createHash('sha256').update(first).digest();
}

function hashPair(left: string, right: string): string {
  const leftBuf = Buffer.from(left, 'hex');
  const rightBuf = Buffer.from(right, 'hex');
  const combined = Buffer.concat([leftBuf, rightBuf]);
  return doubleSha256(combined).toString('hex');
}

export function computeMerkleRoot(txHashes: string[]): string {
  if (txHashes.length === 0) {
    throw new Error('empty tx list');
  }
  if (txHashes.length === 1) {
    return txHashes[0];
  }

  let level = [...txHashes];

  while (level.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : level[i];
      nextLevel.push(hashPair(left, right));
    }
    level = nextLevel;
  }

  return level[0];
}

export function generateMerkleProof(txHashes: string[], txIndex: number): MerkleProof {
  if (txHashes.length === 0) {
    throw new Error('empty tx list');
  }

  const root = computeMerkleRoot(txHashes);

  if (txHashes.length === 1) {
    return { path: [], direction: [], root };
  }

  const path: string[] = [];
  const direction: boolean[] = [];
  let level = [...txHashes];
  let index = txIndex;

  while (level.length > 1) {
    const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;
    const sibling = siblingIndex < level.length ? level[siblingIndex] : level[index];

    direction.push(index % 2 === 0);
    path.push(sibling);

    const nextLevel: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : level[i];
      nextLevel.push(hashPair(left, right));
    }
    level = nextLevel;
    index = Math.floor(index / 2);
  }

  return { path, direction, root };
}
