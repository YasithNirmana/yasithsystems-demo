import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { DashboardMetrics } from "@/lib/types";

export async function GET() {
  try {
    // Run all queries in parallel
    const [unitsRes, maintenanceRes, paymentsRes, leasesRes] = await Promise.all([
      supabaseAdmin.from("units").select("id, status, monthly_rent"),
      supabaseAdmin.from("maintenance_requests").select("id, status"),
      supabaseAdmin.from("payments").select("id, amount, status, due_date, paid_date, month_label, tenant_id, tenants(id, full_name, units(unit_number, properties(name)))"),
      supabaseAdmin
        .from("leases")
        .select("id, end_date, status, tenant_id, unit_id, monthly_rent, tenants(id, full_name), units(unit_number, properties(name))")
        .in("status", ["active", "expiring_soon"]),
    ]);

    if (unitsRes.error) throw unitsRes.error;
    if (maintenanceRes.error) throw maintenanceRes.error;
    if (paymentsRes.error) throw paymentsRes.error;
    if (leasesRes.error) throw leasesRes.error;

    const units = unitsRes.data ?? [];
    const maintenance = maintenanceRes.data ?? [];
    const payments = paymentsRes.data ?? [];
    const leases = leasesRes.data ?? [];

    // Occupancy
    const totalUnits = units.length;
    const occupiedUnits = units.filter((u) => u.status === "occupied").length;
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

    // Maintenance breakdown
    const maintenanceOpen = maintenance.filter((m) => m.status === "open").length;
    const maintenanceInProgress = maintenance.filter((m) => m.status === "in_progress").length;
    const maintenanceResolved = maintenance.filter((m) => m.status === "resolved").length;

    // Rent collection (current month)
    const now = new Date();
    const monthLabel = now.toLocaleString("en-AU", { month: "long", year: "numeric" });
    const currentMonthPayments = payments.filter((p) => p.month_label.trim() === monthLabel);
    const collected = currentMonthPayments.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
    const totalRent = currentMonthPayments.reduce((s, p) => s + Number(p.amount), 0);
    const collectionPct = totalRent > 0 ? Math.round((collected / totalRent) * 100) : 0;

    // Expiring leases (next 30 / 60 days)
    const today = new Date();
    const in30 = new Date(today); in30.setDate(today.getDate() + 30);
    const in60 = new Date(today); in60.setDate(today.getDate() + 60);
    const expiringIn30 = leases.filter((l) => new Date(l.end_date) <= in30);
    const expiringIn60 = leases.filter((l) => new Date(l.end_date) <= in60);

    // Pending / overdue payments
    const pendingPayments = payments.filter((p) => p.status === "pending" || p.status === "overdue");
    const pendingAmount = pendingPayments.reduce((s, p) => s + Number(p.amount), 0);

    // Tenant satisfaction (static demo score — replace with real survey data)
    const tenantSatisfaction = 4.2;

    const metrics: DashboardMetrics = {
      occupancyRate,
      totalUnits,
      occupiedUnits,
      maintenanceRequests: {
        total: maintenance.length,
        open: maintenanceOpen,
        inProgress: maintenanceInProgress,
        resolved: maintenanceResolved,
      },
      rentCollection: { collected, total: totalRent, percentage: collectionPct },
      expiringLeases: {
        next30Days: expiringIn30.length,
        next60Days: expiringIn60.length,
        leases: expiringIn30 as never,
      },
      tenantSatisfaction,
      pendingPayments: { count: pendingPayments.length, amount: pendingAmount, payments: pendingPayments as never },
    };

    return NextResponse.json(metrics);
  } catch (err) {
    console.error("[/api/dashboard]", err);
    return NextResponse.json({ error: "Failed to fetch dashboard metrics" }, { status: 500 });
  }
}
