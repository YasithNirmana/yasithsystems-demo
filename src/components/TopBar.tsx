"use client";

interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function TopBar({ title, subtitle, actions }: TopBarProps) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-slate-950/80 backdrop-blur-sm flex-shrink-0">
      <div>
        <h1 className="text-white font-semibold text-base leading-tight">{title}</h1>
        {subtitle && <p className="text-slate-500 text-xs mt-0.5">{subtitle ?? dateStr}</p>}
      </div>
      <div className="flex items-center gap-4">
        {actions}
        <div className="text-slate-500 text-xs text-right hidden sm:block">
          <p className="text-slate-400">{dateStr}</p>
          <p className="text-emerald-400 font-medium">● Live Demo</p>
        </div>
      </div>
    </div>
  );
}
