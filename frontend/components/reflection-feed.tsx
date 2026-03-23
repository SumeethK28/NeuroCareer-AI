"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, BookOpen, Sparkles, Target, TrendingUp } from "lucide-react";

import { triggerCareerGrowth } from "@/lib/api-client";
import type { ApplicationInsight, Reflection } from "@/lib/types";

type InsightType = "tip" | "achievement" | "warning" | "learning" | "goal";

type Insight = {
  id: string;
  type: InsightType;
  title: string;
  message: string;
  timestamp: string;
};

type Props = {
  backendToken: string;
  reflection: Reflection | null;
  ghostingInsights: ApplicationInsight[];
  skills?: string[];
  jobRole?: string;
};

const fallbackInsights: Insight[] = [
  {
    id: "fallback",
    type: "tip",
    title: "📈 Start Your Journey",
    message: "Upload your resume to get personalized career guidance and insights.",
    timestamp: "Just now",
  },
];

const getRelevantInsights = (skills: string[], jobRole: string): Insight[] => {
  // Generate dynamic insights based on actual skills and job role
  const insights: Insight[] = [];

  // Extract skill categories from skill names
  const hasEmbeddedSystems = skills.some(s => 
    s.toLowerCase().includes("embedded") || 
    s.toLowerCase().includes("arduino") || 
    s.toLowerCase().includes("raspberry") ||
    s.toLowerCase().includes("iot") ||
    s.toLowerCase().includes("sensor")
  );

  const hasHardwareSoftware = skills.some(s => 
    s.toLowerCase().includes("hardware") || 
    s.toLowerCase().includes("integration")
  );

  const hasTeamSkills = skills.some(s => 
    s.toLowerCase().includes("leadership") || 
    s.toLowerCase().includes("team") ||
    s.toLowerCase().includes("coordination")
  );

  // Generate insights based on actual skills
  if (hasEmbeddedSystems) {
    insights.push({
      id: "embedded",
      type: "tip",
      title: "🔧 Hardware Integration Path",
      message: `Your embedded systems expertise is strong! Consider exploring advanced IoT architecture patterns to stand out for hardware-focused roles.`,
      timestamp: "1 day ago",
    });
  }

  if (hasHardwareSoftware) {
    insights.push({
      id: "integration",
      type: "achievement",
      title: "✨ Integration Mastery",
      message: `You've demonstrated hardware-software integration skills. This is a rare and valuable skill set for engineering roles.`,
      timestamp: "2 days ago",
    });
  }

  if (hasTeamSkills) {
    insights.push({
      id: "teamskills",
      type: "goal",
      title: "🎯 Leadership Ready",
      message: `Your team coordination and leadership skills are strong. Consider roles that leverage these abilities alongside your technical expertise.`,
      timestamp: "3 days ago",
    });
  }

  // Generic learning recommendation
  insights.push({
    id: "learning",
    type: "learning",
    title: "📚 Skill Enhancement",
    message: `To maximize opportunities in ${jobRole} roles, consider deepening your knowledge in system design and scalability.`,
    timestamp: "4 days ago",
  });

  return insights.length > 0 ? insights : fallbackInsights;
};

const getInsightIcon = (type: InsightType) => {
  switch (type) {
    case "tip":
      return <Sparkles className="h-5 w-5 text-[#6366F1]" />;
    case "achievement":
      return <TrendingUp className="h-5 w-5 text-[#10B981]" />;
    case "warning":
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case "learning":
      return <BookOpen className="h-5 w-5 text-blue-400" />;
    case "goal":
      return <Target className="h-5 w-5 text-purple-400" />;
    default:
      return null;
  }
};

const getGradientClass = (type: InsightType) => {
  switch (type) {
    case "tip":
      return "from-[#6366F1]/20 to-transparent";
    case "achievement":
      return "from-[#10B981]/20 to-transparent";
    case "warning":
      return "from-yellow-500/20 to-transparent";
    case "learning":
      return "from-blue-400/20 to-transparent";
    case "goal":
      return "from-purple-400/20 to-transparent";
    default:
      return "from-gray-500/20 to-transparent";
  }
};

export function ReflectionFeed({ backendToken, reflection, ghostingInsights, skills = [], jobRole = "Hardware/Embedded Engineer" }: Props) {
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionTimestamp, setActionTimestamp] = useState<string | null>(null);
  const ghostingMessage = ghostingInsights[0]?.message;
  const tipMessage = actionMessage ?? reflection?.suggestion ?? null;
  const tipTimestamp = actionTimestamp ?? reflection?.timestamp;

  const relevantInsights = useMemo(
    () => getRelevantInsights(skills, jobRole),
    [skills, jobRole]
  );

  const insights: Insight[] = useMemo(
    () => {
      const baseInsights: Insight[] = [];
      
      // Add tip if we have one
      if (tipMessage) {
        baseInsights.push({
          id: "tip",
          type: "tip",
          title: "✨ Today's Growth Tip",
          message: tipMessage,
          timestamp: tipTimestamp ? new Date(tipTimestamp).toLocaleString() : "Just now",
        });
      }
      
      // Add ghosting alert if exists
      if (ghostingMessage) {
        baseInsights.push({
          id: "ghosting",
          type: "warning",
          title: "⚠️ Application Gap Alert",
          message: ghostingMessage,
          timestamp: "Today",
        });
      }
      
      // Add relevant insights based on actual skills
      baseInsights.push(...relevantInsights);
      
      return baseInsights;
    },
    [ghostingMessage, tipMessage, tipTimestamp, relevantInsights],
  );

  const handleTakeAction = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const suggestion = await triggerCareerGrowth(backendToken);
      setActionMessage(suggestion.suggestion);
      setActionTimestamp(new Date().toISOString());
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6">
        <h2 className="text-xl text-white">Agent Insights</h2>
        <p className="text-sm text-gray-400">Proactive career guidance</p>
      </div>

      <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto pr-2">
        {insights.map((insight, index) => (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className={`group relative cursor-default rounded-xl border border-white/10 bg-gradient-to-br p-4 backdrop-blur-md transition-all hover:border-white/20 ${getGradientClass(
              insight.type,
            )}`}
            style={{
              background:
                index === 0
                  ? "linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(30, 41, 59, 0.5) 100%)"
                  : undefined,
            }}
          >
            {index === 0 ? (
              <div className="absolute inset-0 -z-10 rounded-xl bg-white/5 backdrop-blur-md" />
            ) : null}

            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-[#1E293B]/50 p-2 transition-transform group-hover:scale-110">
                {getInsightIcon(insight.type)}
              </div>
              <div className="flex-1">
                <div className="mb-1 flex items-center justify-between">
                  <h4 className="text-white">{insight.title}</h4>
                  <span className="text-xs text-gray-500">{insight.timestamp}</span>
                </div>
                <p className="text-sm leading-relaxed text-gray-300">{insight.message}</p>
                {index === 0 ? (
                  <button
                    onClick={handleTakeAction}
                    disabled={actionLoading}
                    className="mt-3 rounded-lg bg-[#6366F1] px-4 py-2 text-sm text-white hover:bg-[#5558E3] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {actionLoading ? "Updating..." : "Take Action"}
                  </button>
                ) : null}
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
