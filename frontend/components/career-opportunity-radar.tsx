'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { AlertTriangle, TrendingUp, CheckCircle, ArrowRight, Zap, BookOpen, Github } from 'lucide-react';
import { fetchCareerRadar } from '@/lib/api-client';

interface GhostingApp {
  company: string;
  role: string;
  days_silent: number;
  status: string;
  recommended_action: string;
}

interface MomentumScore {
  score: number;
  trend: 'rising' | 'falling' | 'neutral';
  apps_this_month: number;
  response_rate: number;
}

interface MissingSkill {
  skill: string;
  frequency: number;
  related_companies: string[];
}

interface NextAction {
  action: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  priority: number;
  related_app?: string;
}

interface RadarData {
  momentum_score: MomentumScore;
  ghosting_list: GhostingApp[];
  missing_skills: MissingSkill[];
  next_actions: NextAction[];
}

export function CareerOpportunityRadar() {
  const [radarData, setRadarData] = useState<RadarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchRadarData = async () => {
      if (!session?.backendToken) return;

      try {
        setLoading(true);
        const response = await fetchCareerRadar(session.backendToken);
        setRadarData(response as RadarData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load radar data');
        // Fallback to empty state instead of error
        setRadarData({
          momentum_score: { score: 0, trend: 'neutral', apps_this_month: 0, response_rate: 0 },
          ghosting_list: [],
          missing_skills: [],
          next_actions: [],
        } as RadarData);
      } finally {
        setLoading(false);
      }
    };

    fetchRadarData();
  }, [session?.backendToken, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!radarData) {
    return (
      <div className="bg-[#1E293B] border border-white/10 rounded-lg p-8 text-center">
        <p className="text-gray-400">No application data yet. Add your applications to see insights!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Momentum Score Header - Dark Theme */}
      <div className="bg-gradient-to-r from-[#1E293B] to-[#0F172A] rounded-lg p-6 border border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              Momentum Score
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              <span className="text-blue-400">{radarData.momentum_score.apps_this_month}</span> apps this month • 
              <span className="text-green-400 ml-1">{Math.round(radarData.momentum_score.response_rate * 100)}%</span> response rate
            </p>
            <p className="text-xs text-gray-500 mt-2">💡 Tip: Higher momentum = more interview callbacks. Aim for 70+</p>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold ${
              radarData.momentum_score.score >= 70 ? 'text-green-400' :
              radarData.momentum_score.score >= 40 ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {Math.round(radarData.momentum_score.score)}
            </div>
            <span className={`text-sm font-medium ${
              radarData.momentum_score.trend === 'rising' ? 'text-green-400' :
              radarData.momentum_score.trend === 'falling' ? 'text-red-400' :
              'text-gray-400'
            }`}>
              ↗ {radarData.momentum_score.trend}
            </span>
          </div>
        </div>
      </div>

      {/* 3-Column Layout - Dark Theme */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Ghosting List */}
        <div className="bg-[#1E293B] rounded-lg border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            Ghost Busters
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            💡 Apps quiet for 14+ days. Follow up or archive them.
          </p>

          {radarData.ghosting_list.length === 0 ? (
            <p className="text-sm text-gray-400">✓ All applications active!</p>
          ) : (
            <div className="space-y-3">
              {radarData.ghosting_list.map((app, idx) => (
                <div key={idx} className="bg-red-900/20 border border-red-500/30 rounded p-3 hover:border-red-500/60 transition">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-white">{app.company}</p>
                      <p className="text-sm text-gray-300">{app.role}</p>
                    </div>
                    <span className="text-xs bg-red-900/50 text-red-200 px-2 py-1 rounded">
                      {app.days_silent}d
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 mb-2">{app.recommended_action}</p>
                  <div className="flex gap-2">
                    <button className="flex-1 text-xs bg-blue-900/50 hover:bg-blue-900/80 text-blue-200 px-2 py-1 rounded transition border border-blue-500/30">
                      📧 Follow Up
                    </button>
                    <button className="flex-1 text-xs bg-gray-800/50 hover:bg-gray-800/80 text-gray-300 px-2 py-1 rounded transition border border-white/10">
                      🗑️ Archive
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Center Column: Missing Skills */}
        <div className="bg-[#1E293B] rounded-lg border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Missing Skills
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            💡 Skills companies want but you don't have yet.
          </p>

          {radarData.missing_skills.length === 0 ? (
            <p className="text-sm text-gray-400">✓ You have all the key skills!</p>
          ) : (
            <div className="space-y-3">
              {radarData.missing_skills.slice(0, 5).map((skill, idx) => (
                <div key={idx} className="bg-yellow-900/20 border border-yellow-500/30 rounded p-3 hover:border-yellow-500/60 transition">
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-medium text-white">{skill.skill}</p>
                    <span className="text-xs bg-yellow-900/50 text-yellow-200 px-2 py-1 rounded">
                      {skill.frequency} jobs
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 line-clamp-2 mb-2">
                    Needed by: {skill.related_companies.slice(0, 2).join(', ')}
                  </p>
                  <button className="text-xs text-blue-400 hover:text-blue-300 transition flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    Learn this skill
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Next Best Actions */}
        <div className="bg-[#1E293B] rounded-lg border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            Next Steps
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            💡 AI-suggested actions to boost your chances.
          </p>

          {radarData.next_actions.length === 0 ? (
            <p className="text-sm text-gray-400">You're all set! Keep applying.</p>
          ) : (
            <div className="space-y-3">
              {radarData.next_actions.slice(0, 4).map((action, idx) => (
                <div
                  key={idx}
                  className={`border rounded p-3 hover:opacity-90 transition ${
                    action.impact === 'high'
                      ? 'bg-green-900/20 border-green-500/30'
                      : action.impact === 'medium'
                      ? 'bg-blue-900/20 border-blue-500/30'
                      : 'bg-gray-800/20 border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-white text-sm">{action.action}</p>
                    <span
                      className={`text-xs px-2 py-1 rounded font-medium ${
                        action.impact === 'high'
                          ? 'bg-green-900/50 text-green-200'
                          : action.impact === 'medium'
                          ? 'bg-blue-900/50 text-blue-200'
                          : 'bg-gray-800/50 text-gray-300'
                      }`}
                    >
                      {action.impact}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 mb-2">{action.description}</p>
                  <button className="text-xs text-blue-400 hover:text-blue-300 transition flex items-center gap-1 font-medium">
                    <ArrowRight className="w-3 h-3" />
                    Take action
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats - Dark Theme */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1E293B] rounded-lg p-4 border border-white/10 text-center hover:border-white/20 transition">
          <p className="text-2xl font-bold text-red-400">{radarData.ghosting_list.length}</p>
          <p className="text-xs text-gray-400 mt-1">Apps Silent</p>
        </div>
        <div className="bg-[#1E293B] rounded-lg p-4 border border-white/10 text-center hover:border-white/20 transition">
          <p className="text-2xl font-bold text-yellow-400">{radarData.missing_skills.length}</p>
          <p className="text-xs text-gray-400 mt-1">Missing Skills</p>
        </div>
        <div className="bg-[#1E293B] rounded-lg p-4 border border-white/10 text-center hover:border-white/20 transition">
          <p className="text-2xl font-bold text-green-400">{radarData.next_actions.length}</p>
          <p className="text-xs text-gray-400 mt-1">Action Items</p>
        </div>
        <div className="bg-[#1E293B] rounded-lg p-4 border border-white/10 text-center hover:border-white/20 transition">
          <p className="text-2xl font-bold text-blue-400">{Math.round(radarData.momentum_score.score)}</p>
          <p className="text-xs text-gray-400 mt-1">Momentum</p>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <button 
          onClick={handleRefresh}
          className="text-sm text-gray-400 hover:text-gray-300 border border-white/10 hover:border-white/20 rounded px-4 py-2 transition"
        >
          🔄 Refresh Data
        </button>
      </div>
    </div>
  );
}
