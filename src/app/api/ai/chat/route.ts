import { NextRequest, NextResponse } from "next/server";
import { aiChatStream, TENANT_ASSISTANT_SYSTEM_PROMPT } from "@/lib/ai";
import type { AIMessage } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages array is required" }, { status: 400 });
  }

  const aiMessages: AIMessage[] = [
    { role: "system", content: TENANT_ASSISTANT_SYSTEM_PROMPT },
    ...messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  try {
    const stream = await aiChatStream(aiMessages);
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("[/api/ai/chat]", err);
    const isKeyMissing = String(err).includes("GEMINI_API_KEY");
    return NextResponse.json(
      {
        error: isKeyMissing
          ? "GEMINI_API_KEY is not set. Add it to .env.local — get a free key at aistudio.google.com"
          : `Gemini API error: ${String(err)}`,
      },
      { status: 503 }
    );
  }
}
