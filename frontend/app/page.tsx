'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RpcProvider, Contract } from 'starknet';
import { fetchTokenized, TokenizedInscription } from '@/lib/api';
import { InscriptionCard } from './components/InscriptionCard';
import { Hero } from './components/Hero';
import { HowItWorks } from './components/HowItWorks';
import { FeaturedInscriptions } from './components/FeaturedInscriptions';
import { SkeletonCard } from './components/SkeletonCard';
import {
  ORDINAL_REGISTRY_ADDRESS,
  ORDINAL_REGISTRY_ABI,
} from '@/lib/contracts';
import { decodeStatus } from '@/lib/starknet';
import { fetchInscriptionMetadata } from '@/lib/ordinals';

const RPC_URL =
  process.env.NEXT_PUBLIC_STARKNET_RPC ||
  'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/demo';

type OwnerVerification = 'verified' | 'mismatch' | 'pending';

export default function Home() {
  const [inscriptions, setInscriptions] = useState<TokenizedInscription[]>([]);
  const [onChainStatus, setOnChainStatus] = useState<Record<string, string>>({});
  const [ownerStatus, setOwnerStatus] = useState<Record<string, OwnerVerification>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTokenized()
      .then(async (data) => {
        setInscriptions(data);

        if (data.length > 0) {
          // Fetch on-chain status
          try {
            const provider = new RpcProvider({ nodeUrl: RPC_URL });
            const registry = new Contract({
              abi: ORDINAL_REGISTRY_ABI as any[],
              address: ORDINAL_REGISTRY_ADDRESS,
              providerOrAccount: provider,
            });
            const statuses: Record<string, string> = {};
            for (const insc of data) {
              try {
                const result = await registry.call('get_status', [insc.inscriptionId]);
                statuses[insc.inscriptionId] = decodeStatus(result as any);
              } catch {
                // Inscription not on-chain yet
              }
            }
            setOnChainStatus(statuses);
          } catch {
            // RPC error — indexer data only
          }

          // Verify L1 owners against ordinals.com
          const verifications: Record<string, OwnerVerification> = {};
          for (const insc of data) {
            try {
              const meta = await fetchInscriptionMetadata(insc.inscriptionId);
              if (meta && insc.ownerAddress) {
                verifications[insc.inscriptionId] =
                  meta.address.toLowerCase() === insc.ownerAddress.toLowerCase()
                    ? 'verified'
                    : 'mismatch';
              }
            } catch {
              // Can't verify — leave as pending
            }
          }
          setOwnerStatus(verifications);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Count with mismatch awareness
  const activeCount = inscriptions.filter(
    (i) => i.status === 'active' && ownerStatus[i.inscriptionId] !== 'mismatch'
  ).length;
  const invalidCount = inscriptions.filter(
    (i) => i.status === 'invalidated' || ownerStatus[i.inscriptionId] === 'mismatch'
  ).length;

  return (
    <main>
      <Hero />
      <HowItWorks />

      {/* Explorer Section */}
      <section id="explorer" className="py-12 px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Tokenized Inscriptions</h2>
            <Link
              href="/tokenize"
              className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-4 py-2 rounded text-sm transition-colors"
            >
              + Tokenize
            </Link>
          </div>

          {/* Stats */}
          <div className="flex gap-4 mb-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex-1">
              <p className="text-xs text-gray-500 uppercase">Active</p>
              <p className="text-2xl font-mono text-green-400">{activeCount}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex-1">
              <p className="text-xs text-gray-500 uppercase">Invalid</p>
              <p className="text-2xl font-mono text-red-400">{invalidCount}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex-1">
              <p className="text-xs text-gray-500 uppercase">Total</p>
              <p className="text-2xl font-mono">{inscriptions.length}</p>
            </div>
          </div>

          {/* Inscription List */}
          <div className="grid gap-4">
            {loading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : inscriptions.length === 0 ? (
              <FeaturedInscriptions />
            ) : (
              inscriptions.map((insc) => (
                <InscriptionCard
                  key={insc.inscriptionId}
                  inscriptionId={insc.inscriptionId}
                  btcUtxo={insc.btcUtxo}
                  status={insc.status}
                  starknetAddress={insc.starknetAddress}
                  ownerVerified={ownerStatus[insc.inscriptionId] || 'pending'}
                />
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
