import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const PAGE_SIZE = 5;

export async function GET(request: NextRequest) {
  const page = Math.max(1, parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const today = new Date();
  const in30 = new Date(today);
  in30.setDate(today.getDate() + 30);

  const { data, error, count } = await supabaseAdmin
    .from("leases")
    .select(
      "id, end_date, status, tenant_id, unit_id, monthly_rent, tenants(id, full_name), units(unit_number, properties(name))",
      { count: "exact" }
    )
    .in("status", ["active", "expiring_soon"])
    .lte("end_date", in30.toISOString().split("T")[0])
    .order("end_date", { ascending: true })
    .range(from, to);

  if (error) {
    console.error("[/api/dashboard/expiring-leases]", error);
    return NextResponse.json({ error: "Failed to fetch leases" }, { status: 500 });
  }

  return NextResponse.json({ leases: data ?? [], total: count ?? 0, page, pageSize: PAGE_SIZE });
}
