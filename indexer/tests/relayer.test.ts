import { describe, it, expect, vi } from 'vitest';
import { Relayer } from '../src/relayer.js';
import type { TokenizedInscription } from '../src/types.js';

function makeInscription(id: string, utxo: string): TokenizedInscription {
  return {
    inscriptionId: id,
    btcUtxo: utxo,
    ownerAddress: 'bc1qtest',
    starknetAddress: '0x04abc',
    commitTxId: 'aaa111',
    commitBlockHeight: 800000,
    status: 'active',
  };
}

describe('Relayer', () => {
  it('invalidates when UTXO spent without recommit', () => {
    const store = new Map<string, TokenizedInscription>();
    store.set('insc1i0', makeInscription('insc1i0', 'abc:0'));

    const relayer = new Relayer(store);
    const onInvalidate = vi.fn();
    relayer.on('invalidate', onInvalidate);

    // Simulate block: abc:0 spent, no STRK|R in outputs
    const spentUtxos = new Map<string, Buffer[]>();
    spentUtxos.set('abc:0', [Buffer.from('some random output')]);

    relayer.checkBlock(spentUtxos);

    expect(store.get('insc1i0')!.status).toBe('invalidated');
    expect(onInvalidate).toHaveBeenCalledWith('insc1i0', undefined);
  });

  it('recommits when UTXO spent with STRK|R in same TX', () => {
    const store = new Map<string, TokenizedInscription>();
    store.set('insc2i0', makeInscription('insc2i0', 'def:1'));

    const relayer = new Relayer(store);
    const onRecommit = vi.fn();
    relayer.on('recommit', onRecommit);

    // Simulate block: def:1 spent, but TX contains STRK|R recommit
    const spentUtxos = new Map<string, Buffer[]>();
    spentUtxos.set('def:1', [
      Buffer.from('STRK|R|insc2i0|newutxo:0'),
    ]);

    relayer.checkBlock(spentUtxos);

    expect(store.get('insc2i0')!.status).toBe('active');
    expect(store.get('insc2i0')!.btcUtxo).toBe('newutxo:0');
    expect(onRecommit).toHaveBeenCalledWith('insc2i0', 'newutxo:0');
  });

  it('ignores non-active inscriptions', () => {
    const store = new Map<string, TokenizedInscription>();
    const insc = makeInscription('insc3i0', 'ghi:0');
    insc.status = 'invalidated';
    store.set('insc3i0', insc);

    const relayer = new Relayer(store);
    const onInvalidate = vi.fn();
    relayer.on('invalidate', onInvalidate);

    const spentUtxos = new Map<string, Buffer[]>();
    spentUtxos.set('ghi:0', [Buffer.from('no recommit')]);

    relayer.checkBlock(spentUtxos);

    expect(onInvalidate).not.toHaveBeenCalled();
    expect(store.get('insc3i0')!.status).toBe('invalidated');
  });

  it('ignores unspent UTXOs', () => {
    const store = new Map<string, TokenizedInscription>();
    store.set('insc4i0', makeInscription('insc4i0', 'jkl:0'));

    const relayer = new Relayer(store);
    const onInvalidate = vi.fn();
    relayer.on('invalidate', onInvalidate);

    // Empty block — no UTXOs spent
    relayer.checkBlock(new Map());

    expect(store.get('insc4i0')!.status).toBe('active');
    expect(onInvalidate).not.toHaveBeenCalled();
  });

  it('start and stop work without errors', () => {
    const store = new Map<string, TokenizedInscription>();
    const relayer = new Relayer(store);

    relayer.start(100);
    relayer.stop();
    // No error = pass
  });
});
