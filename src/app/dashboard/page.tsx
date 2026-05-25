"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import MetricCard from "@/components/MetricCard";
import type { DashboardMetrics, Lease } from "@/lib/types";
import { format, parseISO } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";

const COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#6b7280"];

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const [leasePage, setLeasePage] = useState(1);
  const [leasesResult, setLeasesResult] = useState<{ leases: Lease[]; total: number; page: number } | null>(null);
  const leasesLoading = leasesResult === null || leasesResult.page !== leasePage;

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => { setMetrics(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/dashboard/expiring-leases?page=${leasePage}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setLeasesResult(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [leasePage]);

  const maintenanceChartData = metrics
    ? [
        { name: "Open",        value: metrics.maintenanceRequests.open,       fill: "#3b82f6" },
        { name: "In Progress", value: metrics.maintenanceRequests.inProgress,  fill: "#f59e0b" },
        { name: "Resolved",    value: metrics.maintenanceRequests.resolved,    fill: "#10b981" },
      ]
    : [];

  const rentChartData = metrics
    ? [
        { name: "Collected", value: metrics.rentCollection.collected },
        { name: "Pending",   value: metrics.rentCollection.total - metrics.rentCollection.collected },
      ]
    : [];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar
          title="Property Operations Dashboard"
          subtitle="Smart Property Management — Demo"
        />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Metric cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <MetricCard
              loading={loading}
              title="Occupancy Rate"
              value={loading ? "—" : `${metrics?.occupancyRate}%`}
              subtitle={loading ? "" : `${metrics?.occupiedUnits} / ${metrics?.totalUnits} units`}
              accentColor="green"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
              }
            />
            <MetricCard
              loading={loading}
              title="Maintenance Requests"
              value={loading ? "—" : metrics?.maintenanceRequests.total ?? 0}
              subtitle={loading ? "" : `${metrics?.maintenanceRequests.open} open · ${metrics?.maintenanceRequests.inProgress} in progress`}
              accentColor="amber"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
                </svg>
              }
            />
            <MetricCard
              loading={loading}
              title="Rent Collection"
              value={loading ? "—" : `${metrics?.rentCollection.percentage}%`}
              subtitle={loading ? "" : `$${metrics?.rentCollection.collected.toLocaleString()} collected`}
              accentColor="blue"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
              }
            />
            <MetricCard
              loading={loading}
              title="Expiring Leases"
              value={loading ? "—" : metrics?.expiringLeases.next30Days ?? 0}
              subtitle={loading ? "" : `next 30 days · ${metrics?.expiringLeases.next60Days} in 60 days`}
              accentColor="red"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              }
            />
            <MetricCard
              loading={loading}
              title="Tenant Satisfaction"
              value={loading ? "—" : `${metrics?.tenantSatisfaction}/5`}
              subtitle="Based on survey responses"
              accentColor="violet"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              }
            />
            <MetricCard
              loading={loading}
              title="Pending Payments"
              value={loading ? "—" : metrics?.pendingPayments.count ?? 0}
              subtitle={loading ? "" : `$${metrics?.pendingPayments.amount.toLocaleString()} outstanding`}
              accentColor="red"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Maintenance bar chart */}
            <div className="card p-5">
              <h3 className="text-white font-semibold text-sm mb-1">Maintenance by Status</h3>
              <p className="text-slate-500 text-xs mb-4">Current ticket breakdown</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={maintenanceChartData} barSize={40}>
                  <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#f1f5f9" }}
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {maintenanceChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Rent collection pie */}
            <div className="card p-5">
              <h3 className="text-white font-semibold text-sm mb-1">Rent Collection</h3>
              <p className="text-slate-500 text-xs mb-4">Current month breakdown</p>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={rentChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#1e293b" />
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#f1f5f9" }}
                    formatter={(v) => [`$${Number(v).toLocaleString()}`, ""]}
                  />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-slate-400 text-xs">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expiring leases + pending payments tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Expiring leases */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-white font-semibold text-sm">Expiring Leases</h3>
                  <p className="text-slate-500 text-xs">Next 30 days</p>
                </div>
                <a href="/tenants" className="text-blue-400 text-xs hover:text-blue-300">View all →</a>
              </div>
              {leasesLoading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-10 rounded-lg bg-white/5 animate-pulse" />)}
                </div>
              ) : leasesResult?.leases.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-6">No leases expiring soon 🎉</p>
              ) : (() => {
                const now = new Date().getTime();
                const totalPages = Math.ceil((leasesResult?.total ?? 0) / 5);
                return (
                  <>
                    <div className="space-y-2">
                      {(leasesResult?.leases ?? []).map((lease) => {
                        const daysLeft = Math.ceil((new Date(lease.end_date).getTime() - now) / 86400000);
                        return (
                          <div key={lease.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                            <div>
                              <p className="text-white text-sm font-medium">{lease.tenants?.full_name ?? "—"}</p>
                              <p className="text-slate-500 text-xs">{lease.units?.properties?.name} · Unit {lease.units?.unit_number}</p>
                            </div>
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${daysLeft <= 15 ? "bg-red-500/10 text-red-400" : "bg-orange-500/10 text-orange-400"}`}>
                              {daysLeft}d left
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
                        <button
                          onClick={() => setLeasePage(p => p - 1)}
                          disabled={leasePage === 1}
                          className="text-xs text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          ← Prev
                        </button>
                        <span className="text-xs text-slate-500">
                          Page {leasePage} of {totalPages}
                        </span>
                        <button
                          onClick={() => setLeasePage(p => p + 1)}
                          disabled={leasePage >= totalPages}
                          className="text-xs text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          Next →
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Pending payments */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-white font-semibold text-sm">Pending / Overdue Payments</h3>
                  <p className="text-slate-500 text-xs">Action required</p>
                </div>
                <a href="/payments" className="text-blue-400 text-xs hover:text-blue-300">View all →</a>
              </div>
              {loading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-10 rounded-lg bg-white/5 animate-pulse" />)}
                </div>
              ) : (metrics?.pendingPayments.payments ?? []).length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-6">All payments up to date ✓</p>
              ) : (
                <div className="space-y-2">
                  {(metrics?.pendingPayments.payments ?? []).slice(0, 5).map((pmt: any) => (
                    <div key={pmt.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <div>
                        <p className="text-white text-sm font-medium">{pmt.tenants?.full_name ?? "—"}</p>
                        <p className="text-slate-500 text-xs">{pmt.tenants?.units?.properties?.name} · {pmt.month_label}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white text-sm font-semibold">${Number(pmt.amount).toLocaleString()}</p>
                        <span className={`text-xs ${pmt.status === "overdue" ? "text-red-400" : "text-amber-400"}`}>
                          {pmt.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
