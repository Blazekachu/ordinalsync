import { describe, it, expect } from 'vitest';
import { parseOpReturn } from '../src/parser.js';

describe('parseOpReturn', () => {
  it('parses TOKENIZE message', () => {
    const data = Buffer.from('STRK|T|abc675i0|0x0412deadbeef');
    const result = parseOpReturn(data);
    expect(result).not.toBeNull();
    expect(result!.action).toBe('T');
    expect(result!.inscriptionId).toBe('abc675i0');
    expect(result!.starknetAddress).toBe('0x0412deadbeef');
  });

  it('parses RECOMMIT message', () => {
    const data = Buffer.from('STRK|R|abc675i0|aaa222:0');
    const result = parseOpReturn(data);
    expect(result).not.toBeNull();
    expect(result!.action).toBe('R');
    expect(result!.inscriptionId).toBe('abc675i0');
    expect(result!.newUtxo).toBe('aaa222:0');
  });

  it('parses RELEASE message', () => {
    const data = Buffer.from('STRK|X|abc675i0');
    const result = parseOpReturn(data);
    expect(result).not.toBeNull();
    expect(result!.action).toBe('X');
    expect(result!.inscriptionId).toBe('abc675i0');
  });

  it('parses RUNE TOKENIZE message', () => {
    const data = Buffer.from('STRK|RT|840000:1|5000|0x0412deadbeef');
    const result = parseOpReturn(data);
    expect(result).not.toBeNull();
    expect(result!.action).toBe('RT');
    expect(result!.runeId).toBe('840000:1');
    expect(result!.amount).toBe(5000n);
    expect(result!.starknetAddress).toBe('0x0412deadbeef');
  });

  it('returns null for non-STRK OP_RETURN', () => {
    const data = Buffer.from('OMNI|something|else');
    const result = parseOpReturn(data);
    expect(result).toBeNull();
  });

  it('returns null for malformed STRK message', () => {
    const data = Buffer.from('STRK|Z|invalid');
    const result = parseOpReturn(data);
    expect(result).toBeNull();
  });
});
