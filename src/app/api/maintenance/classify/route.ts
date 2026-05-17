import { NextRequest, NextResponse } from "next/server";
import { aiChat } from "@/lib/ai";
import type { AIClassificationResult } from "@/lib/types";

const CLASSIFY_PROMPT = `You are a property maintenance classifier. Analyze the maintenance request below and respond ONLY with a valid JSON object — no markdown, no explanation.

JSON schema:
{
  "category": "plumbing" | "electrical" | "hvac" | "structural" | "appliance" | "other",
  "priority": "low" | "medium" | "high" | "urgent",
  "assignTo": string (role name e.g. "Plumber", "Electrician", "HVAC Specialist", "General Maintenance", "Appliance Technician"),
  "estimatedResolution": string (e.g. "Same day", "2-3 days", "Within a week"),
  "technicianNotes": string (brief actionable notes for the technician)
}

Priority guide:
- urgent: safety risk, no water/power, major leak
- high: significant inconvenience, affects daily living
- medium: noticeable issue but liveable
- low: cosmetic or minor

Maintenance request: `;

export async function POST(req: NextRequest) {
  const { description, title } = await req.json();

  if (!description) {
    return NextResponse.json({ error: "description is required" }, { status: 400 });
  }

  const prompt = `${title ? `Title: ${title}\n` : ""}Description: ${description}`;

  let result: AIClassificationResult;
  try {
    const raw = await aiChat([
      { role: "system", content: "You are a property maintenance classifier. Always respond with valid JSON only." },
      { role: "user", content: CLASSIFY_PROMPT + prompt },
    ]);

    // Extract JSON from the response (strip any markdown fences)
    const cleaned = raw.replace(/```json?/gi, "").replace(/```/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in AI response");
    result = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("[classify] AI error:", err);
    // Fallback: rule-based classification
    result = fallbackClassify(description + " " + (title ?? ""));
  }

  return NextResponse.json(result);
}

function fallbackClassify(text: string): AIClassificationResult {
  const t = text.toLowerCase();
  let category: AIClassificationResult["category"] = "other";
  let priority: AIClassificationResult["priority"] = "medium";
  let assignTo = "General Maintenance";

  if (/leak|pipe|water|tap|drain|toilet|sewage/.test(t)) { category = "plumbing"; assignTo = "Plumber"; }
  else if (/power|electric|outlet|circuit|wiring|light/.test(t)) { category = "electrical"; assignTo = "Electrician"; }
  else if (/ac|air con|hvac|heating|cooling|ventilation/.test(t)) { category = "hvac"; assignTo = "HVAC Specialist"; }
  else if (/crack|wall|ceiling|floor|door|window|structural/.test(t)) { category = "structural"; assignTo = "General Maintenance"; }
  else if (/dishwasher|oven|stove|fridge|washer|dryer|appliance/.test(t)) { category = "appliance"; assignTo = "Appliance Technician"; }

  if (/urgent|emergency|flood|no power|no water|gas/.test(t)) priority = "urgent";
  else if (/leak|broken|not working|no hot water/.test(t)) priority = "high";
  else if (/dripping|slow|minor/.test(t)) priority = "low";

  return { category, priority, assignTo, estimatedResolution: "2-3 days", technicianNotes: "Standard repair — assess on arrival." };
}
