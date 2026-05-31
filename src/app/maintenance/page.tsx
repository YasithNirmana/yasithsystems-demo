"use client";

import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";
import type { MaintenanceRequest, AIClassificationResult, Tenant } from "@/lib/types";
import { format, parseISO } from "date-fns";

type FilterStatus = "all" | "open" | "in_progress" | "resolved" | "closed";
type FilterPriority = "all" | "low" | "medium" | "high" | "urgent";

export default function MaintenancePage() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<FilterPriority>("all");
  const [showNewForm, setShowNewForm] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [classification, setClassification] = useState<AIClassificationResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    unit_id: "",
    tenant_id: "",
  });

  useEffect(() => {
    fetch("/api/tenants")
      .then((r) => r.json())
      .then((data) => setTenants(Array.isArray(data) ? data : []))
      .catch((e) => console.error("Error fetching tenants:", e));
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (priorityFilter !== "all") params.set("priority", priorityFilter);
    const data = await fetch(`/api/maintenance?${params}`).then((r) => r.json());
    setRequests(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [statusFilter, priorityFilter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const classify = async () => {
    if (!form.description.trim()) return;
    setClassifying(true);
    setClassification(null);
    try {
      const res = await fetch("/api/maintenance/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title, description: form.description }),
      });
      const data = await res.json();
      setClassification(data);
    } catch {
      alert("AI classifier unavailable. Check Ollama is running.");
    } finally {
      setClassifying(false);
    }
  };

  const submitRequest = async () => {
    if (!form.title || !form.description) return alert("Title and description are required");
    setSubmitting(true);
    await fetch("/api/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        category: classification?.category ?? "other",
        priority: classification?.priority ?? "medium",
        assigned_to: classification?.assignTo ?? null,
        ai_classified: !!classification,
        technician_notes: classification?.technicianNotes ?? null,
      }),
    });
    setForm({ title: "", description: "", unit_id: "", tenant_id: "" });
    setClassification(null);
    setShowNewForm(false);
    setSubmitting(false);
    fetchRequests();
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/maintenance/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchRequests();
  };

  const priorityColor: Record<string, string> = {
    urgent: "border-l-red-500",
    high: "border-l-orange-500",
    medium: "border-l-blue-500",
    low: "border-l-slate-600",
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar
          title="Maintenance Requests"
          subtitle="AI-classified · auto-assigned"
          actions={
            <button
              onClick={() => setShowNewForm(true)}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
            >
              + New Request
            </button>
          }
        />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-xs">Status:</span>
              {(["all", "open", "in_progress", "resolved", "closed"] as FilterStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === s ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "text-slate-500 hover:text-slate-300 border border-transparent"}`}
                >
                  {s === "all" ? "All" : s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-xs">Priority:</span>
              {(["all", "urgent", "high", "medium", "low"] as FilterPriority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${priorityFilter === p ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "text-slate-500 hover:text-slate-300 border border-transparent"}`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Request list */}
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl bg-white/[0.03] animate-pulse" />)}
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-16 text-slate-500">No maintenance requests found.</div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className={`card p-5 border-l-4 ${priorityColor[req.priority] ?? "border-l-slate-600"}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-white font-semibold text-sm">{req.title}</h3>
                        {req.ai_classified && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center gap-1">
                            ✦ AI
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-xs line-clamp-2 mb-2">{req.description}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span>{req.units?.properties?.name} · Unit {req.units?.unit_number}</span>
                        <span>•</span>
                        <span>{req.tenants?.full_name}</span>
                        {req.assigned_to && <><span>•</span><span className="text-blue-400">{req.assigned_to}</span></>}
                        <span>•</span>
                        <span className="capitalize bg-slate-800 px-1.5 py-0.5 rounded">{req.category}</span>
                        {req.technician_notes && (
                          <span className="text-slate-600 italic truncate max-w-xs" title={req.technician_notes}>
                            {req.technician_notes}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <PriorityBadge priority={req.priority} />
                      <StatusBadge status={req.status} />
                      {/* Quick status update */}
                      <select
                        className="mt-1 text-xs bg-slate-800 border border-white/10 rounded px-2 py-1 text-slate-300 cursor-pointer hover:border-white/20"
                        value={req.status}
                        onChange={(e) => updateStatus(req.id, e.target.value)}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-white/5 text-xs text-slate-600">
                    Submitted {format(parseISO(req.created_at), "dd MMM yyyy, h:mm a")}
                    {req.updated_at !== req.created_at && ` · Updated ${format(parseISO(req.updated_at), "dd MMM yyyy, h:mm a")}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* New request modal */}
      {showNewForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-white font-semibold">New Maintenance Request</h2>
                <p className="text-slate-500 text-xs mt-0.5">AI will auto-classify once you describe the issue</p>
              </div>
              <button onClick={() => { setShowNewForm(false); setClassification(null); }} className="text-slate-500 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-slate-400 text-xs font-medium block mb-1.5">Tenant & Unit (Optional)</label>
                <select
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50 cursor-pointer"
                  value={form.tenant_id}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const tenant = tenants.find((t) => t.id === selectedId);
                    setForm({
                      ...form,
                      tenant_id: selectedId,
                      unit_id: tenant?.unit_id || "",
                    });
                  }}
                >
                  <option value="">Select tenant...</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} {t.units ? `— Unit ${t.units.unit_number} (${t.units.properties?.name})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-xs font-medium block mb-1.5">Title</label>
                <input
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
                  placeholder="e.g. Air conditioning leaking in unit 12"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs font-medium block mb-1.5">Description</label>
                <textarea
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50 resize-none"
                  rows={3}
                  placeholder="Describe the issue in detail..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              {/* AI Classify button */}
              <button
                onClick={classify}
                disabled={classifying || !form.description.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-400 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {classifying ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
                    Classifying with AI...
                  </>
                ) : (
                  <>✦ AI Classify Issue</>
                )}
              </button>

              {/* Classification result */}
              {classification && (
                <div className="rounded-xl bg-violet-500/5 border border-violet-500/20 p-4 space-y-3">
                  <p className="text-violet-400 text-xs font-semibold uppercase tracking-wider">AI Classification Result</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-slate-500 text-xs">Category</p>
                      <p className="text-white font-medium capitalize">{classification.category}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Priority</p>
                      <p className={`font-medium capitalize ${classification.priority === "urgent" ? "text-red-400" : classification.priority === "high" ? "text-orange-400" : "text-blue-400"}`}>
                        {classification.priority}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Assign To</p>
                      <p className="text-white font-medium">{classification.assignTo}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Est. Resolution</p>
                      <p className="text-white font-medium">{classification.estimatedResolution}</p>
                    </div>
                  </div>
                  {classification.technicianNotes && (
                    <div className="pt-2 border-t border-white/5">
                      <p className="text-slate-500 text-xs">Technician Notes</p>
                      <p className="text-slate-300 text-sm mt-0.5">{classification.technicianNotes}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowNewForm(false); setClassification(null); }}
                  className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitRequest}
                  disabled={submitting || !form.title || !form.description}
                  className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
