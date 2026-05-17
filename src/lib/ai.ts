/**
 * AI provider — Google Gemini
 *
 * Model:    gemini-1.5-flash  (free tier: 15 RPM · 1M TPM · 1,500 RPD)
 * API key:  https://aistudio.google.com/apikey  →  GEMINI_API_KEY in .env.local
 */

import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

// ─── Config ───────────────────────────────────────────────────────────────────

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";

function getModel(systemInstruction?: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set. Add it to .env.local");

  return new GoogleGenerativeAI(key).getGenerativeModel({
    model: GEMINI_MODEL,
    ...(systemInstruction ? { systemInstruction } : {}),
    // Keep safety thresholds permissive so property-management topics aren't blocked
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    ],
  });
}

// ─── Message type ─────────────────────────────────────────────────────────────

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// ─── Internal helper ──────────────────────────────────────────────────────────
// Gemini keeps system instructions separate and uses "model" instead of "assistant".
// The final user message is sent via sendMessage / sendMessageStream — not in history.

function splitMessages(messages: AIMessage[]) {
  const system  = messages.find((m) => m.role === "system")?.content;
  const turns   = messages.filter((m) => m.role !== "system");
  const history = turns.slice(0, -1).map((m) => ({
    role:  m.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: m.content }],
  }));
  const last = turns.at(-1)?.content ?? "";
  return { system, history, last };
}

// ─── Non-streaming — AI Maintenance Classifier ───────────────────────────────

export async function aiChat(messages: AIMessage[]): Promise<string> {
  const { system, history, last } = splitMessages(messages);
  const chat   = getModel(system).startChat({ history });
  const result = await chat.sendMessage(last);
  return result.response.text();
}

// ─── Streaming — AI Tenant Assistant ─────────────────────────────────────────

export async function aiChatStream(
  messages: AIMessage[]
): Promise<ReadableStream<Uint8Array>> {
  const { system, history, last } = splitMessages(messages);
  const chat   = getModel(system).startChat({ history });
  const result = await chat.sendMessageStream(last);

  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) controller.enqueue(encoder.encode(text));
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });
}

// ─── System prompt ────────────────────────────────────────────────────────────

export const TENANT_ASSISTANT_SYSTEM_PROMPT = `You are a helpful, friendly property management assistant for Sunset Apartments and Harbor View properties, managed by YasithSystems.

You help tenants with:
- Rent payments (due on the 1st of each month, 5-day grace period, late fee: $50)
- Maintenance requests (submit via dashboard or call 0400-555-123)
- Move-in / move-out procedures (48-hour notice required)
- Building amenities:
  - Sunset Apartments WiFi: Network "SunsetApts_Main" | Password: Welcome2024!
  - Harbor View WiFi: Network "HarborView_Residents" | Password: HV@secure99
  - Gym: Open 5am–10pm, Level 2
  - Pool: Open 7am–9pm, Level 1 (outdoor)
  - Parking: Assigned spots in basement, 1 spot per unit
- Building policies (no smoking, quiet hours 10pm–7am, no pets above 10kg)
- Emergency contacts: Property manager Yasith — 0400-555-123 | Emergency maintenance: 1800-REPAIR

Be concise, warm, and practical. If you don't know something specific, suggest the tenant contact the property manager directly.`;
