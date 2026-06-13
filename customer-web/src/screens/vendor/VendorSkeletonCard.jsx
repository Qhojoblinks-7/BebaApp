export function VendorSkeletonCard() {
  return (
    <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5">
      <div className="h-48 rounded-[1.5rem] bg-slate-200 animate-pulse" />
      <div className="mt-4 h-6 w-3/4 rounded-full bg-slate-200 animate-pulse" />
      <div className="mt-2 h-4 w-1/3 rounded-full bg-slate-200 animate-pulse" />
      <div className="mt-4 space-y-2">
        <div className="h-4 w-full rounded-full bg-slate-200 animate-pulse" />
        <div className="h-4 w-5/6 rounded-full bg-slate-200 animate-pulse" />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <div className="h-12 rounded-2xl bg-slate-200 animate-pulse" />
        <div className="h-12 rounded-2xl bg-slate-200 animate-pulse" />
      </div>
    </article>
  )
}
