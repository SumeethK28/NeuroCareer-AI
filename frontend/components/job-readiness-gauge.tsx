"use client";

import { TrendingUp, Briefcase, AlertCircle, Building2 } from "lucide-react";
import type { SkillTreeNode } from "@/lib/types";

type Props = {
  percentage: number;
  role: string;
  nodes?: SkillTreeNode[];
};

const roleDatabase = [
  {
    role: "Backend Engineer Intern",
    requiredSkills: ["python", "fastapi", "postgres", "docker"],
    companies: [
      { name: "Stripe", openings: 3, level: "fresher" },
      { name: "Shopify", openings: 5, level: "fresher" },
      { name: "Twilio", openings: 2, level: "fresher" }
    ],
    description: "REST APIs, databases, server-side logic",
    minExperience: "0-1 years"
  },
  {
    role: "Full Stack Developer Intern",
    requiredSkills: ["python", "react", "typescript", "postgres", "tailwind"],
    companies: [
      { name: "Vercel", openings: 4, level: "fresher" },
      { name: "Figma", openings: 2, level: "fresher" },
      { name: "Notion", openings: 3, level: "fresher" }
    ],
    description: "Frontend + Backend development across the stack",
    minExperience: "0-2 years"
  },
  {
    role: "Data Engineer Intern",
    requiredSkills: ["python", "sql", "postgres", "data engineering"],
    companies: [
      { name: "Databricks", openings: 4, level: "fresher" },
      { name: "Airbnb", openings: 3, level: "fresher" },
      { name: "Lyft", openings: 2, level: "fresher" }
    ],
    description: "Data pipelines, ETL, analytics infrastructure",
    minExperience: "0-1 years"
  },
  {
    role: "Frontend Engineer Intern",
    requiredSkills: ["react", "typescript", "tailwind", "javascript"],
    companies: [
      { name: "Adobe", openings: 5, level: "fresher" },
      { name: "Discord", openings: 3, level: "fresher" },
      { name: "Canva", openings: 2, level: "fresher" }
    ],
    description: "UI/UX, responsive design, performance optimization",
    minExperience: "0-1 years"
  },
  {
    role: "ML Engineer Intern",
    requiredSkills: ["python", "machine learning", "tensorflow", "pandas"],
    companies: [
      { name: "OpenAI", openings: 2, level: "fresher" },
      { name: "Anthropic", openings: 1, level: "fresher" },
      { name: "Google AI", openings: 4, level: "fresher" }
    ],
    description: "Model development, training, deployment",
    minExperience: "0-2 years"
  },
  {
    role: "DevOps Engineer Intern",
    requiredSkills: ["docker", "kubernetes", "aws", "linux"],
    companies: [
      { name: "AWS", openings: 6, level: "fresher" },
      { name: "HashiCorp", openings: 2, level: "fresher" },
      { name: "DigitalOcean", openings: 3, level: "fresher" }
    ],
    description: "Infrastructure, CI/CD, cloud deployment",
    minExperience: "0-1 years"
  },
  {
    role: "IoT/Embedded Systems Engineer",
    requiredSkills: ["android", "arduino", "raspberry pi", "embedded systems", "iot", "sensor integration"],
    companies: [
      { name: "Arduino", openings: 3, level: "fresher" },
      { name: "Qualcomm", openings: 4, level: "fresher" },
      { name: "Texas Instruments", openings: 5, level: "fresher" }
    ],
    description: "Hardware integration, sensor programming, IoT solutions",
    minExperience: "0-1 years"
  },
  {
    role: "Hardware-Software Integration Engineer",
    requiredSkills: ["embedded systems", "hardware", "prototyping", "sensor integration", "smart home"],
    companies: [
      { name: "Apple", openings: 2, level: "fresher" },
      { name: "Samsung", openings: 4, level: "fresher" },
      { name: "Philips", openings: 3, level: "fresher" }
    ],
    description: "System integration, prototyping, hardware-software optimization",
    minExperience: "0-2 years"
  }
];

export function JobReadinessGauge({ percentage, role, nodes = [] }: Props) {
  const clamped = Math.min(100, Math.max(0, Math.round(percentage)));
  const radius = 72;
  const circumference = Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const size = 180;

  const skillNames = nodes.map(n => n.label.toLowerCase());

  // Create skill matching categories for better matching
  const skillCategories = {
    "embedded systems": ["arduino", "raspberry pi", "embedded systems", "iot", "sensor integration", "smart home", "prototyping"],
    "web backend": ["python", "fastapi", "django", "postgres", "docker", "express"],
    "web frontend": ["react", "typescript", "tailwind", "javascript", "vue", "angular"],
    "data": ["python", "sql", "postgres", "data engineering", "machine learning"],
    "devops": ["docker", "kubernetes", "aws", "linux", "ci/cd"],
    "mobile": ["android", "ios", "flutter", "react native"],
  };

  // Find all matching roles ranked by compatibility
  const matchedRoles = roleDatabase.map(roleRec => {
    const matchedCount = roleRec.requiredSkills.filter(skill => {
      const skillLower = skill.toLowerCase();
      return skillNames.some(n => 
        n.includes(skillLower) || 
        skillLower.includes(n) ||
        // Fuzzy matching for related skills
        (n.includes("arduino") && skillLower.includes("embedded")) ||
        (n.includes("raspberry") && skillLower.includes("embedded")) ||
        (n.includes("sensor") && skillLower.includes("integration")) ||
        (n.includes("smart home") && skillLower.includes("integration"))
      );
    }).length;
    const matchPercentage = roleRec.requiredSkills.length > 0 
      ? (matchedCount / roleRec.requiredSkills.length) * 100 
      : 0;
    return { 
      ...roleRec, 
      matchedCount,
      matchPercentage,
      successRate: Math.round(matchPercentage * 0.8)
    };
  })
  .filter(role => role.matchPercentage >= 30) // Lower threshold to 30% for better matches
  .sort((a, b) => b.matchPercentage - a.matchPercentage);

  const topRole = matchedRoles[0];

  return (
    <div className="relative rounded-2xl border border-white/10 bg-[#1E293B] p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Career Readiness</h3>
        <div className="flex items-center gap-1 text-sm text-green-400">
          <TrendingUp className="h-4 w-4" />
          <span>{nodes.length} skills</span>
        </div>
      </div>

      {/* Readiness Gauge - Full Circle */}
      <div className="relative w-full flex justify-center">
        <div className="relative w-40 h-40">
          <svg width="160" height="160" className="w-full h-full transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="80"
              cy="80"
              r="60"
              stroke="#334155"
              strokeWidth="8"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="80"
              cy="80"
              r="60"
              stroke="#10B981"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${(clamped / 100) * 2 * Math.PI * 60} ${2 * Math.PI * 60}`}
              strokeLinecap="round"
            />
          </svg>
          {/* Centered Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold text-white">{clamped}%</div>
            <div className="text-xs text-gray-400">Job Readiness</div>
          </div>
        </div>
      </div>

      {/* Top Role Recommendation */}
      {topRole && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Briefcase className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-base font-bold text-white">{topRole.role}</p>
              <p className="text-sm text-gray-400 mt-1">{topRole.description}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-2 py-1 rounded text-xs bg-blue-900/30 text-blue-200">
                  {topRole.minExperience}
                </span>
                <span className="px-2 py-1 rounded text-xs bg-green-900/30 text-green-200">
                  ✓ {topRole.matchPercentage.toFixed(0)}% match
                </span>
                <span className="px-2 py-1 rounded text-xs bg-purple-900/30 text-purple-200">
                  {topRole.successRate}% success
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Companies with Openings */}
      {topRole && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-white flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Top Companies Hiring
          </p>
          <div className="space-y-2">
            {topRole.companies.map(company => (
              <div key={company.name} className="flex items-center justify-between bg-white/5 hover:bg-white/10 p-3 rounded-lg transition">
                <div>
                  <p className="text-sm font-medium text-white">{company.name}</p>
                  <p className="text-xs text-gray-400">
                    {company.level === "fresher" ? "👨‍🎓 Fresher role" : "💼 Experienced"}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-900/30 text-green-200">
                  {company.openings} open
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alternative Roles */}
      {matchedRoles.length > 1 && (
        <div className="space-y-2 border-t border-white/10 pt-4">
          <p className="text-sm font-semibold text-white">Other Good Fits</p>
          <div className="space-y-2">
            {matchedRoles.slice(1, 3).map(alt => (
              <div key={alt.role} className="flex items-center justify-between bg-white/5 p-2 rounded text-xs">
                <span className="text-gray-300">{alt.role}</span>
                <span className="text-green-400">{alt.matchPercentage.toFixed(0)}% match</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warning if low match */}
      {topRole && topRole.matchPercentage < 60 && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3">
          <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-200">
            Learn {topRole.requiredSkills.length > 0 ? 'the missing skills' : 'more skills'} to boost success rate
          </p>
        </div>
      )}
    </div>
  );
}
