type Priority = "low" | "medium" | "high" | "urgent";

const MAP: Record<Priority, { label: string; cls: string; dot: string }> = {
  low:    { label: "Low",    cls: "text-slate-400",  dot: "bg-slate-400" },
  medium: { label: "Medium", cls: "text-blue-400",   dot: "bg-blue-400" },
  high:   { label: "High",   cls: "text-orange-400", dot: "bg-orange-400" },
  urgent: { label: "Urgent", cls: "text-red-400",    dot: "bg-red-400" },
};

export default function PriorityBadge({ priority }: { priority: Priority }) {
  const cfg = MAP[priority] ?? MAP.medium;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
