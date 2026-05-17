interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; label: string };
  icon: React.ReactNode;
  accentColor?: string;
  loading?: boolean;
}

export default function MetricCard({ title, value, subtitle, trend, icon, accentColor = "blue", loading }: MetricCardProps) {
  const accentMap: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-400",
    green: "bg-emerald-500/10 text-emerald-400",
    amber: "bg-amber-500/10 text-amber-400",
    red: "bg-red-500/10 text-red-400",
    violet: "bg-violet-500/10 text-violet-400",
    cyan: "bg-cyan-500/10 text-cyan-400",
  };

  if (loading) {
    return (
      <div className="card p-5 animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-lg bg-white/5" />
          <div className="w-16 h-4 rounded bg-white/5" />
        </div>
        <div className="w-24 h-7 rounded bg-white/5 mb-2" />
        <div className="w-32 h-4 rounded bg-white/5" />
      </div>
    );
  }

  return (
    <div className="card p-5 hover:border-white/10 transition-all duration-200 group">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accentMap[accentColor] ?? accentMap.blue}`}>
          {icon}
        </div>
        {trend && (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              trend.value >= 0
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm text-slate-400 leading-tight">{title}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}
