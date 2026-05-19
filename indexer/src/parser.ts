import type { StrkMessage, ProtocolAction } from './types.js';

const STRK_PREFIX = 'STRK';
const SEPARATOR = '|';
const VALID_ACTIONS: ProtocolAction[] = ['T', 'R', 'X', 'RT'];

export function parseOpReturn(data: Buffer): StrkMessage | null {
  const text = data.toString('utf8');
  const parts = text.split(SEPARATOR);

  if (parts[0] !== STRK_PREFIX) {
    return null;
  }

  const action = parts[1] as ProtocolAction;
  if (!VALID_ACTIONS.includes(action)) {
    return null;
  }

  switch (action) {
    case 'T': {
      if (parts.length < 4) return null;
      return {
        action: 'T',
        inscriptionId: parts[2],
        starknetAddress: parts[3],
      };
    }
    case 'R': {
      if (parts.length < 4) return null;
      return {
        action: 'R',
        inscriptionId: parts[2],
        newUtxo: parts[3],
      };
    }
    case 'X': {
      if (parts.length < 3) return null;
      return {
        action: 'X',
        inscriptionId: parts[2],
      };
    }
    case 'RT': {
      if (parts.length < 5) return null;
      return {
        action: 'RT',
        runeId: parts[2],
        amount: BigInt(parts[3]),
        starknetAddress: parts[4],
      };
    }
    default:
      return null;
  }
}
