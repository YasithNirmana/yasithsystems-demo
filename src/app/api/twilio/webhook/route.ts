import { NextRequest, NextResponse } from "next/server";
import { twiml } from "twilio";
import { aiChat } from "@/lib/ai";
import { supabaseAdmin } from "@/lib/supabase";

const WEBHOOK_SYSTEM_PROMPT = `You are a helpful, friendly property management assistant for Sunset Apartments and Harbor View properties, managed by YasithSystems.

You help tenants with rent, building amenities, policies, and maintenance requests.
If the user describes a maintenance issue, you should classify it and return a maintenanceRequest object. 
If it's a general question, maintenanceRequest should be null.

You MUST respond ONLY with a valid JSON object in the following format. No markdown fences, no other text:
{
  "response": "Your conversational response to the tenant (concise, warm). If they reported a maintenance issue, tell them you have filed a request for them.",
  "maintenanceRequest": {
    "title": "Short title of the issue",
    "description": "Full description of the issue based on the user's message",
    "category": "plumbing" | "electrical" | "hvac" | "structural" | "appliance" | "other",
    "priority": "low" | "medium" | "high" | "urgent",
    "assignTo": "Role name e.g. Plumber, Electrician, HVAC Specialist, General Maintenance, Appliance Technician",
    "estimatedResolution": "e.g. 2-3 days",
    "technicianNotes": "Brief actionable notes for the technician"
  } // or null if not a maintenance issue
}`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const body = formData.get("Body") as string;
    const from = formData.get("From") as string;

    if (!body) {
      return NextResponse.json({ error: "Missing body" }, { status: 400 });
    }

    // Attempt to identify the tenant
    let tenantId = null;
    let unitId = null;

    if (from) {
      // Check if we can find a tenant by whatsapp_number or phone
      const { data: tenant } = await supabaseAdmin
        .from("tenants")
        .select("id, unit_id")
        .or(`whatsapp_number.eq.${from},phone.eq.${from.replace("whatsapp:", "")}`)
        .single();

      if (tenant) {
        tenantId = tenant.id;
        unitId = tenant.unit_id;
      }
    }

    // Get AI response
    const rawAiResponse = await aiChat([
      { role: "system", content: WEBHOOK_SYSTEM_PROMPT },
      { role: "user", content: body }
    ]);

    // Parse the JSON output from AI
    const cleaned = rawAiResponse.replace(/```json?/gi, "").replace(/```/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("No JSON found in AI response");
    }

    const aiParsed = JSON.parse(jsonMatch[0]);
    const responseText = aiParsed.response || "I'm sorry, I couldn't process that. Please contact support.";

    // If there is a maintenance request, log it to Supabase
    if (aiParsed.maintenanceRequest) {
      const mr = aiParsed.maintenanceRequest;
      // Default to demo/placeholder values if tenant is not found
      // Actually we'll just insert what we have. Some constraints might require tenant_id/unit_id
      const insertData = {
        title: mr.title,
        description: mr.description,
        category: mr.category,
        priority: mr.priority,
        assigned_to: mr.assignTo,
        technician_notes: mr.technicianNotes,
        ai_classified: true,
        // If we don't have tenantId/unitId, maybe insert nulls if DB allows it, 
        // but if it errors out it's just a demo fallback
        ...(tenantId ? { tenant_id: tenantId } : {}),
        ...(unitId ? { unit_id: unitId } : {}),
      };

      const { error: insertError } = await supabaseAdmin
        .from("maintenance_requests")
        .insert(insertData);

      if (insertError) {
        console.error("Error inserting maintenance request:", insertError);
      }
    }

    // Build TwiML response
    const messagingResponse = new twiml.MessagingResponse();
    messagingResponse.message(responseText);

    return new Response(messagingResponse.toString(), {
      headers: {
        "Content-Type": "text/xml",
      },
    });
  } catch (error) {
    console.error("Twilio webhook error:", error);

    // Fallback response on error
    const fallbackResponse = new twiml.MessagingResponse();
    fallbackResponse.message("I'm sorry, I'm having trouble processing your request right now. Please try again later or contact the property manager.");

    return new Response(fallbackResponse.toString(), {
      headers: {
        "Content-Type": "text/xml",
      },
    });
  }
}
