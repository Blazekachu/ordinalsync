'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount } from '@starknet-react/core';
import { Contract } from 'starknet';
import {
  HEADER_VERIFIER_ADDRESS,
  HEADER_VERIFIER_ABI,
  ORDINAL_REGISTRY_ADDRESS,
  ORDINAL_REGISTRY_ABI,
  STARKSCAN_BASE,
} from '@/lib/contracts';
import { buildPocHeaderCalldata, buildPocTokenizeProof } from '@/lib/starknet';

const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL || 'http://localhost:3001';

type TxStep = 'idle' | 'submitting-header' | 'tokenizing' | 'posting-indexer' | 'success' | 'error';

export default function TokenizePage() {
  const { account, address, status: walletStatus } = useAccount();

  const [inscriptionId, setInscriptionId] = useState('');
  const [btcUtxo, setBtcUtxo] = useState('');
  const [ownerAddress, setOwnerAddress] = useState('');
  const [starknetAddress, setStarknetAddress] = useState('');
  const [step, setStep] = useState<TxStep>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [txHashes, setTxHashes] = useState<{ header?: string; tokenize?: string }>({});
  const [tokenizedId, setTokenizedId] = useState<string>('');

  // Auto-fill Starknet address from wallet
  useEffect(() => {
    if (address) {
      setStarknetAddress(address);
    }
  }, [address]);

  function validate(): string | null {
    if (!/^[a-f0-9]{64}i\d+$/.test(inscriptionId)) {
      return 'Inscription ID must be 64 hex chars + "i" + index (e.g. abc...defi0)';
    }
    if (!/^[a-f0-9]{64}:\d+$/.test(btcUtxo)) {
      return 'UTXO must be 64-char txid:vout (e.g. abc...def:0)';
    }
    if (!/^(bc1|tb1|bcrt1)[a-z0-9]{25,90}$/.test(ownerAddress)) {
      return 'BTC address must start with bc1, tb1, or bcrt1';
    }
    if (!starknetAddress || !/^0x[a-fA-F0-9]{1,64}$/.test(starknetAddress)) {
      return 'Invalid Starknet address';
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setTxHashes({});

    const error = validate();
    if (error) {
      setErrorMsg(error);
      return;
    }

    if (!account) {
      setErrorMsg('Please connect your Starknet wallet first.');
      return;
    }

    try {
      // Step 1: Submit PoC block header
      setStep('submitting-header');
      const headerContract = new Contract({
        abi: HEADER_VERIFIER_ABI as any[],
        address: HEADER_VERIFIER_ADDRESS,
        providerOrAccount: account,
      });
      const headerCalldata = buildPocHeaderCalldata();
      const headerTx = await headerContract.invoke('submit_header', [
        headerCalldata.header,
        headerCalldata.block_height,
      ]);
      await account.provider.waitForTransaction(headerTx.transaction_hash);
      setTxHashes((prev) => ({ ...prev, header: headerTx.transaction_hash }));

      // Step 2: Tokenize
      setStep('tokenizing');
      const registryContract = new Contract({
        abi: ORDINAL_REGISTRY_ABI as any[],
        address: ORDINAL_REGISTRY_ADDRESS,
        providerOrAccount: account,
      });
      const proof = buildPocTokenizeProof(inscriptionId, btcUtxo, ownerAddress, starknetAddress);
      const tokenizeTx = await registryContract.invoke('tokenize', [proof]);
      await account.provider.waitForTransaction(tokenizeTx.transaction_hash);
      setTxHashes((prev) => ({ ...prev, tokenize: tokenizeTx.transaction_hash }));

      // Step 3: POST to indexer
      setStep('posting-indexer');
      await fetch(`${INDEXER_URL}/api/tokenized`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inscriptionId,
          btcUtxo,
          ownerAddress,
          starknetAddress,
          commitTxId: tokenizeTx.transaction_hash,
          commitBlockHeight: 1,
          status: 'active',
        }),
      }).catch(() => {
        // Indexer POST is best-effort — don't fail the flow
        console.warn('Failed to POST to indexer — on-chain state is the source of truth');
      });

      setTokenizedId(inscriptionId);
      setStep('success');
      setInscriptionId('');
      setBtcUtxo('');
      setOwnerAddress('');
    } catch (err: any) {
      setStep('error');
      setErrorMsg(err?.message || String(err));
    }
  }

  const isConnected = walletStatus === 'connected' && !!account;
  const isSubmitting = step !== 'idle' && step !== 'success' && step !== 'error';

  const stepLabel: Record<TxStep, string> = {
    idle: 'Tokenize',
    'submitting-header': 'Submitting header...',
    tokenizing: 'Tokenizing...',
    'posting-indexer': 'Recording...',
    success: 'Tokenize',
    error: 'Tokenize',
  };

  return (
    <main className="p-8">
      <Link href="/" className="text-orange-400 hover:underline text-sm">&larr; Back to Explorer</Link>

      <h1 className="text-3xl font-bold mt-6 mb-2">Tokenize Inscription</h1>
      <p className="text-gray-400 mb-6">
        Register a Bitcoin inscription for synthetic tokenization on Starknet.
      </p>

      {!isConnected && (
        <div className="bg-yellow-900/30 border border-yellow-700 text-yellow-300 text-sm rounded p-3 mb-6">
          Connect your Starknet wallet to tokenize inscriptions.
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <div>
          <label className="block text-xs text-gray-500 uppercase mb-1">Inscription ID</label>
          <input
            type="text"
            value={inscriptionId}
            onChange={(e) => setInscriptionId(e.target.value)}
            placeholder="abc675...i0"
            required
            disabled={!isConnected}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 font-mono text-sm focus:border-orange-500 focus:outline-none disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 uppercase mb-1">BTC UTXO (txid:vout)</label>
          <input
            type="text"
            value={btcUtxo}
            onChange={(e) => setBtcUtxo(e.target.value)}
            placeholder="abc123...def:0"
            required
            disabled={!isConnected}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 font-mono text-sm focus:border-orange-500 focus:outline-none disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 uppercase mb-1">Owner BTC Address</label>
          <input
            type="text"
            value={ownerAddress}
            onChange={(e) => setOwnerAddress(e.target.value)}
            placeholder="bc1q..."
            required
            disabled={!isConnected}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 font-mono text-sm focus:border-orange-500 focus:outline-none disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 uppercase mb-1">Starknet Address (auto-filled)</label>
          <input
            type="text"
            value={starknetAddress}
            readOnly
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 font-mono text-sm text-gray-400"
          />
        </div>

        <button
          type="submit"
          disabled={!isConnected || isSubmitting}
          className="bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-700 disabled:text-gray-500 text-white font-bold px-6 py-2 rounded transition-colors"
        >
          {stepLabel[step]}
        </button>
      </form>

      {step === 'success' && (
        <div className="mt-4 p-4 rounded bg-green-900/50 text-green-300 text-sm space-y-3">
          <p className="font-bold">Tokenization successful!</p>
          {txHashes.header && (
            <p>
              Header TX:{' '}
              <a
                href={`${STARKSCAN_BASE}/tx/${txHashes.header}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:underline font-mono"
              >
                {txHashes.header.slice(0, 10)}...{txHashes.header.slice(-6)}
              </a>
            </p>
          )}
          {txHashes.tokenize && (
            <p>
              Tokenize TX:{' '}
              <a
                href={`${STARKSCAN_BASE}/tx/${txHashes.tokenize}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:underline font-mono"
              >
                {txHashes.tokenize.slice(0, 10)}...{txHashes.tokenize.slice(-6)}
              </a>
            </p>
          )}
          {tokenizedId && (
            <div className="pt-2 border-t border-green-700/50">
              <Link
                href={`/inscription/${tokenizedId}`}
                className="inline-block bg-orange-600 hover:bg-orange-500 text-white font-bold px-4 py-2 rounded transition-colors"
              >
                View your token &rarr;
              </Link>
              <p className="text-xs text-green-400/70 mt-2">
                Your synthetic ordinal (token + on-chain registry entry) lives at the link above.
              </p>
            </div>
          )}
        </div>
      )}

      {errorMsg && (
        <div className="mt-4 p-3 rounded bg-red-900/50 text-red-300 text-sm">
          {errorMsg}
        </div>
      )}
    </main>
  );
}
