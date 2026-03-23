"use client";

import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Circle } from "lucide-react";

import type { SkillTreeNode } from "@/lib/types";

type SkillStatus = "mastered" | "learning" | "gap";

type SkillPoint = {
  id: string;
  name: string;
  status: SkillStatus;
  x: number;
  y: number;
  connections?: string[];
};

const buildLayout = (count: number) => {
  if (count <= 1) return [{ x: 50, y: 50 }];
  const radius = 35;
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
    return {
      x: 50 + radius * Math.cos(angle),
      y: 50 + radius * Math.sin(angle),
    };
  });
};

const statusFromProgress = (progress: number): SkillStatus => {
  if (progress >= 0.7) return "mastered";
  if (progress >= 0.4) return "learning";
  return "gap";
};

const getStatusColor = (status: SkillStatus) => {
  switch (status) {
    case "mastered":
      return {
        border: "#10B981",
        glow: "#10B981",
        bg: "rgba(16, 185, 129, 0.1)",
        ring: "rgba(16, 185, 129, 0.35)",
      };
    case "learning":
      return {
        border: "#6366F1",
        glow: "#6366F1",
        bg: "rgba(99, 102, 241, 0.1)",
        ring: "rgba(99, 102, 241, 0.35)",
      };
    case "gap":
      return {
        border: "#64748B",
        glow: "transparent",
        bg: "rgba(100, 116, 139, 0.05)",
        ring: "rgba(100, 116, 139, 0.2)",
      };
    default:
      return { border: "#64748B", glow: "transparent", bg: "transparent", ring: "transparent" };
  }
};

const getStatusIcon = (status: SkillStatus) => {
  switch (status) {
    case "mastered":
      return <CheckCircle2 className="h-4 w-4 text-[#10B981]" />;
    case "learning":
      return <Circle className="h-4 w-4 text-[#6366F1]" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-500" />;
  }
};

type Props = {
  nodes: SkillTreeNode[] | null;
};

export function SkillEvolutionTree({ nodes }: Props) {
  const normalized = (nodes ?? []).map((node) => ({
    id: node.id,
    name: node.label,
    progress: node.progress ?? 0,
  }));

  if (normalized.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#0F172A]/60">
        <p className="text-sm text-gray-400">No skill data yet. Upload a resume or log a project to populate this map.</p>
      </div>
    );
  }

  const layout = buildLayout(normalized.length);
  const skills: SkillPoint[] = normalized.map((skill, index) => ({
    id: skill.id,
    name: skill.name,
    status: statusFromProgress(skill.progress),
    x: layout[index].x,
    y: layout[index].y,
    connections: index === 0 ? [] : [normalized[index - 1].id],
  }));

  return (
    <div className="relative h-full w-full">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle, rgba(99,102,241,0.08) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
      </div>
      <svg className="absolute inset-0 h-full w-full pointer-events-none">
        {skills.map((skill) =>
          skill.connections?.map((targetId) => {
            const target = skills.find((s) => s.id === targetId);
            if (!target) return null;
            return (
                <motion.line
                  key={`${skill.id}-${targetId}`}
                  x1={`${skill.x}%`}
                  y1={`${skill.y}%`}
                  x2={`${target.x}%`}
                  y2={`${target.y}%`}
                  stroke="rgba(148, 163, 184, 0.25)"
                  strokeWidth="2"
                  strokeDasharray={skill.status === "gap" || target.status === "gap" ? "5,5" : "0"}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
            );
          }),
        )}
      </svg>

      {skills.map((skill, index) => {
        const colors = getStatusColor(skill.status);
        const isMastered = skill.status === "mastered";

        return (
          <motion.div
            key={`${skill.id}_${index}`}
            className="absolute"
            style={{ left: `${skill.x}%`, top: `${skill.y}%`, transform: "translate(-50%, -50%)" }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <div className="relative group cursor-pointer">
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ boxShadow: `0 0 40px ${colors.ring}` }}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              {isMastered ? (
                <motion.div
                  className="absolute inset-0 rounded-full blur-xl"
                  style={{ backgroundColor: colors.glow }}
                  animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              ) : null}

              <motion.div
                className="relative rounded-full border-2 px-4 py-2 backdrop-blur-sm transition-all"
                style={{
                  borderColor: colors.border,
                  backgroundColor: colors.bg,
                  boxShadow: isMastered ? `0 0 20px ${colors.glow}40` : "none",
                }}
                whileHover={{
                  scale: 1.3,
                  boxShadow: `0 0 30px ${colors.glow}, 0 0 60px ${colors.glow}80`,
                }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <div className="flex items-center gap-2">
                  {getStatusIcon(skill.status)}
                  <span className="whitespace-nowrap text-sm text-white">{skill.name}</span>
                  <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70">
                    {Math.round(
                      (normalized.find((n) => n.id === skill.id)?.progress ?? 0) * 100,
                    )}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#0F172A]/70">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#6366F1] to-[#10B981]"
                    style={{
                      width: `${Math.round(
                        (normalized.find((n) => n.id === skill.id)?.progress ?? 0) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </motion.div>

              <motion.div
                className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-[#1E293B] px-3 py-2 text-xs text-white shadow-xl"
                initial={{ opacity: 0, y: -10 }}
                whileHover={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {skill.status === "mastered" && "✓ Mastered Skill"}
                {skill.status === "learning" && "⏳ Currently Learning"}
                {skill.status === "gap" && "⚠ Skill Gap Identified"}
              </motion.div>
            </div>
          </motion.div>
        );
      })}

      <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col items-start gap-4 rounded-r-xl border-r border-t border-b border-white/10 bg-[#0F172A]/80 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[#10B981]" style={{ boxShadow: "0 0 10px #10B981" }} />
          <span className="text-xs text-gray-300">Mastered</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[#6366F1]" style={{ boxShadow: "0 0 10px #6366F1" }} />
          <span className="text-xs text-gray-300">Learning</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[#64748B]" />
          <span className="text-xs text-gray-300">Skill Gap</span>
        </div>
      </div>
    </div>
  );
}
