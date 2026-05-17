"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import StatusBadge from "@/components/StatusBadge";
import type { Payment } from "@/lib/types";
import { format, parseISO } from "date-fns";

type FilterStatus = "all" | "paid" | "pending" | "overdue";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [marking, setMarking] = useState<string | null>(null);

  const fetch_ = async (f: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (f !== "all") params.set("status", f);
    const data = await fetch(`/api/payments?${params}`).then((r) => r.json());
    setPayments(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetch_(filter); }, [filter]);

  const markPaid = async (id: string) => {
    setMarking(id);
    await fetch("/api/payments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "paid" }),
    });
    fetch_(filter);
    setMarking(null);
  };

  const totals = {
    collected: payments.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0),
    pending: payments.filter((p) => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0),
    overdue: payments.filter((p) => p.status === "overdue").reduce((s, p) => s + Number(p.amount), 0),
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar title="Payments" subtitle="Rent collection tracking" />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Collected", amount: totals.collected, color: "text-emerald-400", bg: "bg-emerald-500/10" },
              { label: "Pending",   amount: totals.pending,   color: "text-amber-400",   bg: "bg-amber-500/10" },
              { label: "Overdue",   amount: totals.overdue,   color: "text-red-400",     bg: "bg-red-500/10" },
            ].map((s) => (
              <div key={s.label} className={`card p-4 ${s.bg}`}>
                <p className="text-slate-500 text-xs">{s.label}</p>
                <p className={`text-xl font-bold mt-1 ${s.color}`}>${s.amount.toLocaleString()}</p>
              </div>
            ))}
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-2">
            {(["all", "paid", "pending", "overdue"] as FilterStatus[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "text-slate-500 hover:text-slate-300"}`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Payments table */}
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
                    <th className="px-4 py-3 text-slate-500 font-medium text-xs">Property / Unit</th>
                    <th className="px-4 py-3 text-slate-500 font-medium text-xs">Period</th>
                    <th className="px-4 py-3 text-slate-500 font-medium text-xs">Amount</th>
                    <th className="px-4 py-3 text-slate-500 font-medium text-xs">Due Date</th>
                    <th className="px-4 py-3 text-slate-500 font-medium text-xs">Status</th>
                    <th className="px-4 py-3 text-slate-500 font-medium text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((pmt) => {
                    const t = pmt.tenants as any;
                    return (
                      <tr key={pmt.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-white font-medium">{t?.full_name ?? "—"}</p>
                          <p className="text-slate-500 text-xs">{t?.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-300 text-xs">{t?.units?.properties?.name}</p>
                          <p className="text-slate-500 text-xs">Unit {t?.units?.unit_number}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-xs">{pmt.month_label}</td>
                        <td className="px-4 py-3 text-white font-semibold">${Number(pmt.amount).toLocaleString()}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{format(parseISO(pmt.due_date), "dd MMM yyyy")}</td>
                        <td className="px-4 py-3"><StatusBadge status={pmt.status} /></td>
                        <td className="px-4 py-3">
                          {pmt.status !== "paid" && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => markPaid(pmt.id)}
                                disabled={marking === pmt.id}
                                className="text-xs px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors disabled:opacity-50"
                              >
                                {marking === pmt.id ? "..." : "✓ Mark Paid"}
                              </button>
                              <a href="/notifications" className="text-xs px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-colors">
                                📲 Remind
                              </a>
                            </div>
                          )}
                          {pmt.status === "paid" && pmt.paid_date && (
                            <p className="text-slate-600 text-xs">Paid {format(parseISO(pmt.paid_date), "dd MMM")}</p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {payments.length === 0 && (
                <div className="text-center py-10 text-slate-500 text-sm">No payments found</div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
