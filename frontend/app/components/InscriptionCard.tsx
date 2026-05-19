'use client';

import Link from 'next/link';
import { InscriptionViewer } from './InscriptionViewer';

export interface InscriptionCardProps {
  inscriptionId: string;
  btcUtxo: string;
  status: 'active' | 'invalidated' | 'idle';
  starknetAddress: string;
  showPreview?: boolean;
  ownerVerified?: 'verified' | 'mismatch' | 'pending';
}

export function InscriptionCard({
  inscriptionId,
  btcUtxo,
  status,
  starknetAddress,
  showPreview = true,
  ownerVerified = 'pending',
}: InscriptionCardProps) {
  const truncated = inscriptionId.length > 20
    ? `${inscriptionId.slice(0, 10)}...${inscriptionId.slice(-6)}`
    : inscriptionId;

  const effectiveStatus = ownerVerified === 'mismatch' ? 'invalidated' : status;

  const statusColor = effectiveStatus === 'active'
    ? 'bg-green-900 text-green-300'
    : effectiveStatus === 'invalidated'
    ? 'bg-red-900 text-red-300'
    : 'bg-gray-800 text-gray-400';

  const statusLabel = ownerVerified === 'mismatch'
    ? 'OWNER CHANGED'
    : effectiveStatus.toUpperCase();

  const verifiedIcon = ownerVerified === 'verified'
    ? '✓ L1 Verified'
    : ownerVerified === 'mismatch'
    ? '✗ Owner Mismatch'
    : null;

  const verifiedColor = ownerVerified === 'verified'
    ? 'text-green-500'
    : 'text-red-400';

  return (
    <Link href={`/inscription/${inscriptionId}`}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-600 transition-colors cursor-pointer">
        <div className="flex items-center gap-4">
          {showPreview && (
            <InscriptionViewer inscriptionId={inscriptionId} size="thumbnail" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center">
              <p className="font-mono text-sm text-orange-400 truncate">{truncated}</p>
              <span className={`px-2 py-1 rounded text-xs font-bold flex-shrink-0 ${statusColor}`}>
                {statusLabel}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1 truncate">UTXO: {btcUtxo}</p>
            <p className="text-xs text-gray-500 truncate">Starknet: {starknetAddress.slice(0, 10)}...</p>
            {verifiedIcon && (
              <p className={`text-xs mt-1 ${verifiedColor}`}>{verifiedIcon}</p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
