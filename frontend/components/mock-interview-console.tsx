"use client";

import { useState } from "react";
import { Loader2, SendHorizontal } from "lucide-react";

import { agentChat } from "@/lib/api-client";
import type { Message } from "@/lib/types";

type Props = {
  backendToken: string;
};

export function MockInterviewConsole({ backendToken }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "system", content: "Mock interview bootstrapped. Ask your hardest questions." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const nextMessages = [...messages, { role: "user", content: input.trim() }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    try {
      const response = await agentChat(backendToken, {
        mode: "mock_interview",
        messages: nextMessages,
      });
      setMessages([...nextMessages, { role: "assistant", content: response.reply }]);
    } catch (err) {
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content:
            err instanceof Error
              ? err.message
              : "I'm offline right now, but rehearse how you'd explain your last FastAPI project.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="glass flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Context-aware mode</p>
          <h3 className="text-lg font-semibold">Mock Interview Prep</h3>
        </div>
        <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs text-indigo-200">Recall: Project</span>
      </div>
      <div className="flex-1 space-y-2 max-h-64 overflow-y-auto pr-1 scrollbar">
        {messages.map((message, idx) => (
          <div
            key={`${message.role}-${idx}`}
            className={`rounded-xl border border-slate-800/70 p-3 ${
              message.role === "assistant" ? "bg-slate-900/70" : "bg-slate-950/70"
            }`}
          >
            <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400">{message.role}</p>
            <p className="text-sm text-slate-100">{message.content}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Ask NeuroCareer..."
          className="flex-1 bg-transparent text-sm text-slate-200 outline-none"
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="rounded-xl bg-indigo-500/80 px-3 py-2 text-xs font-semibold text-white flex items-center gap-1"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
        </button>
      </div>
    </section>
  );
}
