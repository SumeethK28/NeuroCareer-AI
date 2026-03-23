"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { clearCareerMemory } from "@/lib/api-client";

type Props = {
  backendToken: string;
};

export function ClearMemoryButton({ backendToken }: Props) {
  const [isClearing, setIsClearing] = useState(false);

  const handleClear = async () => {
    const message = "This wipes all Hindsight experiences for your GitHub ID. Useful for compliance or starting fresh.\n\nAre you sure you want to proceed?";
    
    if (!confirm(message)) {
      return;
    }

    setIsClearing(true);
    try {
      await clearCareerMemory(backendToken);
      alert("✓ Career memory cleared successfully. Your Hindsight experiences have been wiped.");
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to clear memory. Please try again.");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <button
      onClick={handleClear}
      disabled={isClearing}
      className="flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-2 text-xs font-medium text-rose-300 transition-colors disabled:opacity-50"
      title="Clear all Hindsight experiences"
    >
      <Trash2 className="h-4 w-4" />
      <span className="hidden sm:inline">Clear Memory</span>
    </button>
  );
}
