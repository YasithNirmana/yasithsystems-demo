type Status =
  | "open" | "in_progress" | "resolved" | "closed"
  | "paid" | "pending" | "overdue"
  | "active" | "expiring_soon" | "expired" | "terminated"
  | "occupied" | "vacant" | "maintenance"
  | "sent" | "failed"
  | string;

const MAP: Record<string, { label: string; cls: string }> = {
  open:          { label: "Open",          cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  in_progress:   { label: "In Progress",   cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  resolved:      { label: "Resolved",      cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  closed:        { label: "Closed",        cls: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  paid:          { label: "Paid",          cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  pending:       { label: "Pending",       cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  overdue:       { label: "Overdue",       cls: "bg-red-500/10 text-red-400 border-red-500/20" },
  active:        { label: "Active",        cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  expiring_soon: { label: "Expiring Soon", cls: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  expired:       { label: "Expired",       cls: "bg-red-500/10 text-red-400 border-red-500/20" },
  terminated:    { label: "Terminated",    cls: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  occupied:      { label: "Occupied",      cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  vacant:        { label: "Vacant",        cls: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  maintenance:   { label: "Maintenance",   cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  sent:          { label: "Sent",          cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  failed:        { label: "Failed",        cls: "bg-red-500/10 text-red-400 border-red-500/20" },
};

export default function StatusBadge({ status }: { status: Status }) {
  const cfg = MAP[status] ?? { label: status, cls: "bg-slate-500/10 text-slate-400 border-slate-500/20" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
