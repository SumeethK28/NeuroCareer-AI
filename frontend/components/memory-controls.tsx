"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

import { clearCareerMemory } from "@/lib/api-client";

type Props = {
  backendToken: string;
};

export function MemoryControls({ backendToken }: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const clearMemory = async () => {
    setClearing(true);
    setStatus(null);
    try {
      const response = await clearCareerMemory(backendToken);
      setStatus(response.message);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Unable to clear memory.");
    } finally {
      setClearing(false);
    }
  };

  return (
    <section className="rounded-2xl border border-rose-500/30 bg-[#1E293B] p-6 space-y-3">
      <div className="flex items-center gap-2 text-rose-300">
        <AlertTriangle className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Clear Career Memory</h3>
      </div>
      <p className="text-sm text-gray-300">
        This wipes all Hindsight experiences for your GitHub ID. Useful for compliance or starting fresh.
      </p>
      <button
        onClick={clearMemory}
        disabled={clearing}
        className="w-full rounded-xl border border-rose-500/60 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-100"
      >
        {clearing ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Confirm wipe"}
      </button>
      {status ? <p className="text-sm text-rose-200">{status}</p> : null}
    </section>
  );
}
