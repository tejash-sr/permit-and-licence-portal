export function ConfidenceMeter({ value, status }: { value: number | null | undefined; status?: string }) {
  if (value === null || value === undefined) {
    return <span className="text-xs text-slate-400">Not scored yet</span>;
  }
  const pct = Math.round(value * (value <= 1 ? 100 : 1));
  const isApproved = status === "Approved" || status === "APPROVED" || status === "Active";
  const isRejected = status === "Rejected" || status === "REJECTED";
  
  const color = isApproved 
    ? "bg-emerald-500" 
    : isRejected 
      ? "bg-rose-500" 
      : pct >= 90 
        ? "bg-emerald-500" 
        : pct >= 60 
          ? "bg-amber-500" 
          : "bg-rose-500";

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
        <span>AI confidence</span>
        <span className="font-medium text-slate-700">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
