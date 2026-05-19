'use client';

export function HowItWorks() {
  const steps = [
    {
      number: '1',
      title: 'Commit on Bitcoin',
      description: 'Broadcast an OP_RETURN transaction from the address holding your inscription.',
      icon: '₿',
    },
    {
      number: '2',
      title: 'Verify on Starknet',
      description: 'Cairo contracts verify the Bitcoin block header and merkle inclusion proof.',
      icon: '🔐',
    },
    {
      number: '3',
      title: 'Trade Synthetic',
      description: 'A synthetic ERC-721 is minted. Trade, lend, or fractionalize — instantly.',
      icon: '⚡',
    },
    {
      number: '4',
      title: 'Auto-Invalidation',
      description: 'If the inscription moves on Bitcoin without a recommit, the synthetic is frozen within seconds. No grace periods.',
      icon: '🛡️',
    },
  ];

  return (
    <section className="py-12 px-8 border-b border-zinc-800">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div key={step.number} className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center">
              <div className="text-3xl mb-3">{step.icon}</div>
              <div className="text-xs text-orange-500 font-bold uppercase mb-1">Step {step.number}</div>
              <h3 className="text-lg font-bold mb-2">{step.title}</h3>
              <p className="text-sm text-gray-400">{step.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-600">
            Collateral bonds make double-spending economically irrational. Future Bitcoin covenants (OP_CTV) will enable trustless locking.
          </p>
        </div>
      </div>
    </section>
  );
}
