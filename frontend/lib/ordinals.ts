// lib/ordinals.ts — URL helpers + metadata fetcher for Bitcoin ordinals data sources
// Primary: ordinals.com | Fallback: ordiscan CDN
// Future: swap to self-hosted ord server

const ORDINALS_BASE = 'https://ordinals.com';
const ORDISCAN_CDN = 'https://ord.cdn.ordiscan.com';

/** Raw inscription content URL (for iframe/img src) */
export function getContentUrl(inscriptionId: string): string {
  return `${ORDINALS_BASE}/content/${inscriptionId}`;
}

/** Fallback content URL via ordiscan CDN */
export function getContentFallbackUrl(inscriptionId: string): string {
  return `${ORDISCAN_CDN}/content/${inscriptionId}`;
}

/** Inscription detail page on ordinals.com (for "View on" links) */
export function getExplorerUrl(inscriptionId: string): string {
  return `${ORDINALS_BASE}/inscription/${inscriptionId}`;
}

/** Sat detail page on ordinals.com */
export function getSatUrl(satNumber: string): string {
  return `${ORDINALS_BASE}/sat/${satNumber}`;
}

/** Inscription metadata from ordinals.com JSON API */
export interface InscriptionMetadata {
  id: string;
  number: number;
  address: string;
  sat: number;
  satpoint: string;
  content_type: string;
  content_length: number;
  timestamp: number;
  height: number;
  fee: number;
  value: number;
  charms: string[];
  // Not returned by /r/inscription/<id> — optional.
  next?: string | null;
  previous?: string | null;
}

/**
 * Fetch inscription metadata from ordinals.com.
 *
 * Uses ord's recursive endpoint /r/inscription/<id>, which returns JSON
 * natively (200, application/json, CORS *). The older /inscription/<id>
 * with `Accept: application/json` now returns HTTP 406 — ordinals.com
 * dropped JSON from that route.
 */
export async function fetchInscriptionMetadata(
  inscriptionId: string,
): Promise<InscriptionMetadata | null> {
  try {
    const res = await fetch(`${ORDINALS_BASE}/r/inscription/${inscriptionId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
