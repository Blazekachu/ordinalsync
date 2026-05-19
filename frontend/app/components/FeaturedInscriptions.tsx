'use client';

import { InscriptionViewer } from './InscriptionViewer';
import { getExplorerUrl } from '@/lib/ordinals';

// Well-known inscriptions for the empty-state showcase
// These render real content from ordinals.com
const FEATURED = [
  {
    id: '6fb976ab49dcec017f1e201e84395983204ae1a7c2abf7ced0a85d692e442799i0',
    label: 'Inscription #0',
  },
  {
    id: '26482871f33f1051f450f2da9af275794c0b5f1c61ebf35e4467fb42c2813403i0',
    label: 'Inscription #1',
  },
  {
    id: '9b4dab94f4b04866e678e4b2ef1cec70258ad3e82d67cff1a13e81aa2d36db14i0',
    label: 'Taproot Wizard',
  },
  {
    id: 'e44380e3be0af7e1a29c14e2e0408126ec43a6db5b425e3560a4bc901a1bee68i0',
    label: 'OMB #1',
  },
];

export function FeaturedInscriptions() {
  return (
    <div>
      <p className="text-sm text-gray-400 mb-4">
        No inscriptions tokenized yet. Here are some notable Bitcoin inscriptions you could tokenize:
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {FEATURED.map((item) => (
          <a
            key={item.id}
            href={getExplorerUrl(item.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="group"
          >
            <InscriptionViewer inscriptionId={item.id} size="thumbnail" />
            <p className="text-xs text-gray-500 group-hover:text-orange-400 mt-2 truncate transition-colors">
              {item.label}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}
