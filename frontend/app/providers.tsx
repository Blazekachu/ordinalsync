'use client';

import { ReactNode } from 'react';
import { sepolia } from '@starknet-react/chains';
import { StarknetConfig, jsonRpcProvider, InjectedConnector } from '@starknet-react/core';
import { Chain } from '@starknet-react/chains';

const RPC_URL =
  process.env.NEXT_PUBLIC_STARKNET_RPC ||
  'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/demo';

function rpc(_chain: Chain) {
  return { nodeUrl: RPC_URL };
}

const connectors = [
  new InjectedConnector({ options: { id: 'argentX' } }),
  new InjectedConnector({ options: { id: 'braavos' } }),
];

export function StarknetProvider({ children }: { children: ReactNode }) {
  return (
    <StarknetConfig
      chains={[sepolia]}
      provider={jsonRpcProvider({ rpc })}
      connectors={connectors}
    >
      {children}
    </StarknetConfig>
  );
}
