"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, MessageSquare, Minimize2, Send, X } from "lucide-react";

import { agentChat } from "@/lib/api-client";
import type { Message } from "@/lib/types";

type ChatMessage = Message & { id: string; timestamp: string };
type ChatMode = "advisor" | "mock_interview";

type Props = {
  // Token is now retrieved from localStorage via getToken()
};

export function AIChatConsole({}: Props) {
  const [isOpen, setIsOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [mode, setMode] = useState<ChatMode>("advisor");
  const [messagesByMode, setMessagesByMode] = useState<Record<ChatMode, ChatMessage[]>>({
    advisor: [],
    mock_interview: [],
  });
  const [loading, setLoading] = useState(false);
  const messages = messagesByMode[mode];

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ mode?: ChatMode }>).detail;
      setIsOpen(true);
      setIsMinimized(false);
      if (detail?.mode) {
        setMode(detail.mode);
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("neurocareer:open-chat", handler);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("neurocareer:open-chat", handler);
      }
    };
  }, []);

  const handleSend = async () => {
    if (!inputValue.trim() || loading) return;
    const activeMode = mode;
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };
    const nextMessages = [...messagesByMode[activeMode], newMessage];
    setMessagesByMode((prev) => ({ ...prev, [activeMode]: nextMessages }));
    setInputValue("");
    setLoading(true);

    // Add a loading indicator
    setMessagesByMode((prev) => ({
      ...prev,
      [activeMode]: [
        ...prev[activeMode],
        {
          id: `${Date.now()}-loading`,
          role: "assistant",
          content: "⏳ Thinking...",
          timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        },
      ],
    }));

    try {
      const response = await agentChat({
        mode: activeMode,
        messages: nextMessages.map(({ role, content }) => ({ role, content })),
      });
      
      // Remove loading indicator and add response
      setMessagesByMode((prev) => ({
        ...prev,
        [activeMode]: prev[activeMode].filter(m => m.id !== `${Date.now()}-loading`).concat({
          id: `${Date.now()}-ai`,
          role: "assistant",
          content: response.reply || "I couldn't generate a response. Please try again.",
          timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        }),
      }));
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      
      // Remove loading indicator and add error message
      setMessagesByMode((prev) => ({
        ...prev,
        [activeMode]: prev[activeMode].filter(m => m.id !== `${Date.now()}-loading`).concat({
          id: `${Date.now()}-err`,
          role: "assistant",
          content: `❌ ${errorMessage}`,
          timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        }),
      }));
      console.error("Agent chat error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (err: unknown): string => {
    if (err instanceof Error) {
      const msg = err.message.toLowerCase();
      if (msg.includes("rate")) {
        return "Groq is rate-limited. Please wait a moment and try again.";
      }
      if (msg.includes("503") || msg.includes("unavailable")) {
        return "AI service is temporarily unavailable. Please try again in a moment.";
      }
      if (msg.includes("401") || msg.includes("unauthorized")) {
        return "Your session expired. Please reload and try again.";
      }
      if (msg.includes("404")) {
        return "The AI service endpoint is not available. Check your backend configuration.";
      }
      return `Service error: ${err.message}`;
    }
    return "I'm experiencing technical difficulties. Please try again in a moment.";
  };

  if (!isOpen) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] shadow-2xl"
      >
        <MessageSquare className="h-6 w-6 text-white" />
      </motion.button>
    );
  }

  if (isMinimized) {
    return (
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed bottom-6 right-6 z-40 cursor-pointer rounded-xl border border-white/10 bg-[#1E293B] p-4 shadow-2xl"
        onClick={() => setIsMinimized(false)}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#6366F1] to-[#8B5CF6]">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm text-white">NeuroCareer AI</p>
            <p className="text-xs text-gray-400">Click to expand</p>
          </div>
          <div className="ml-4 h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-6 right-6 z-40 flex h-[70vh] w-[90vw] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1E293B] shadow-2xl sm:w-[360px] lg:h-[540px] lg:w-[360px]"
    >
      <div className="border-b border-white/10 bg-gradient-to-r from-[#6366F1]/10 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#6366F1] to-[#8B5CF6]">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-white">NeuroCareer AI</h3>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
                <span className="text-xs text-gray-400">Context-Aware</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/5"
            >
              <Minimize2 className="h-4 w-4 text-gray-400" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/5"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#6366F1]/30 bg-[#6366F1]/20 px-3 py-1 text-xs text-[#6366F1]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#6366F1] animate-pulse" />
          {mode === "advisor" ? "Recalling: Skill Graph, Applications" : "Context-Aware Mock Interview"}
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setMode("advisor")}
            className={`rounded-lg px-3 py-1 text-xs ${
              mode === "advisor" ? "bg-white/10 text-white" : "text-gray-400"
            }`}
          >
            Career Chat
          </button>
          <button
            onClick={() => setMode("mock_interview")}
            className={`rounded-lg px-3 py-1 text-xs ${
              mode === "mock_interview" ? "bg-white/10 text-white" : "text-gray-400"
            }`}
          >
            Mock Interview
          </button>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#0F172A]/70 p-4 text-sm text-gray-300">
            Start a conversation to get tailored guidance from Groq.
          </div>
        ) : null}
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[80%] ${message.role === "user" ? "order-2" : "order-1"}`}>
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-[#6366F1] text-white"
                      : "border border-white/10 bg-[#0F172A] text-gray-200"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>
                <p className="mt-1 px-2 text-xs text-gray-500">{message.timestamp}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={mode === "mock_interview" ? "Ask a mock interview question..." : "Ask about your career path..."}
            className="flex-1 rounded-xl border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-[#6366F1]"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || loading}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#6366F1] transition-colors hover:bg-[#5558E3] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-5 w-5 text-white" />
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">AI has context of your entire career journey</p>
      </div>
    </motion.div>
  );
}
