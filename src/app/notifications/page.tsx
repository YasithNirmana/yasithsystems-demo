"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import StatusBadge from "@/components/StatusBadge";
import type { Tenant, NotificationLog } from "@/lib/types";
import { format, parseISO } from "date-fns";

const TEMPLATES = [
  { type: "rent_reminder",  label: "Rent Reminder",   icon: "💳", desc: "Upcoming or overdue rent payment" },
  { type: "lease_expiry",   label: "Lease Expiry",    icon: "📅", desc: "Lease expiring soon" },
  { type: "maintenance_update", label: "Maintenance Update", icon: "🔧", desc: "Request status changed" },
  { type: "custom",         label: "Custom Message",  icon: "✏️", desc: "Write your own message" },
];

export default function NotificationsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; error?: string; message?: string } | null>(null);

  const [form, setForm] = useState({
    tenantId: "",
    type: "rent_reminder",
    customMessage: "",
    amount: "",
    dueDate: "",
    unitNumber: "",
    expiryDate: "",
    daysLeft: "",
    requestTitle: "",
    requestStatus: "",
    assignedTo: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/tenants").then((r) => r.json()),
      fetch("/api/notifications/send").then((r) => r.json()),
    ]).then(([t, l]) => {
      setTenants(Array.isArray(t) ? t : []);
      setLogs(Array.isArray(l) ? l : []);
      setLoading(false);
    });
  }, []);

  const refetchLogs = async () => {
    const l = await fetch("/api/notifications/send").then((r) => r.json());
    setLogs(Array.isArray(l) ? l : []);
  };

  const send = async () => {
    if (!form.tenantId) return alert("Select a tenant");
    setSending(true);
    setResult(null);
    try {
      const body: Record<string, string | number | undefined> = {
        tenantId: form.tenantId,
        type: form.type,
        ...(form.customMessage ? { customMessage: form.customMessage } : {}),
        ...(form.amount ? { amount: Number(form.amount) } : {}),
        ...(form.dueDate ? { dueDate: form.dueDate } : {}),
        ...(form.unitNumber ? { unitNumber: form.unitNumber } : {}),
        ...(form.expiryDate ? { expiryDate: form.expiryDate } : {}),
        ...(form.daysLeft ? { daysLeft: Number(form.daysLeft) } : {}),
        ...(form.requestTitle ? { requestTitle: form.requestTitle } : {}),
        ...(form.requestStatus ? { requestStatus: form.requestStatus } : {}),
        ...(form.assignedTo ? { assignedTo: form.assignedTo } : {}),
      };
      const res = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setResult(data);
      if (data.success) refetchLogs();
    } finally {
      setSending(false);
    }
  };

  const selectedTenant = tenants.find((t) => t.id === form.tenantId);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar title="Automated Notifications" subtitle="WhatsApp via Twilio · Template-based" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compose panel */}
            <div className="card p-6 space-y-5">
              <div>
                <h2 className="text-white font-semibold text-sm mb-1">Send WhatsApp Notification</h2>
                <p className="text-slate-500 text-xs">Select tenant, choose template, send via Twilio</p>
              </div>

              {/* Tenant select */}
              <div>
                <label className="text-slate-400 text-xs font-medium block mb-1.5">Tenant</label>
                <select
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                  value={form.tenantId}
                  onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
                >
                  <option value="">Select a tenant...</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} {t.units ? `— Unit ${(t.units as any).unit_number}` : ""}
                    </option>
                  ))}
                </select>
                {selectedTenant?.whatsapp_number && (
                  <p className="text-slate-500 text-xs mt-1">📱 {selectedTenant.whatsapp_number}</p>
                )}
              </div>

              {/* Template type */}
              <div>
                <label className="text-slate-400 text-xs font-medium block mb-2">Notification Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.type}
                      onClick={() => setForm({ ...form, type: t.type })}
                      className={`p-3 rounded-xl text-left border transition-all ${form.type === t.type ? "bg-blue-500/15 border-blue-500/30 text-white" : "bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-white hover:border-white/10"}`}
                    >
                      <span className="text-lg">{t.icon}</span>
                      <p className="text-xs font-medium mt-1">{t.label}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic fields based on type */}
              {form.type === "rent_reminder" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 text-xs font-medium block mb-1.5">Amount ($)</label>
                    <input className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50" placeholder="2400" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs font-medium block mb-1.5">Due Date</label>
                    <input type="date" className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                  </div>
                </div>
              )}
              {form.type === "lease_expiry" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 text-xs font-medium block mb-1.5">Unit Number</label>
                    <input className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50" placeholder="101" value={form.unitNumber} onChange={(e) => setForm({ ...form, unitNumber: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs font-medium block mb-1.5">Days Remaining</label>
                    <input type="number" className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50" placeholder="22" value={form.daysLeft} onChange={(e) => setForm({ ...form, daysLeft: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-slate-400 text-xs font-medium block mb-1.5">Expiry Date</label>
                    <input type="date" className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
                  </div>
                </div>
              )}
              {form.type === "maintenance_update" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-slate-400 text-xs font-medium block mb-1.5">Request Title</label>
                    <input className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50" placeholder="Air conditioning leak" value={form.requestTitle} onChange={(e) => setForm({ ...form, requestTitle: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs font-medium block mb-1.5">New Status</label>
                    <select className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50" value={form.requestStatus} onChange={(e) => setForm({ ...form, requestStatus: e.target.value })}>
                      <option value="">Select...</option>
                      <option value="in progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs font-medium block mb-1.5">Assigned To</label>
                    <input className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50" placeholder="Mike Torres" value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} />
                  </div>
                </div>
              )}
              {form.type === "custom" && (
                <div>
                  <label className="text-slate-400 text-xs font-medium block mb-1.5">Custom Message</label>
                  <textarea
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50 resize-none"
                    rows={4}
                    placeholder="Type your message..."
                    value={form.customMessage}
                    onChange={(e) => setForm({ ...form, customMessage: e.target.value })}
                  />
                </div>
              )}

              {/* Result */}
              {result && (
                <div className={`p-3 rounded-xl text-sm ${result.success ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
                  {result.success ? (
                    <><strong>✓ Sent!</strong> <span className="text-emerald-300/70 text-xs block mt-0.5 break-all">{result.message}</span></>
                  ) : (
                    <><strong>✕ Failed:</strong> {result.error}</>
                  )}
                </div>
              )}

              <button
                onClick={send}
                disabled={sending || !form.tenantId}
                className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {sending ? (
                  <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Sending...</>
                ) : (
                  <><span>📲</span> Send WhatsApp</>
                )}
              </button>
            </div>

            {/* Notification log */}
            <div className="card p-6">
              <h2 className="text-white font-semibold text-sm mb-1">Notification History</h2>
              <p className="text-slate-500 text-xs mb-4">Last 50 notifications sent</p>
              {loading ? (
                <div className="space-y-3">
                  {[1,2,3,4].map(i => <div key={i} className="h-14 rounded-lg bg-white/5 animate-pulse" />)}
                </div>
              ) : logs.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">No notifications sent yet</p>
              ) : (
                <div className="space-y-2 overflow-y-auto max-h-[500px] pr-1">
                  {logs.map((log) => (
                    <div key={log.id} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-white text-xs font-medium">{(log as any).tenants?.full_name ?? "Unknown"}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 capitalize">{log.type.replace("_", " ")}</span>
                          </div>
                          <p className="text-slate-500 text-xs truncate">{log.message}</p>
                        </div>
                        <StatusBadge status={log.status} />
                      </div>
                      <p className="text-slate-600 text-[10px] mt-1">
                        {format(parseISO(log.created_at), "dd MMM yy, h:mm a")}
                      </p>
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
