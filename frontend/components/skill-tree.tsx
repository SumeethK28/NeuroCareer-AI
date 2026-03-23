"use client";

import { useMemo } from "react";
import type { SkillTreeResponse } from "@/lib/types";

type Props = {
  data: SkillTreeResponse | null;
};

const fallbackNodes = [
  { id: "python", label: "Python", progress: 0.76 },
  { id: "fastapi", label: "FastAPI", progress: 0.62 },
  { id: "postgres", label: "PostgreSQL", progress: 0.58 },
  { id: "sqlalchemy", label: "SQLAlchemy", progress: 0.5 },
  { id: "docker", label: "Docker", progress: 0.38 },
  { id: "k8s", label: "Kubernetes", progress: 0.28 },
];

const positions = [
  { x: 12, y: 58 },
  { x: 30, y: 30 },
  { x: 48, y: 68 },
  { x: 62, y: 32 },
  { x: 78, y: 60 },
  { x: 42, y: 86 },
];

export function SkillTree({ data }: Props) {
  const nodes = data?.nodes?.length ? data.nodes : fallbackNodes;
  const summary = data?.readiness_summary ?? "Visualizing your technical growth path based on recent commits.";
  const readiness = nodes.length
    ? nodes.reduce((acc, node) => acc + (node.progress ?? 0), 0) / nodes.length
    : 0.2;

  const plotted = useMemo(
    () =>
      nodes.slice(0, positions.length).map((node, index) => ({
        ...node,
        ...positions[index],
      })),
    [nodes],
  );

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 shadow-[0_0_120px_rgba(80,130,255,0.18)]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Skill Evolution</p>
            <h2 className="text-2xl font-semibold text-white">Neural Skill Graph</h2>
            <p className="text-sm text-slate-400">{summary}</p>
          </div>
          <div className="flex items-center gap-4">
            <div
              className="relative flex h-16 w-16 items-center justify-center rounded-full border border-slate-800/80"
              style={{
                background: `conic-gradient(#34d399 ${Math.round(
                  readiness * 360,
                )}deg, rgba(148,163,184,0.2) 0deg)`,
              }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold">
                {Math.round(readiness * 100)}%
              </div>
            </div>
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
              <p className="text-xs">Ready</p>
              <p className="text-sm text-emerald-400">Backend Intern</p>
            </div>
          </div>
        </div>
        <div className="relative h-64 rounded-2xl border border-slate-800/70 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-4">
          <svg className="absolute inset-0 h-full w-full">
            {plotted.map((node, idx) =>
              idx === 0 ? null : (
                <line
                  key={`${node.id}-line`}
                  x1={`${plotted[idx - 1].x}%`}
                  y1={`${plotted[idx - 1].y}%`}
                  x2={`${node.x}%`}
                  y2={`${node.y}%`}
                  stroke="rgba(129,140,248,0.4)"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                />
              ),
            )}
          </svg>
          {plotted.map((node) => (
            <div
              key={node.id}
              className="absolute flex flex-col items-center gap-2"
              style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%, -50%)" }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-xs font-semibold text-slate-200 shadow-lg">
                {node.label.slice(0, 2).toUpperCase()}
              </div>
              <span className="rounded-full border border-slate-700 bg-slate-950/80 px-2 py-0.5 text-[10px] text-slate-300">
                {node.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
