"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import StatusBadge from "@/components/StatusBadge";
import type { Tenant } from "@/lib/types";
import { format, parseISO, differenceInDays } from "date-fns";

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Tenant | null>(null);

  useEffect(() => {
    fetch("/api/tenants")
      .then((r) => r.json())
      .then((d) => { setTenants(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  const filtered = tenants.filter((t) =>
    t.full_name.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar title="Tenants" subtitle={`${tenants.length} tenants across all properties`} />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Search */}
          <div className="relative mb-6 max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Table */}
          {loading ? (
            <div className="space-y-2">
              {[1,2,3,4,5].map(i => <div key={i} className="h-16 rounded-xl bg-white/[0.03] animate-pulse" />)}
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-left">
                    <th className="px-4 py-3 text-slate-500 font-medium text-xs">Tenant</th>
                    <th className="px-4 py-3 text-slate-500 font-medium text-xs">Unit</th>
                    <th className="px-4 py-3 text-slate-500 font-medium text-xs">Lease</th>
                    <th className="px-4 py-3 text-slate-500 font-medium text-xs">Current Payment</th>
                    <th className="px-4 py-3 text-slate-500 font-medium text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tenant, i) => {
                    const lease = (tenant as any).leases?.[0];
                    const payment = (tenant as any).payments?.[0];
                    const unit = tenant.units as any;
                    const daysLeft = lease ? differenceInDays(parseISO(lease.end_date), new Date()) : null;
                    return (
                      <tr
                        key={tenant.id}
                        className={`border-b border-white/[0.04] hover:bg-white/[0.02] cursor-pointer transition-colors ${i % 2 === 0 ? "" : ""}`}
                        onClick={() => setSelected(tenant)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold flex-shrink-0">
                              {tenant.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                            </div>
                            <div>
                              <p className="text-white font-medium">{tenant.full_name}</p>
                              <p className="text-slate-500 text-xs">{tenant.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {unit ? (
                            <div>
                              <p className="text-white text-xs font-medium">{unit.properties?.name}</p>
                              <p className="text-slate-500 text-xs">Unit {unit.unit_number} · {unit.bedrooms}BR</p>
                            </div>
                          ) : <span className="text-slate-600 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {lease ? (
                            <div>
                              <StatusBadge status={lease.status} />
                              <p className="text-slate-500 text-xs mt-1">
                                {daysLeft !== null && daysLeft >= 0 ? `${daysLeft}d left` : "Expired"}
                              </p>
                            </div>
                          ) : <span className="text-slate-600 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {payment ? (
                            <div className="flex items-center gap-2">
                              <StatusBadge status={payment.status} />
                              <span className="text-slate-400 text-xs">${Number(payment.amount).toLocaleString()}</span>
                            </div>
                          ) : <span className="text-slate-600 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <a
                              href="/notifications"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs px-2 py-1 rounded bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 transition-colors"
                            >
                              📲 Notify
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-10 text-slate-500 text-sm">No tenants found</div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Tenant detail drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end" onClick={() => setSelected(null)}>
          <div className="w-full max-w-sm bg-slate-900 border-l border-white/5 h-full overflow-y-auto p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold">Tenant Details</h2>
              <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white text-lg leading-none">✕</button>
            </div>
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xl font-bold">
                {selected.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </div>
              <div>
                <p className="text-white font-semibold text-base">{selected.full_name}</p>
                <p className="text-slate-500 text-xs">{selected.email}</p>
                <p className="text-slate-500 text-xs">{selected.phone}</p>
              </div>
            </div>
            {/* Unit */}
            {(selected.units as any) && (
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">Unit</p>
                <p className="text-white font-medium">{(selected.units as any).properties?.name} — Unit {(selected.units as any).unit_number}</p>
                <p className="text-slate-500 text-xs mt-1">{(selected.units as any).bedrooms} bed · ${Number((selected.units as any).monthly_rent).toLocaleString()}/mo</p>
              </div>
            )}
            {/* Leases */}
            {((selected as any).leases ?? []).length > 0 && (
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">Lease</p>
                {((selected as any).leases as any[]).map((l: any) => (
                  <div key={l.id}>
                    <StatusBadge status={l.status} />
                    <p className="text-slate-300 text-xs mt-1">
                      {format(parseISO(l.start_date), "dd MMM yyyy")} → {format(parseISO(l.end_date), "dd MMM yyyy")}
                    </p>
                    <p className="text-slate-500 text-xs">${Number(l.monthly_rent).toLocaleString()}/month</p>
                  </div>
                ))}
              </div>
            )}
            {/* Payments */}
            {((selected as any).payments ?? []).length > 0 && (
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">Recent Payments</p>
                <div className="space-y-2">
                  {((selected as any).payments as any[]).slice(0, 3).map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-white text-xs">{p.month_label}</p>
                        <p className="text-slate-500 text-xs">${Number(p.amount).toLocaleString()}</p>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
