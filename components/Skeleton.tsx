export function EmployeeCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card">
      <div className="skeleton h-11 w-11 shrink-0 rounded-full bg-slate-200" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3.5 w-2/3 rounded bg-slate-200" />
        <div className="skeleton h-3 w-1/2 rounded bg-slate-100" />
      </div>
      <div className="skeleton h-10 w-20 shrink-0 rounded-xl bg-slate-100" />
    </div>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <EmployeeCardSkeleton key={i} />
      ))}
    </div>
  );
}
