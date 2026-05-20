'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { RpcProvider, Contract } from 'starknet';
import { useAccount } from '@starknet-react/core';
import { fetchInscription, TokenizedInscription } from '@/lib/api';
import {
  ORDINAL_REGISTRY_ADDRESS,
  ORDINAL_REGISTRY_ABI,
  STARKSCAN_BASE,
} from '@/lib/contracts';
import { decodeStatus } from '@/lib/starknet';
import { InscriptionViewer } from '@/app/components/InscriptionViewer';
import {
  getExplorerUrl,
  getSatUrl,
  fetchInscriptionMetadata,
  InscriptionMetadata,
} from '@/lib/ordinals';

const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL || 'http://localhost:3001';
const RPC_URL =
  process.env.NEXT_PUBLIC_STARKNET_RPC ||
  'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/demo';

interface OnChainEntry {
  ownerStarknet: string;
  btcUtxo: string;
  commitBlock: number;
  status: string;
  syntheticTokenId: string;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatSat(sat: number): string {
  return sat.toLocaleString();
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function InscriptionDetail() {
  const params = useParams();
  const id = params.id as string;
  const { account, address } = useAccount();

  const [inscription, setInscription] = useState<TokenizedInscription | null>(null);
  const [onChain, setOnChain] = useState<OnChainEntry | null>(null);
  const [meta, setMeta] = useState<InscriptionMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [metaLoading, setMetaLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [releaseResult, setReleaseResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!id) return;

    // Fetch from indexer
    fetchInscription(id)
      .then((data) => {
        if (!data) setNotFound(true);
        else setInscription(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Fetch on-chain entry
    const provider = new RpcProvider({ nodeUrl: RPC_URL });
    const registry = new Contract({
      abi: ORDINAL_REGISTRY_ABI as any[],
      address: ORDINAL_REGISTRY_ADDRESS,
      providerOrAccount: provider,
    });
    registry.call('get_entry', [id])
      .then((result: any) => {
        setOnChain({
          ownerStarknet: result.owner_starknet?.toString() || '0x0',
          btcUtxo: result.btc_utxo?.toString() || '0x0',
          commitBlock: Number(result.commit_block || 0),
          status: decodeStatus(result.status),
          syntheticTokenId: result.synthetic_token_id?.toString() || '0',
        });
      })
      .catch(() => {});

    // Fetch metadata from ordinals.com — slow; gates the L1 owner check
    fetchInscriptionMetadata(id)
      .then((data) => {
        if (data) setMeta(data);
      })
      .finally(() => setMetaLoading(false));
  }, [id]);

  async function handleRelease() {
    if (!account || !id) return;
    setReleasing(true);
    setReleaseResult(null);

    try {
      const registry = new Contract({
        abi: ORDINAL_REGISTRY_ABI as any[],
        address: ORDINAL_REGISTRY_ADDRESS,
        providerOrAccount: account,
      });
      const tx = await registry.invoke('release', [id]);
      await account.provider.waitForTransaction(tx.transaction_hash);

      await fetch(`${INDEXER_URL}/api/tokenized/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'idle' }),
      }).catch(() => {});

      setReleaseResult({
        success: true,
        message: `Released! TX: ${tx.transaction_hash}`,
      });

      if (inscription) setInscription({ ...inscription, status: 'idle' });
      if (onChain) setOnChain({ ...onChain, status: 'idle' });
    } catch (err: any) {
      setReleaseResult({
        success: false,
        message: err?.message || String(err),
      });
    } finally {
      setReleasing(false);
    }
  }

  if (loading) {
    return (
      <main className="p-8">
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

  if (notFound && !onChain && !meta) {
    return (
      <main className="p-8">
        <Link href="/" className="text-orange-400 hover:underline text-sm">&larr; Back</Link>
        <p className="text-red-400 mt-4">Inscription not found.</p>
      </main>
    );
  }

  // Owner mismatch detection: if the current Bitcoin owner (from ordinals.com)
  // doesn't match the owner who tokenized, the inscription moved on L1 — token is invalid
  const ownerMismatch = meta && inscription &&
    meta.address && inscription.ownerAddress &&
    meta.address.toLowerCase() !== inscription.ownerAddress.toLowerCase();

  // While the ordinals.com fetch is still in flight we can't yet know if the
  // L1 owner matches — show a neutral "verifying" state instead of flashing
  // "active" and then flipping to "invalidated" once the slow fetch lands.
  const verifyingL1 = metaLoading && !!inscription?.ownerAddress;

  const displayStatus = verifyingL1
    ? 'verifying'
    : ownerMismatch
    ? 'invalidated'
    : (onChain?.status || inscription?.status || 'idle');
  const statusColor = displayStatus === 'active'
    ? 'bg-green-900 text-green-300'
    : displayStatus === 'invalidated'
    ? 'bg-red-900 text-red-300'
    : displayStatus === 'verifying'
    ? 'bg-amber-900 text-amber-300'
    : 'bg-gray-800 text-gray-400';

  const isOwner = address && onChain?.ownerStarknet &&
    address.toLowerCase() === onChain.ownerStarknet.toLowerCase();
  const canRelease = isOwner && displayStatus === 'active';

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <Link href="/" className="text-orange-400 hover:underline text-sm">&larr; Back to Explorer</Link>

      <div className="mt-6">
        {/* Inscription content viewer */}
        <div className="mb-6">
          <InscriptionViewer inscriptionId={id} size="full" />
          <a
            href={getExplorerUrl(id)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-xs text-orange-400 hover:underline"
          >
            View on ordinals.com &rarr;
          </a>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold">
            {meta ? `Inscription #${meta.number}` : 'Inscription'}
          </h1>
          <span className={`px-2 py-1 rounded text-xs font-bold ${statusColor}`}>
            {displayStatus === 'verifying' ? 'VERIFYING L1 OWNER…' : displayStatus.toUpperCase()}
          </span>
        </div>

        {ownerMismatch && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-4">
            <p className="text-red-300 text-sm font-bold mb-1">Ownership Changed on Bitcoin L1</p>
            <p className="text-red-400 text-xs">
              The inscription has moved to a different address on Bitcoin. The current L1 owner
              (<span className="font-mono">{meta!.address.slice(0, 12)}...{meta!.address.slice(-6)}</span>)
              does not match the tokenization owner
              (<span className="font-mono">{inscription!.ownerAddress.slice(0, 12)}...{inscription!.ownerAddress.slice(-6)}</span>).
              This synthetic token is invalid — the auto-relayer will submit an invalidation proof.
            </p>
          </div>
        )}

        {/* Bitcoin Inscription Data (from ordinals.com) */}
        {meta && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4 mb-4">
            <h2 className="text-sm font-bold text-gray-400 uppercase">Bitcoin Inscription Data</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase">Inscription #</p>
                <p className="font-mono text-sm text-gray-200">{meta.number}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Content Type</p>
                <p className="font-mono text-sm text-gray-200">{meta.content_type}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Content Size</p>
                <p className="font-mono text-sm text-gray-200">{formatBytes(meta.content_length)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Sat Number</p>
                <a
                  href={getSatUrl(String(meta.sat))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-orange-400 hover:underline"
                >
                  {formatSat(meta.sat)}
                </a>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Inscription Date</p>
                <p className="font-mono text-sm text-gray-200">{formatDate(meta.timestamp)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Mined Block</p>
                <p className="font-mono text-sm text-gray-200">{meta.height.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Current Owner</p>
                <p className="font-mono text-sm text-gray-200 break-all">
                  {meta.address.slice(0, 12)}...{meta.address.slice(-6)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Output Value</p>
                <p className="font-mono text-sm text-gray-200">{meta.value.toLocaleString()} sats</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Fee</p>
                <p className="font-mono text-sm text-gray-200">{meta.fee.toLocaleString()} sats</p>
              </div>
            </div>
            {meta.charms.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 uppercase">Charms</p>
                <div className="flex gap-2 mt-1">
                  {meta.charms.map((charm) => (
                    <span key={charm} className="text-xs bg-orange-900/30 text-orange-300 px-2 py-1 rounded">
                      {charm}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Inscription ID */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4 mb-4">
          <div>
            <p className="text-xs text-gray-500 uppercase">Inscription ID</p>
            <p className="font-mono text-sm text-orange-400 break-all">{id}</p>
          </div>
          {meta && (
            <div>
              <p className="text-xs text-gray-500 uppercase">Satpoint</p>
              <p className="font-mono text-sm text-gray-200 break-all">{meta.satpoint}</p>
            </div>
          )}
        </div>

        {/* Tokenization Data (from indexer) */}
        {inscription && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4 mb-4">
            <h2 className="text-sm font-bold text-gray-400 uppercase">Tokenization Data</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase">BTC UTXO</p>
                <p className="font-mono text-sm text-gray-200 break-all">{inscription.btcUtxo || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Owner BTC Address</p>
                <p className="font-mono text-sm text-gray-200 break-all">{inscription.ownerAddress || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Starknet Address</p>
                <p className="font-mono text-sm text-gray-200 break-all">{inscription.starknetAddress || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Commit TX</p>
                <a
                  href={`${STARKSCAN_BASE}/tx/${inscription.commitTxId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-orange-400 hover:underline"
                >
                  {inscription.commitTxId.slice(0, 10)}...{inscription.commitTxId.slice(-6)}
                </a>
              </div>
            </div>
          </div>
        )}

        {/* On-chain Starknet Data */}
        {onChain && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4 mb-4">
            <h2 className="text-sm font-bold text-gray-400 uppercase">On-Chain (Starknet Sepolia)</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase">On-Chain Status</p>
                <p className="font-mono text-sm text-gray-200">{onChain.status}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Synthetic Token ID</p>
                <p className="font-mono text-sm text-gray-200">{onChain.syntheticTokenId}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">On-Chain Owner</p>
                <p className="font-mono text-sm text-gray-200 break-all">{onChain.ownerStarknet}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Commit Block</p>
                <p className="font-mono text-sm text-gray-200">{onChain.commitBlock}</p>
              </div>
            </div>
          </div>
        )}

        {/* Release button */}
        {canRelease && (
          <button
            onClick={handleRelease}
            disabled={releasing}
            className="mt-4 bg-red-700 hover:bg-red-600 disabled:bg-zinc-700 disabled:text-gray-500 text-white font-bold px-6 py-2 rounded transition-colors"
          >
            {releasing ? 'Releasing...' : 'Release Inscription'}
          </button>
        )}

        {releaseResult && (
          <div className={`mt-4 p-3 rounded text-sm ${
            releaseResult.success ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
          }`}>
            {releaseResult.message}
          </div>
        )}
      </div>
    </main>
  );
}
