import { NextRequest, NextResponse } from "next/server";
import { sendWhatsApp, NotificationTemplates } from "@/lib/twilio";
import { supabaseAdmin } from "@/lib/supabase";
import { aiChat } from "@/lib/ai";
import type { NotificationType } from "@/lib/types";

interface SendPayload {
  tenantId: string;
  type: NotificationType;
  customMessage?: string;
  // For templated messages
  amount?: number;
  dueDate?: string;
  daysOverdue?: number;
  unitNumber?: string;
  expiryDate?: string;
  daysLeft?: number;
  requestTitle?: string;
  requestStatus?: string;
  assignedTo?: string;
}

export async function POST(req: NextRequest) {
  const body: SendPayload = await req.json();
  const { tenantId, type, customMessage } = body;

  if (!tenantId || !type) {
    return NextResponse.json({ error: "tenantId and type are required" }, { status: 400 });
  }

  // Fetch tenant details
  const { data: tenant, error: tenantErr } = await supabaseAdmin
    .from("tenants")
    .select("full_name, whatsapp_number")
    .eq("id", tenantId)
    .single();

  if (tenantErr || !tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  if (!tenant.whatsapp_number) {
    return NextResponse.json({ error: "Tenant has no WhatsApp number configured" }, { status: 400 });
  }

  // Build message from template or custom
  let message = customMessage ?? "";
  if (!message) {
    try {
      let aiPrompt = "";
      if (type === "rent_reminder") {
        const isOverdue = body.daysOverdue && body.daysOverdue > 0;
        aiPrompt = `Write a friendly, professional WhatsApp notification to tenant ${tenant.full_name}.
Type of message: Rent Reminder.
${isOverdue ? `Rent is ${body.daysOverdue} days overdue. Amount: $${body.amount}.` : `Rent is due on ${body.dueDate}. Amount: $${body.amount}.`}
Include property management name "YasithSystems". Keep it concise (under 250 characters), warm, and include emojis. Respond ONLY with the message text, no quotes or metadata.`;
      } else if (type === "lease_expiry") {
        aiPrompt = `Write a friendly, professional WhatsApp notification to tenant ${tenant.full_name}.
Type of message: Lease Expiry.
Unit number: ${body.unitNumber}. Lease expires on ${body.expiryDate} (${body.daysLeft} days remaining).
Ask them to discuss renewal options. Include property management name "YasithSystems". Keep it concise (under 250 characters), warm, and include emojis. Respond ONLY with the message text, no quotes or metadata.`;
      } else if (type === "maintenance_update") {
        const assignedPart = body.assignedTo ? ` ${body.assignedTo} has been assigned.` : "";
        aiPrompt = `Write a friendly, professional WhatsApp notification to tenant ${tenant.full_name}.
Type of message: Maintenance Update.
Request title: "${body.requestTitle}". New status: "${body.requestStatus}".${assignedPart}
Include property management name "YasithSystems". Keep it concise (under 250 characters), warm, and include emojis. Respond ONLY with the message text, no quotes or metadata.`;
      }

      if (aiPrompt) {
        const aiResponse = await aiChat([
          { role: "system", content: "You are a professional property manager assistant. Write friendly WhatsApp messages." },
          { role: "user", content: aiPrompt }
        ]);
        message = aiResponse.trim();
        if (message.startsWith('"') && message.endsWith('"')) {
          message = message.substring(1, message.length - 1);
        }
      }
    } catch (aiErr) {
      console.error("AI notification generation failed, falling back to template:", aiErr);
    }

    if (!message) {
      switch (type) {
        case "rent_reminder":
          message = body.daysOverdue && body.daysOverdue > 0
            ? NotificationTemplates.rentOverdue(tenant.full_name, body.amount!, body.daysOverdue)
            : NotificationTemplates.rentReminder(tenant.full_name, body.amount!, body.dueDate!);
          break;
        case "lease_expiry":
          message = NotificationTemplates.leaseExpiry(tenant.full_name, body.unitNumber!, body.expiryDate!, body.daysLeft!);
          break;
        case "maintenance_update":
          message = NotificationTemplates.maintenanceUpdate(tenant.full_name, body.requestTitle!, body.requestStatus!, body.assignedTo);
          break;
        default:
          return NextResponse.json({ error: "customMessage required for type=custom" }, { status: 400 });
      }
    }
  }

  try {
    const { sid } = await sendWhatsApp(tenant.whatsapp_number, message);

    // Log the notification
    await supabaseAdmin.from("notification_logs").insert({
      tenant_id: tenantId,
      type,
      message,
      channel: "whatsapp",
      status: "sent",
    });

    return NextResponse.json({ success: true, sid, message });
  } catch (err) {
    console.error("[/api/notifications/send]", err);

    // Log failure
    await supabaseAdmin.from("notification_logs").insert({
      tenant_id: tenantId,
      type,
      message,
      channel: "whatsapp",
      status: "failed",
    });

    return NextResponse.json({ error: "Failed to send WhatsApp message", details: String(err) }, { status: 500 });
  }
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("notification_logs")
    .select("*, tenants(full_name)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
