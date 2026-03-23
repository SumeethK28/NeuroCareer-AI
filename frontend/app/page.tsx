"use client";

import { useEffect, useState } from "react";
import { Maximize2, X } from "lucide-react";
import { ClearMemoryButton } from "@/components/clear-memory-button";
import { ApplicationTrackerInteractive } from "@/components/application-tracker-interactive";
import { JobReadinessGauge } from "@/components/job-readiness-gauge";
import { ReflectionFeed } from "@/components/reflection-feed";
import { ResumeUploadCard } from "@/components/resume-upload-card";
import { SkillEvolutionTree } from "@/components/skill-evolution-tree";
import { AIChatConsole } from "@/components/ai-chat-console";
import { LogoutButton } from "@/components/logout-button";
import { AuthPage } from "@/components/auth-page";
import {
  fetchApplications,
  fetchGhostingInsights,
  fetchLatestReflection,
  fetchSkillTree,
  fetchLatestResume,
  fetchCurrentUser,
  getToken,
} from "@/lib/api-client";

interface PageProps {
  searchParams?: Promise<{ view?: string }>;
}

export default function Home({ searchParams }: PageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [skillTree, setSkillTree] = useState<any>(null);
  const [ghosting, setGhosting] = useState<any>(null);
  const [reflection, setReflection] = useState<any>(null);
  const [applicationLogs, setApplicationLogs] = useState<any>(null);
  const [resumeAnalysis, setResumeAnalysis] = useState<any>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [expandedSkillMap, setExpandedSkillMap] = useState(false);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        console.log("Starting dashboard load...");
        
        // Check if token exists
        const token = getToken();
        console.log("Token in localStorage:", token ? "EXISTS" : "MISSING");
        
        if (!token) {
          console.log("No token found, showing auth page");
          setIsLoggedIn(false);
          setIsLoading(false);
          return;
        }
        
        // Try to fetch current user
        const user = await fetchCurrentUser();
        console.log("Current user:", user);
        setCurrentUser(user);
        setIsLoggedIn(true);

        // Load all dashboard data
        const [skill, ghost, refl, apps, resume] = await Promise.all([
          fetchSkillTree().catch((e) => { console.error("SkillTree error:", e); return null; }),
          fetchGhostingInsights().catch((e) => { console.error("Ghosting error:", e); return { insights: [] }; }),
          fetchLatestReflection().catch((e) => { console.error("Reflection error:", e); return null; }),
          fetchApplications().catch((e) => { console.error("Applications error:", e); return { applications: [] }; }),
          fetchLatestResume().catch((e) => { console.error("Resume error:", e); return null; }),
        ]);

        console.log("Dashboard data loaded", {skill, ghost, refl, apps, resume});
        
        // Check if this is a new user (no resume uploaded yet)
        if (!resume) {
          console.log("New user - showing onboarding");
          setShowOnboarding(true);
        }
        
        setSkillTree(skill);
        setGhosting(ghost);
        setReflection(refl);
        setApplicationLogs(apps);
        setResumeAnalysis(resume);
      } catch (error) {
        console.error("Dashboard load error:", error);
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0F172A]">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <AuthPage />;
  }

  // Show onboarding for new users without resume
  if (showOnboarding && !resumeAnalysis) {
    return (
      <main className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#0F172A]">
        <div className="pointer-events-none absolute inset-0 mesh opacity-90" />
        
        <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
          <header className="flex flex-col gap-4 border-b border-white/10 bg-[#0F172A]/80 px-4 py-4 backdrop-blur-sm sm:px-8 lg:h-20 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl text-white">NeuroCareer AI</h1>
              <p className="text-sm text-gray-400">Your Persistent Career Mentor</p>
            </div>
            <div className="flex items-center gap-4">
              <LogoutButton />
            </div>
          </header>

          <div className="flex flex-1 items-center justify-center p-6">
            <div className="max-w-xl w-full">
              <div className="rounded-2xl border border-white/10 bg-[#1E293B] p-12 text-center">
                <div className="mb-6 text-5xl">🚀</div>
                <h2 className="text-3xl font-bold text-white mb-4">Welcome to NeuroCareer AI!</h2>
                <p className="text-gray-300 mb-8">
                  Let's get started by uploading your resume. This will help us understand your skills, 
                  experience, and guide your career growth.
                </p>
                <div className="rounded-xl border-2 border-dashed border-white/20 p-8 bg-white/5 mb-6">
                  <ResumeUploadCard 
                    initialAnalysis={resumeAnalysis} 
                    backendToken=""
                    onUploadSuccess={() => {
                      setShowOnboarding(false);
                      // Wait 2 seconds to ensure backend commits skill data
                      // before reloading page
                      setTimeout(() => {
                        window.location.reload();
                      }, 2000);
                    }}
                  />
                </div>
                <p className="text-sm text-gray-400">
                  Your resume helps us remember your skills and provide personalized career advice.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const nodes = skillTree?.nodes ?? [];
  const masteredSkills = nodes.filter((node) => (node.progress ?? 0) >= 0.7).length;
  const readiness = nodes.length
    ? Math.round((nodes.reduce((acc, node) => acc + (node.progress ?? 0), 0) / nodes.length) * 100)
    : 42;

  return (
    <main className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#0F172A]">
      <div className="pointer-events-none absolute inset-0 mesh opacity-90" />

      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        {/* Updated Header - removed sidebar, added account */}
        <header className="flex flex-col gap-4 border-b border-white/10 bg-[#0F172A]/80 px-4 py-4 backdrop-blur-sm sm:px-8 lg:h-20 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl text-white">NeuroCareer AI</h1>
            <p className="text-sm text-gray-400">Your Persistent Career Mentor</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="rounded-lg border border-white/10 bg-[#1E293B] px-4 py-2">
              <p className="text-xs text-gray-400">Skills Mastered</p>
              <p className="text-lg text-[#6366F1]">{masteredSkills}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#1E293B] px-3 py-2 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#10B981] to-[#14B8A6] text-xs font-medium text-white">
                {(currentUser.email ?? "U").charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-400">Account</p>
                <p className="text-sm text-white">{currentUser.display_name || currentUser.email}</p>
              </div>
            </div>
            <ClearMemoryButton backendToken="" />
            <LogoutButton />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 overflow-hidden p-6">
          <section className="flex flex-col gap-6 lg:flex-row">
            <div className="flex flex-1 flex-col gap-6">
              <div
                id="neural-map"
                className="overflow-hidden rounded-2xl border border-white/10 bg-[#1E293B] p-6 flex flex-col"
              >
                <div className="mb-6">
                  <h2 className="text-xl text-white">Neural Skill Map</h2>
                  <p className="text-sm text-gray-400">Skills from your projects & internships</p>
                </div>
                <div className="h-64 w-full flex items-center justify-center">
                  <div className="h-full w-full max-w-[500px] flex items-center justify-center">
                    <div className="flex flex-col items-center justify-center gap-6 text-center px-8">
                      <div className="text-5xl">🗺️</div>
                      <h3 className="text-2xl font-bold text-white">Expand to View Skills</h3>
                      <p className="text-base text-gray-300 leading-relaxed">
                        Click the button below to visualize your Neural Skill Map with interactive skill nodes
                      </p>
                      <button
                        onClick={() => setExpandedSkillMap(true)}
                        className="mt-4 flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-lg px-6 py-3 border border-blue-400/30 transition-all hover:scale-105"
                      >
                        <Maximize2 className="h-5 w-5 text-white" />
                        <span className="text-base text-white font-semibold">Expand Skill Map</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Full-screen Skill Map Modal */}
              {expandedSkillMap && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                  <div className="h-[90vh] w-[95vw] rounded-2xl border border-white/10 bg-[#1E293B] p-6 flex flex-col">
                    <div className="mb-6 flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-white">Neural Skill Map</h2>
                        <p className="text-sm text-gray-400">Skills from your projects & internships</p>
                      </div>
                      <button
                        onClick={() => setExpandedSkillMap(false)}
                        className="rounded-lg bg-white/10 p-2 hover:bg-white/20 transition-colors"
                        title="Close fullscreen"
                      >
                        <X className="h-6 w-6 text-white" />
                      </button>
                    </div>
                    <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
                      <div className="h-full w-full max-w-[900px] max-h-[700px] flex items-center justify-center">
                        <SkillEvolutionTree nodes={nodes} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <section id="application-tracker" className="flex flex-col overflow-hidden">
                <ApplicationTrackerInteractive />
              </section>

              <div id="agent-insights" className="overflow-hidden rounded-2xl border border-white/10 bg-[#1E293B] p-6">
                <h2 className="text-lg font-bold text-white mb-4">🤖 Agent Insights</h2>
                <ReflectionFeed
                  backendToken=""
                  reflection={reflection}
                  ghostingInsights={ghosting?.insights ?? []}
                  skills={skillTree?.nodes?.map(n => n.label) ?? []}
                  jobRole="Hardware/Embedded Systems Engineer"
                />
              </div>
            </div>

            <aside className="flex w-full flex-col gap-6 lg:w-96">
              <JobReadinessGauge percentage={readiness} role="Backend Intern" nodes={nodes} />
              <ResumeUploadCard initialAnalysis={resumeAnalysis} backendToken="" />
            </aside>
          </section>
        </div>
      </div>

      <div id="mock-interview">
        <AIChatConsole />
      </div>
    </main>
  );
}
