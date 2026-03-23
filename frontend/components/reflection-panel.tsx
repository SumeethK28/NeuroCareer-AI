"use client";

import { useState } from "react";
import { Bell, Brain, Loader2, RefreshCcw, Sparkles } from "lucide-react";

import { triggerCareerGrowth } from "@/lib/api-client";
import type { CareerGrowthSuggestion, Reflection } from "@/lib/types";

type Props = {
  backendToken: string;
  initialReflection: Reflection | null;
  marketAlert?: string;
  mockPrep?: string;
};

export function ReflectionPanel({ backendToken, initialReflection, marketAlert, mockPrep }: Props) {
  const [reflection, setReflection] = useState<Reflection | null>(initialReflection);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runReflection = async () => {
    setLoading(true);
    setError(null);
    try {
      const suggestion = (await triggerCareerGrowth(backendToken)) as CareerGrowthSuggestion;
      setReflection({
        timestamp: new Date().toISOString(),
        suggestion: suggestion.suggestion,
        metadata: suggestion,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to trigger reflection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="glass p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Agent Insights</p>
          <h3 className="text-lg font-semibold text-white">Live guidance</h3>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">Live</span>
      </div>

      <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-200">
            <Sparkles className="h-4 w-4" />
            <p className="text-xs uppercase tracking-[0.3em]">Daily growth tip</p>
          </div>
          <button
            onClick={runReflection}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-full bg-indigo-600/30 px-3 py-1 text-xs text-indigo-100"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCcw className="h-3 w-3" />}
            Refresh
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-100">
          {reflection?.suggestion ?? "Trigger a new reflection to get your daily career pivot."}
        </p>
        {reflection?.metadata?.missing_skill ? (
          <p className="mt-2 text-xs text-amber-200">
            Missing skill: {reflection.metadata.missing_skill as string}
          </p>
        ) : null}
        {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
      </div>

      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4">
        <div className="flex items-center gap-2 text-slate-300">
          <Bell className="h-4 w-4 text-sky-300" />
          <p className="text-xs uppercase tracking-[0.3em]">Market trend alert</p>
        </div>
        <p className="mt-3 text-sm text-slate-100">
          {marketAlert ??
            "3 companies you applied to recently started hiring for Kubernetes roles. Review the stack gaps."}
        </p>
        <p className="mt-2 text-xs text-sky-300">View Learning Path →</p>
      </div>

      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4">
        <div className="flex items-center gap-2 text-slate-300">
          <Brain className="h-4 w-4 text-violet-300" />
          <p className="text-xs uppercase tracking-[0.3em]">Mock interview prep</p>
        </div>
        <p className="mt-3 text-sm text-slate-100">
          {mockPrep ?? "You have a mock interview scheduled. Review your system design notes."}
        </p>
        <div className="mt-3 flex gap-2">
          <button className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200">Review</button>
          <button className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200">Snooze</button>
        </div>
      </div>
    </section>
  );
}
