export function Footer() {
  return (
    <footer className="border-t border-zinc-800 px-6 py-6 mt-auto">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-orange-500">OrdinalSync</span>
          <span className="text-xs text-gray-600">Trustless Bitcoin Ordinals on Starknet</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="px-2 py-1 bg-zinc-900 rounded text-gray-400">Built on Starknet</span>
          <span className="px-2 py-1 bg-zinc-900 rounded text-gray-400">Powered by Cairo</span>
        </div>
      </div>
    </footer>
  );
}
