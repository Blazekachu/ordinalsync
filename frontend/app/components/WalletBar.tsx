'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from '@starknet-react/core';

export function WalletBar() {
  const { address, status } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const truncateAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  // Avoid hydration mismatch — connector names come from browser extensions
  if (!mounted) {
    return <div className="flex gap-2" />;
  }

  if (status === 'connected' && address) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs bg-orange-900/50 text-orange-300 px-2 py-1 rounded">
          Sepolia
        </span>
        <span className="font-mono text-sm text-gray-300">
          {truncateAddress(address)}
        </span>
        <button
          onClick={() => disconnect()}
          className="text-xs text-gray-500 hover:text-white transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {connectors.map((connector) => (
        <button
          key={connector.id}
          onClick={() => connect({ connector })}
          className="bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold px-4 py-2 rounded transition-colors"
        >
          Connect {connector.name || 'Wallet'}
        </button>
      ))}
    </div>
  );
}
