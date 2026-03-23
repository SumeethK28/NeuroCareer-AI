"use client";

import { useMemo, useState } from "react";
import { Building2, Calendar, CheckCircle, Clock, Sparkles, XCircle } from "lucide-react";

import { logApplication } from "@/lib/api-client";
import type { ApplicationInsight, ApplicationLog } from "@/lib/types";

type Props = {
  backendToken: string;
  applications: ApplicationLog[];
  insights: ApplicationInsight[];
};

const statusConfig = {
  rejected: {
    icon: XCircle,
    text: "Rejected",
    bg: "bg-red-500/10",
    textColor: "text-red-400",
    border: "border-red-500/30",
  },
  applied: {
    icon: Clock,
    text: "Pending",
    bg: "bg-yellow-500/10",
    textColor: "text-yellow-400",
    border: "border-yellow-500/30",
  },
  pending: {
    icon: Clock,
    text: "Pending",
    bg: "bg-yellow-500/10",
    textColor: "text-yellow-400",
    border: "border-yellow-500/30",
  },
  interview: {
    icon: CheckCircle,
    text: "Interview",
    bg: "bg-blue-500/10",
    textColor: "text-blue-400",
    border: "border-blue-500/30",
  },
  offer: {
    icon: CheckCircle,
    text: "Offer",
    bg: "bg-[#10B981]/10",
    textColor: "text-[#10B981]",
    border: "border-[#10B981]/30",
  },
  ghosted: {
    icon: Clock,
    text: "Ghosted",
    bg: "bg-slate-500/10",
    textColor: "text-slate-300",
    border: "border-slate-500/30",
  },
} as const;

export function ApplicationTracker({ backendToken, applications, insights }: Props) {
  const [entries, setEntries] = useState<ApplicationLog[]>(applications);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    company: "",
    role: "",
    status: "applied",
    job_description: "",
  });

  const rows = entries.length
    ? entries
    : [
        {
          id: 0,
          company: "No entries",
          role: "Log your first application",
          status: "applied",
          applied_at: "",
        },
      ];

  const stats = useMemo(() => {
    const totals = {
      total: entries.length,
      pending: entries.filter((a) => a.status === "applied" || a.status === "pending").length,
      interviews: entries.filter((a) => a.status === "interview").length,
      rejected: entries.filter((a) => a.status === "rejected").length,
    };
    return totals;
  }, [entries]);

  const gapFallback = insights[0]?.blockers?.[0] ?? "No gaps identified";

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
      setEntries((prev) => [
        {
          id: Date.now(),
          company: form.company,
          role: form.role,
          status: form.status,
          applied_at: new Date().toISOString(),
          job_description: form.job_description,
        },
        ...prev,
      ]);
      setForm({ company: "", role: "", status: "applied", job_description: "" });
      setMessage("Application logged. I’ll watch for new insights.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to log application.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#1E293B] p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl text-white">Application Analytics</h2>
          <p className="text-sm text-gray-400">Track your job applications and skill gaps</p>
        </div>
        <button
          className="rounded-lg bg-[#6366F1] px-4 py-2 text-sm text-white transition-colors hover:bg-[#5558E3]"
          onClick={() => setFormOpen((prev) => !prev)}
        >
          + New Application
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-12 gap-4 border-b border-white/10 px-4 py-3 text-sm text-gray-400">
            <div className="col-span-3">Company & Role</div>
            <div className="col-span-2">Applied Date</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-3">Skill Gap</div>
            <div className="col-span-2">Action</div>
          </div>

          <div className="mt-2 space-y-2">
            {rows.map((app, index) => {
              const config =
                statusConfig[(app.status as keyof typeof statusConfig) ?? "applied"] ?? statusConfig.applied;
              const Icon = config.icon;
              const applied = app.applied_at ? new Date(app.applied_at).toLocaleDateString() : "—";
              const actionText = app.status === "rejected" ? "Re-match" : "View";
              return (
                <div
                  key={`${app.id}-${index}`}
                  className="group grid grid-cols-12 gap-4 rounded-xl border border-transparent bg-[#0F172A]/50 px-4 py-4 transition-all hover:border-white/10 hover:bg-[#0F172A]/70"
                >
                  <div className="col-span-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#6366F1] to-[#8B5CF6]">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white">{app.company}</p>
                      <p className="text-xs text-gray-400">{app.role}</p>
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center gap-2 text-gray-300">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{applied}</span>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <div className={`flex items-center gap-2 rounded-full border px-3 py-1 ${config.bg} ${config.border}`}>
                      <Icon className={`h-4 w-4 ${config.textColor}`} />
                      <span className={`text-sm ${config.textColor}`}>{config.text}</span>
                    </div>
                  </div>
                  <div className="col-span-3 flex items-center">
                    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-sm text-yellow-400">
                      {gapFallback}
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center">
                    {app.status === "rejected" ? (
                      <button className="flex items-center gap-2 rounded-lg bg-[#10B981] px-4 py-2 text-sm text-white transition-colors hover:bg-[#0D9668]">
                        <Sparkles className="h-4 w-4" />
                        {actionText}
                      </button>
                    ) : (
                      <button className="rounded-lg px-4 py-2 text-sm text-gray-400 transition-colors hover:text-gray-300">
                        {actionText}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-6 text-center sm:grid-cols-4">
        <div>
          <p className="text-2xl text-white">{stats.total}</p>
          <p className="text-xs text-gray-400">Total Applied</p>
        </div>
        <div>
          <p className="text-2xl text-yellow-400">{stats.pending}</p>
          <p className="text-xs text-gray-400">Pending</p>
        </div>
        <div>
          <p className="text-2xl text-blue-400">{stats.interviews}</p>
          <p className="text-xs text-gray-400">Interviews</p>
        </div>
        <div>
          <p className="text-2xl text-red-400">{stats.rejected}</p>
          <p className="text-xs text-gray-400">Rejected</p>
        </div>
      </div>

      {formOpen ? (
        <form onSubmit={handleSubmit} className="mt-6 space-y-3 rounded-xl border border-white/10 bg-[#0F172A]/60 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              required
              placeholder="Company"
              className="rounded-xl border border-white/10 bg-[#0F172A] px-3 py-2 text-sm text-white placeholder-gray-500"
              value={form.company}
              onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))}
            />
            <input
              required
              placeholder="Role"
              className="rounded-xl border border-white/10 bg-[#0F172A] px-3 py-2 text-sm text-white placeholder-gray-500"
              value={form.role}
              onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
            />
          </div>
          <select
            className="w-full rounded-xl border border-white/10 bg-[#0F172A] px-3 py-2 text-sm text-white"
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
            className="w-full rounded-xl border border-white/10 bg-[#0F172A] px-3 py-2 text-sm text-white placeholder-gray-500"
            rows={3}
            value={form.job_description}
            onChange={(e) => setForm((prev) => ({ ...prev, job_description: e.target.value }))}
          />
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-[#6366F1] py-2 text-sm font-semibold text-white hover:bg-[#5558E3]"
          >
            {saving ? "Saving..." : "Save Application"}
          </button>
          {message ? <p className="text-sm text-gray-300">{message}</p> : null}
        </form>
      ) : null}
    </div>
  );
}
