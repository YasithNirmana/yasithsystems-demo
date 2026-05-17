"use client";

import { useState, useRef, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import type { ChatMessage } from "@/lib/types";

const STARTERS = [
  "When is my rent due?",
  "How do I submit a maintenance request?",
  "What's the WiFi password?",
  "What are the quiet hours?",
  "How do I move out?",
  "Is there parking available?",
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm your AI property assistant 👋 I can help you with rent questions, maintenance requests, building info, and more. What can I help you with today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || streaming) return;

    setInput("");
    setError(null);

    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content, timestamp: new Date() };
    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: ChatMessage = { id: assistantId, role: "assistant", content: "", timestamp: new Date() };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    try {
      const history = [...messages, userMsg]
        .filter((m, index, arr) =>
          m.role !== "assistant" || arr.slice(0, index).some((prev) => prev.role === "user")
        )
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "AI service error");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: accumulated } : m)
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar
          title="AI Tenant Assistant"
          subtitle="Powered by Gemini · Streaming"
        />

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <strong>AI unavailable:</strong> {error}
              <p className="text-red-400/70 text-xs mt-0.5">
                Check that <code className="bg-red-500/10 px-1 rounded">GEMINI_API_KEY</code> is set in .env.local
              </p>
            </div>
          </div>
        )}

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-message flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xs font-bold mr-3 flex-shrink-0 mt-1">
                  AI
                </div>
              )}
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-tr-sm"
                    : "bg-slate-800 text-slate-100 rounded-tl-sm border border-white/5"
                }`}
              >
                {msg.content === "" && msg.role === "assistant" ? (
                  <div className="flex items-center gap-1 py-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full dot-1" />
                    <span className="w-2 h-2 bg-slate-400 rounded-full dot-2" />
                    <span className="w-2 h-2 bg-slate-400 rounded-full dot-3" />
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
                <p className={`text-[10px] mt-1.5 ${msg.role === "user" ? "text-blue-200/60" : "text-slate-500"}`}>
                  {msg.timestamp.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 text-xs font-bold ml-3 flex-shrink-0 mt-1">
                  T
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Starter prompts — only shown before first reply */}
        {messages.length <= 1 && (
          <div className="px-6 pb-3 flex flex-wrap gap-2">
            {STARTERS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-xs px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-white/[0.06] text-slate-300 hover:text-white transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input bar */}
        <div className="border-t border-white/5 p-4">
          <div className="flex items-center gap-3 bg-slate-800 border border-white/10 rounded-xl px-4 py-2 focus-within:border-blue-500/40 transition-colors">
            <input
              ref={inputRef}
              className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm focus:outline-none"
              placeholder="Ask anything about your tenancy..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              disabled={streaming}
            />
            <button
              onClick={() => send()}
              disabled={streaming || !input.trim()}
              className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors flex-shrink-0"
            >
              {streaming ? (
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-slate-600 text-xs text-center mt-2">
            Powered by Google Gemini · Responses not stored
          </p>
        </div>
      </div>
    </div>
  );
}
