import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const category = searchParams.get("category");

  let query = supabaseAdmin
    .from("maintenance_requests")
    .select(`
      *,
      units(unit_number, floor, properties(name)),
      tenants(full_name, email, phone)
    `)
    .order("created_at", { ascending: false });

  if (status && status !== "all") query = query.eq("status", status);
  if (priority && priority !== "all") query = query.eq("priority", priority);
  if (category && category !== "all") query = query.eq("category", category);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { unit_id, tenant_id, title, description, category, priority, assigned_to, ai_classified, technician_notes } = body;

  if (!title || !description) {
    return NextResponse.json({ error: "title and description are required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("maintenance_requests")
    .insert({ unit_id, tenant_id, title, description, category, priority, assigned_to, ai_classified: ai_classified ?? false, technician_notes })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
