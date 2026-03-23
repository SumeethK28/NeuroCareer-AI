"use client";

import { Brain, LineChart, Sparkles } from "lucide-react";

type Metric = {
  label: string;
  value: string;
  hint: string;
  intent?: "primary" | "success" | "warning";
};

const icons = {
  primary: Sparkles,
  success: LineChart,
  warning: Brain,
};

export function MetricBadges({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {metrics.map((metric, idx) => {
        const Icon = icons[metric.intent ?? "primary"];
        return (
          <div
            key={`${metric.label}-${idx}`}
            className="rounded-2xl border border-slate-800/80 bg-slate-950/70 px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-900/80 p-2">
                <Icon className="h-4 w-4 text-indigo-200" />
              </span>
              <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">{metric.label}</p>
            </div>
            <p className="mt-3 text-2xl font-semibold text-white">{metric.value}</p>
            <p className="text-xs text-slate-400">{metric.hint}</p>
          </div>
        );
      })}
    </div>
  );
}
