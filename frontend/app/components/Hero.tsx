'use client';

import Link from 'next/link';

export function Hero() {
  return (
    <section className="py-16 px-8 border-b border-zinc-800">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-5xl sm:text-6xl font-bold mb-4">
          Bitcoin Ordinals on{' '}
          <span className="text-orange-500">Starknet</span>
        </h1>
        <p className="text-lg text-gray-400 mb-8 max-w-xl mx-auto">
          Tokenize your inscriptions, runes, and rare sats trustlessly.
          No custody. No bridges. Your assets stay on Bitcoin.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/tokenize"
            className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-6 py-3 rounded-lg transition-colors"
          >
            Tokenize Inscription
          </Link>
          <a
            href="#explorer"
            className="border border-zinc-700 hover:border-zinc-500 text-gray-300 font-bold px-6 py-3 rounded-lg transition-colors"
          >
            Explore
          </a>
        </div>
      </div>
    </section>
  );
}
