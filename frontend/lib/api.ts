const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL || 'http://localhost:3001';

export interface TokenizedInscription {
  inscriptionId: string;
  btcUtxo: string;
  ownerAddress: string;
  starknetAddress: string;
  commitTxId: string;
  commitBlockHeight: number;
  status: 'active' | 'invalidated' | 'idle';
}

export async function fetchTokenized(): Promise<TokenizedInscription[]> {
  const res = await fetch(`${INDEXER_URL}/api/tokenized`);
  return res.json();
}

export async function fetchInscription(id: string): Promise<TokenizedInscription | null> {
  const res = await fetch(`${INDEXER_URL}/api/tokenized/${id}`);
  if (res.status === 404) return null;
  return res.json();
}
