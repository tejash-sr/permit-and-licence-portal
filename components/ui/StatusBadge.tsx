const STYLES: Record<string, string> = {
  Submitted: "bg-slate-100 text-slate-700",
  "Under Review": "bg-amber-100 text-amber-800",
  "Pending Review": "bg-amber-100 text-amber-800",
  Approved: "bg-emerald-100 text-emerald-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-rose-100 text-rose-800",
  REJECTED: "bg-rose-100 text-rose-800",
  Conditional: "bg-sky-100 text-sky-800",
  CONDITIONAL: "bg-sky-100 text-sky-800",
  "Conditional Approval": "bg-sky-100 text-sky-800",
  Breached: "bg-rose-100 text-rose-800",
  Active: "bg-emerald-100 text-emerald-800",
  Suspended: "bg-slate-200 text-slate-600",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? "bg-slate-100 text-slate-700";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${style}`}>{status}</span>;
}
