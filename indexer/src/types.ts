export type ProtocolAction = 'T' | 'R' | 'X' | 'RT';

export interface StrkMessage {
  action: ProtocolAction;
  inscriptionId?: string;
  starknetAddress?: string;
  newUtxo?: string;
  runeId?: string;
  amount?: bigint;
}

export interface TokenizedInscription {
  inscriptionId: string;
  btcUtxo: string;
  ownerAddress: string;
  starknetAddress: string;
  commitTxId: string;
  commitBlockHeight: number;
  status: 'active' | 'invalidated' | 'idle';
}
