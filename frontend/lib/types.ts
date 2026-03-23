export type SkillTreeNode = {
  id: string;
  label: string;
  progress: number;
  role_alignment: Record<string, number>;
};

export type SkillTreeResponse = {
  nodes: SkillTreeNode[];
  readiness_summary: string;
};

export type ApplicationInsight = {
  application_id?: number;
  message: string;
  blockers: string[];
  recommended_actions: string[];
};

export type ApplicationInsightsResponse = {
  insights: ApplicationInsight[];
};

export type Reflection = {
  timestamp: string;
  suggestion: string;
  metadata?: Record<string, unknown>;
};

export type CareerGrowthSuggestion = {
  suggestion: string;
  missing_skill?: string | null;
  recommended_action?: string | null;
};

export type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ResumeUploadResponse = {
  retained_skills: string[];
  summary: string;
  missing_skills: string[];
  recommended_actions: string[];
};

export type ApplicationLog = {
  id: number;
  company: string;
  role: string;
  status: string;
  applied_at: string;
  job_description?: string | null;
  notes?: string | null;
};

export type ApplicationLogResponse = {
  applications: ApplicationLog[];
};
