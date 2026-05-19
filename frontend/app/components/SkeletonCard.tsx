export function SkeletonCard() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-[150px] h-[150px] bg-zinc-800 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="h-4 bg-zinc-800 rounded w-3/4" />
          <div className="h-3 bg-zinc-800 rounded w-1/2" />
          <div className="h-3 bg-zinc-800 rounded w-2/3" />
        </div>
      </div>
    </div>
  );
}
