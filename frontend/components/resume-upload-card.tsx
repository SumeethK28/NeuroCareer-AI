"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, AlertCircle, CheckCircle, Lightbulb, RefreshCw } from "lucide-react";

import { uploadResume } from "@/lib/api-client";
import type { ResumeUploadResponse } from "@/lib/types";

type Props = {
  initialAnalysis?: ResumeUploadResponse | null;
  backendToken?: string;
  onUploadSuccess?: () => void;
};

export function ResumeUploadCard({ initialAnalysis, backendToken, onUploadSuccess }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ResumeUploadResponse | null>(initialAnalysis ?? null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleFile = async (evt: React.ChangeEvent<HTMLInputElement>) => {
    const file = evt.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setStatus(null);
    try {
      const response = await uploadResume(file);
      setStatus(`✓ Analyzed resume - Found ${response.retained_skills.length} proven skills`);
      setAnalysis(response);
      // Call the success callback if provided
      if (onUploadSuccess) {
        // Wait 2 seconds to ensure backend commits skill data before callback
        setTimeout(() => {
          onUploadSuccess();
        }, 2000);
      } else {
        // Otherwise do router refresh (wait 2 seconds for backend to commit)
        setTimeout(() => {
          router.refresh();
        }, 2000);
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to parse resume.");
    } finally {
      setLoading(false);
      evt.target.value = "";
    }
  };

  const handleUpdateClick = () => {
    setIsUpdating(true);
    setAnalysis(null);
    setStatus(null);
  };

  // If resume already uploaded, show summary with update option
  if (analysis && !isUpdating) {
    return (
      <section className="rounded-2xl border border-white/10 bg-[#1E293B] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#0F172A]/80 p-2">
              <CheckCircle className="h-5 w-5 text-[#10B981]" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Resume Intelligence</p>
              <h3 className="text-lg font-semibold text-white">Resume Synced</h3>
            </div>
          </div>
          <button
            onClick={handleUpdateClick}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Update
          </button>
        </div>

        <div className="space-y-4 rounded-xl border border-white/10 bg-[#0F172A]/60 p-4">
          {/* Summary */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-2">Overview</p>
            <p className="text-sm text-gray-300 leading-relaxed">{analysis.summary}</p>
          </div>

          {/* Skills Found */}
          {analysis.retained_skills.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-2">
                ✓ Skills Identified ({analysis.retained_skills.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {analysis.retained_skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 rounded-full text-xs bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Missing Skills */}
          {analysis.missing_skills.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-2 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-yellow-500" />
                Skill Gaps ({analysis.missing_skills.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {analysis.missing_skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-200 border border-yellow-500/30"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommended_actions.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-2 flex items-center gap-1">
                <Lightbulb className="h-3 w-3 text-[#A78BFA]" />
                Next Steps
              </p>
              <ul className="space-y-2">
                {analysis.recommended_actions.map((action, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-300">
                    <span className="text-[#6366F1]">→</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    );
  }

  // Upload mode (initial or updating)
  return (
    <section className="rounded-2xl border border-white/10 bg-[#1E293B] p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-[#0F172A]/80 p-2">
          <Upload className="h-5 w-5 text-[#6366F1]" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Resume Intelligence</p>
          <h3 className="text-lg font-semibold text-white">{isUpdating ? "Update your PDF" : "Sync your latest PDF"}</h3>
        </div>
      </div>
      <label className="block cursor-pointer rounded-2xl border border-dashed border-white/10 bg-[#0F172A]/60 p-4 text-center hover:border-[#6366F1]/50 transition-colors">
        <input type="file" accept="application/pdf" className="hidden" onChange={handleFile} />
        {loading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-slate-200" />
            <p className="text-xs text-gray-400">Analyzing your resume...</p>
          </div>
        ) : (
          <p className="text-sm text-gray-300">Drop a PDF to extract skills from projects & internships</p>
        )}
      </label>
      
      {status && (
        <div className="rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 p-2 text-sm text-[#10B981] flex items-start gap-2">
          <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{status}</span>
        </div>
      )}

      {analysis && isUpdating && (
        <div className="space-y-4 rounded-xl border border-white/10 bg-[#0F172A]/60 p-4">
          {/* Summary */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-2">Overview</p>
            <p className="text-sm text-gray-300 leading-relaxed">{analysis.summary}</p>
          </div>

          {/* Skills Found */}
          {analysis.retained_skills.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-2">
                ✓ Skills Identified ({analysis.retained_skills.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {analysis.retained_skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 rounded-full text-xs bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Missing Skills */}
          {analysis.missing_skills.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-2 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-yellow-500" />
                Skill Gaps ({analysis.missing_skills.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {analysis.missing_skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-200 border border-yellow-500/30"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommended_actions.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-2 flex items-center gap-1">
                <Lightbulb className="h-3 w-3 text-[#A78BFA]" />
                Next Steps
              </p>
              <ul className="space-y-2">
                {analysis.recommended_actions.map((action, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-300">
                    <span className="text-[#6366F1]">→</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
