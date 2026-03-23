"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { logApplication } from "@/lib/api-client";
import type { ApplicationInsight } from "@/lib/types";

type Props = {
  backendToken: string;
  insights: ApplicationInsight[];
};

export function GhostingAnalyst({ backendToken, insights }: Props) {
  const [form, setForm] = useState({
    company: "",
    role: "",
    status: "applied",
    job_description: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const rows =
    insights.length > 0
      ? insights
      : [
          {
            application_id: 0,
            message: "No ghosted applications logged yet.",
            blockers: [],
            recommended_actions: [],
          },
        ];

  const handleSubmit = async (evt: React.FormEvent) => {
    evt.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await logApplication(backendToken, {
        company: form.company,
        role: form.role,
        status: form.status,
        job_description: form.job_description,
      });
      setForm({ company: "", role: "", status: "applied", job_description: "" });
      setMessage("Application logged. I’ll watch for new insights.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to log application.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="glass p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Application Ghosting Analyst</p>
          <h3 className="text-xl font-semibold">Analysis of past applications</h3>
        </div>
        <button className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-300">
          View All History
        </button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-800/80">
        <div className="grid grid-cols-[1.2fr_1.2fr_0.9fr_0.8fr_1fr] gap-2 bg-slate-900/80 px-4 py-3 text-xs uppercase tracking-[0.2em] text-slate-400">
          <span>Company</span>
          <span>Role</span>
          <span>Date applied</span>
          <span>Status</span>
          <span>Action</span>
        </div>
        <div className="divide-y divide-slate-800/80 bg-slate-950/50">
          {rows.map((insight, idx) => (
            <div
              key={`${insight.application_id ?? idx}`}
              className="grid grid-cols-[1.2fr_1.2fr_0.9fr_0.8fr_1fr] gap-2 px-4 py-3 text-sm text-slate-200"
            >
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-lg bg-slate-900" />
                <span>{insight.application_id ? "Company" : "—"}</span>
              </div>
              <div className="text-slate-300">{insight.message}</div>
              <div className="text-slate-500">{insight.application_id ? "Oct 12, 2023" : "—"}</div>
              <div>
                <span className="rounded-full bg-rose-500/20 px-2 py-1 text-xs text-rose-200">
                  {insight.blockers.length ? "Rejected - Skill Gap" : "In Review"}
                </span>
              </div>
              <div className="text-xs text-sky-300">
                {insight.recommended_actions.length
                  ? insight.recommended_actions[0]
                  : "Smart Re-match"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <details className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-4">
        <summary className="cursor-pointer text-sm text-slate-300">Log new application</summary>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              required
              placeholder="Company"
              className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2"
              value={form.company}
              onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))}
            />
            <input
              required
              placeholder="Role"
              className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2"
              value={form.role}
              onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
            />
          </div>
          <select
            className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm"
            value={form.status}
            onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value="applied">Applied</option>
            <option value="interview">Interview</option>
            <option value="offer">Offer</option>
            <option value="rejected">Rejected</option>
            <option value="ghosted">Ghosted</option>
          </select>
          <textarea
            placeholder="Paste JD excerpt or notes..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2"
            rows={3}
            value={form.job_description}
            onChange={(e) => setForm((prev) => ({ ...prev, job_description: e.target.value }))}
          />
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 py-2 font-semibold text-white flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Log application
          </button>
          {message ? <p className="text-sm text-slate-300">{message}</p> : null}
        </form>
      </details>
    </section>
  );
}
