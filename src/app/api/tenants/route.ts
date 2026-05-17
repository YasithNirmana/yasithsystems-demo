import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select(`
      *,
      units(unit_number, floor, monthly_rent, status, properties(name, address)),
      leases(id, start_date, end_date, monthly_rent, status),
      payments(id, amount, status, due_date, month_label)
    `)
    .order("full_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
