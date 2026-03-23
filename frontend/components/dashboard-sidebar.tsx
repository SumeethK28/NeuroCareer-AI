"use client";

import { useState } from "react";
import { BookOpen, Brain, ClipboardList, Mic, Network } from "lucide-react";

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: typeof Network;
};

type Props = {
  userInitials: string;
  displayName: string;
  email?: string | null;
};

const navItems: NavItem[] = [
  { id: "neural-map", label: "Neural Map", href: "#neural-map", icon: Network },
  { id: "application-tracker", label: "Application Tracker", href: "#application-tracker", icon: ClipboardList },
  { id: "career-chat", label: "Career Chat", href: "#career-chat", icon: Brain },
  { id: "mock-interview", label: "Mock Interview", href: "#mock-interview", icon: Mic },
  { id: "reflection-logs", label: "Reflection Logs", href: "#reflection-logs", icon: BookOpen },
];

export function DashboardSidebar({ userInitials, displayName, email }: Props) {
  const [activeSection, setActiveSection] = useState("neural-map");
  const [showProfile, setShowProfile] = useState(false);

  const handleNavClick = (item: NavItem) => {
    setActiveSection(item.id);
    if (item.id === "career-chat" && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("neurocareer:open-chat", {
          detail: { mode: "advisor" },
        }),
      );
    }
    if (item.id === "mock-interview" && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("neurocareer:open-chat", {
          detail: { mode: "mock_interview" },
        }),
      );
    }
  };

  return (
    <aside className="hidden h-full w-20 flex-col items-center gap-8 border-r border-white/10 bg-[#0F172A] py-8 lg:flex relative z-40">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6]">
        <Brain className="h-7 w-7 text-white" />
      </div>

      <nav className="flex flex-1 flex-col gap-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <a
              key={item.id}
              href={item.href}
              onClick={() => handleNavClick(item)}
              className={`relative flex h-14 w-14 items-center justify-center rounded-xl transition-all duration-200 group ${
                isActive
                  ? "bg-[#6366F1] text-white shadow-lg shadow-[#6366F1]/30"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
              title={item.label}
            >
              <Icon className="h-6 w-6" />
              {isActive ? (
                <div className="absolute -left-1 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-[#10B981]" />
              ) : null}
              <div className="pointer-events-none absolute left-full ml-4 whitespace-nowrap rounded-lg border border-white/10 bg-[#1E293B] px-3 py-2 text-sm text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100 z-50">
                {item.label}
              </div>
            </a>
          );
        })}
      </nav>

      <div className="relative">
        <button
          onClick={() => setShowProfile((prev) => !prev)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#10B981] to-[#14B8A6] text-sm font-medium text-white"
        >
          {userInitials}
        </button>
        {showProfile ? (
          <div className="absolute left-full bottom-0 ml-3 w-48 rounded-xl border border-white/10 bg-[#1E293B] p-3 text-xs text-gray-200 shadow-xl z-50">
            <p className="text-sm text-white">{displayName}</p>
            {email ? <p className="text-gray-400">{email}</p> : null}
            <button
              onClick={() => setShowProfile(false)}
              className="mt-2 text-[11px] text-gray-400 hover:text-white"
            >
              Close
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
