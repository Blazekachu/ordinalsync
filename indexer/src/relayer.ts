import { parseOpReturn } from './parser.js';
import type { TokenizedInscription } from './types.js';

export type RelayerEvent = 'invalidate' | 'recommit';
export type RelayerCallback = (inscriptionId: string, detail?: string) => void;

export class Relayer {
  private inscriptions: Map<string, TokenizedInscription>;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private listeners: Map<RelayerEvent, RelayerCallback[]> = new Map();

  constructor(inscriptions: Map<string, TokenizedInscription>) {
    this.inscriptions = inscriptions;
  }

  on(event: RelayerEvent, callback: RelayerCallback): void {
    const existing = this.listeners.get(event) || [];
    existing.push(callback);
    this.listeners.set(event, existing);
  }

  private emit(event: RelayerEvent, inscriptionId: string, detail?: string): void {
    const callbacks = this.listeners.get(event) || [];
    for (const cb of callbacks) {
      cb(inscriptionId, detail);
    }
  }

  /**
   * Start polling loop (simulated for Phase 1 PoC).
   * In production, this would subscribe to new Bitcoin blocks via ZMQ or polling bitcoind.
   */
  start(intervalMs: number = 60_000): void {
    if (this.intervalId) return;
    console.log(`[Relayer] Started polling every ${intervalMs}ms`);
    this.intervalId = setInterval(() => {
      console.log(`[Relayer] Checking block... (${this.getActiveCount()} active inscriptions monitored)`);
    }, intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[Relayer] Stopped');
    }
  }

  /**
   * Check a simulated block for UTXO spends.
   * @param spentUtxos Map of UTXO (txid:vout) → array of output buffers from the spending TX.
   *                   Each output buffer may contain OP_RETURN data.
   */
  checkBlock(spentUtxos: Map<string, Buffer[]>): void {
    for (const [, inscription] of this.inscriptions) {
      if (inscription.status !== 'active') continue;

      const outputs = spentUtxos.get(inscription.btcUtxo);
      if (!outputs) continue;

      // UTXO was spent — check if there's a STRK|R recommit in the TX outputs
      const recommitMsg = outputs
        .map((buf) => parseOpReturn(buf))
        .find((msg) => msg !== null && msg.action === 'R' && msg.inscriptionId === inscription.inscriptionId);

      if (recommitMsg && recommitMsg.newUtxo) {
        // Recommit: update UTXO pointer, keep active
        inscription.btcUtxo = recommitMsg.newUtxo;
        this.emit('recommit', inscription.inscriptionId, recommitMsg.newUtxo);
      } else {
        // No recommit: invalidate
        inscription.status = 'invalidated';
        this.emit('invalidate', inscription.inscriptionId);
      }
    }
  }

  private getActiveCount(): number {
    let count = 0;
    for (const [, insc] of this.inscriptions) {
      if (insc.status === 'active') count++;
    }
    return count;
  }
}
