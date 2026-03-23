'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, Check, AlertCircle, TrendingUp } from 'lucide-react';
import { 
  fetchApplications, 
  logApplication, 
  updateApplication, 
  deleteApplication,
  fetchSmartApplicationAnalysis 
} from '@/lib/api-client';

interface Application {
  id: number;
  company: string;
  role: string;
  status: 'applied' | 'under_review' | 'rejected' | 'offered';
  applied_at: string;
  job_description: string;
  notes: string;
}

interface SmartAnalysis {
  summary: string;
  overall_health: 'green' | 'yellow' | 'red' | 'gray';
  applications_analysis: Array<{
    id: number;
    company: string;
    role: string;
    status: string;
    health: string;
    days_since_application: number;
    last_activity: string;
  }>;
  stats: {
    total_applications: number;
    active: number;
    under_review: number;
    ghosted_or_rejected: number;
  };
  recommendations: string[];
}

const statusColors = {
  applied: 'bg-blue-900/30 text-blue-200 border-blue-500/30',
  under_review: 'bg-yellow-900/30 text-yellow-200 border-yellow-500/30',
  rejected: 'bg-red-900/30 text-red-200 border-red-500/30',
  offered: 'bg-green-900/30 text-green-200 border-green-500/30',
};

const statusEmoji = {
  applied: '📤',
  under_review: '⏳',
  rejected: '❌',
  offered: '✅',
};

export function ApplicationTrackerInteractive() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [smartAnalysis, setSmartAnalysis] = useState<SmartAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    company: '',
    role: '',
    status: 'applied' as const,
    job_description: '',
    notes: '',
  });

  // Fetch applications on mount
  useEffect(() => {
    fetchApplicationsList();
  }, []);

  const fetchApplicationsList = async () => {
    try {
      setLoading(true);
      const [appResponse, analysisResponse] = await Promise.all([
        fetchApplications(),
        fetchSmartApplicationAnalysis().catch(() => null)
      ]);
      
      setApplications(appResponse.applications || []);
      if (analysisResponse) {
        setSmartAnalysis(analysisResponse);
      }
    } catch (err) {
      console.error('Failed to fetch applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        // Update existing
        await updateApplication(editingId, formData);
      } else {
        // Create new
        await logApplication(formData);
      }
      
      // Refresh list and reset form
      await fetchApplicationsList();
      setShowForm(false);
      setEditingId(null);
      setFormData({
        company: '',
        role: '',
        status: 'applied',
        job_description: '',
        notes: '',
      });
    } catch (err) {
      console.error('Failed to save application:', err);
    }
  };

  const handleEdit = (app: Application) => {
    setFormData({
      company: app.company,
      role: app.role,
      status: app.status,
      job_description: app.job_description,
      notes: app.notes,
    });
    setEditingId(app.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this application?')) return;

    try {
      await deleteApplication(id);
      await fetchApplicationsList();
    } catch (err) {
      console.error('Failed to delete application:', err);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      company: '',
      role: '',
      status: 'applied',
      job_description: '',
      notes: '',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Application Tracker</h2>
          <p className="text-sm text-gray-400 mt-1">Track all your job applications and monitor progress</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-5 h-5" />
            Add Application
          </button>
        )}
      </div>

      {/* Smart Analysis Section */}
      {smartAnalysis && smartAnalysis.applications_analysis.length > 0 && (
        <div className="bg-gradient-to-b from-[#1E293B] to-[#0F172A] border border-white/10 rounded-lg p-6 shadow-xl">
          {/* Header with Health Indicator */}
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl font-bold ${
              smartAnalysis.overall_health === 'green' ? 'bg-green-900/30 text-green-400' :
              smartAnalysis.overall_health === 'yellow' ? 'bg-yellow-900/30 text-yellow-400' :
              smartAnalysis.overall_health === 'red' ? 'bg-red-900/30 text-red-400' :
              'bg-gray-900/30 text-gray-400'
            }`}>
              {smartAnalysis.overall_health === 'green' ? '✅' :
               smartAnalysis.overall_health === 'yellow' ? '⚠️' :
               smartAnalysis.overall_health === 'red' ? '🚨' :
               '❓'}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white">Smart Application Analysis</h3>
              <p className="text-sm text-gray-300 mt-1">{smartAnalysis.summary}</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#0F172A] rounded-lg p-4 border border-white/5">
              <p className="text-xs text-gray-400 mb-1">Total Applications</p>
              <p className="text-2xl font-bold text-white">{smartAnalysis.stats.total_applications}</p>
            </div>
            <div className="bg-[#0F172A] rounded-lg p-4 border border-white/5">
              <p className="text-xs text-gray-400 mb-1">Active/Positive</p>
              <p className="text-2xl font-bold text-green-400">{smartAnalysis.stats.active}</p>
            </div>
            <div className="bg-[#0F172A] rounded-lg p-4 border border-white/5">
              <p className="text-xs text-gray-400 mb-1">Under Review</p>
              <p className="text-2xl font-bold text-yellow-400">{smartAnalysis.stats.under_review}</p>
            </div>
            <div className="bg-[#0F172A] rounded-lg p-4 border border-white/5">
              <p className="text-xs text-gray-400 mb-1">Ghosted/Rejected</p>
              <p className="text-2xl font-bold text-red-400">{smartAnalysis.stats.ghosted_or_rejected}</p>
            </div>
          </div>

          {/* Recommendations */}
          {smartAnalysis.recommendations.length > 0 && (
            <div className="border-t border-white/10 pt-6">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                AI-Powered Recommendations
              </h4>
              <div className="space-y-3">
                {smartAnalysis.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-3 bg-[#0F172A] rounded-lg p-4 border border-white/5">
                    <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-200">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Analysis */}
          {smartAnalysis.applications_analysis.length > 0 && (
            <div className="border-t border-white/10 pt-6 mt-6">
              <h4 className="text-lg font-bold text-white mb-4">Application Health Check</h4>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {smartAnalysis.applications_analysis.map((app) => (
                  <div key={app.id} className={`flex items-start justify-between p-4 rounded-lg border ${
                    app.health === 'green' ? 'bg-green-900/20 border-green-500/30' :
                    app.health === 'yellow' ? 'bg-yellow-900/20 border-yellow-500/30' :
                    app.health === 'red' ? 'bg-red-900/20 border-red-500/30' :
                    'bg-gray-900/20 border-gray-500/30'
                  }`}>
                    <div className="flex-1">
                      <p className="font-semibold text-white">{app.company}</p>
                      <p className="text-xs text-gray-400 mt-1">{app.role}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Applied {app.days_since_application} days ago
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        app.health === 'green' ? 'bg-green-500/20 text-green-300' :
                        app.health === 'yellow' ? 'bg-yellow-500/20 text-yellow-300' :
                        app.health === 'red' ? 'bg-red-500/20 text-red-300' :
                        'bg-gray-500/20 text-gray-300'
                      }`}>
                        {app.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-gradient-to-b from-[#1E293B] to-[#0F172A] border border-white/10 rounded-lg p-8 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-bold text-white">
                {editingId ? '✏️ Edit Application' : '➕ Add New Application'}
              </h3>
              <p className="text-sm text-gray-400 mt-1">Fill in the details to track your application</p>
            </div>
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company & Role Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  🏢 Company Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full bg-[#0F172A] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition"
                  placeholder="e.g., Google, Microsoft, Amazon"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  💼 Role <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-[#0F172A] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition"
                  placeholder="e.g., Backend Engineer Intern"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                📊 Application Status <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full bg-[#0F172A] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition cursor-pointer"
              >
                <option value="applied">📤 Applied</option>
                <option value="under_review">⏳ Under Review</option>
                <option value="rejected">❌ Rejected</option>
                <option value="offered">✅ Offered</option>
              </select>
            </div>

            {/* Job Description */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                📋 Job Description
              </label>
              <p className="text-xs text-gray-400 mb-2">💡 Paste the job description to help AI analyze required skills</p>
              <textarea
                value={formData.job_description}
                onChange={(e) => setFormData({ ...formData, job_description: e.target.value })}
                className="w-full bg-[#0F172A] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition h-28 resize-none"
                placeholder="Paste the full job description here..."
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                📝 Notes & Reminders
              </label>
              <p className="text-xs text-gray-400 mb-2">Add follow-up dates, interview feedback, or personal notes</p>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full bg-[#0F172A] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition h-24 resize-none"
                placeholder="e.g., Follow up by March 25, HR name: John Smith, etc."
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 justify-end pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2.5 border border-white/20 hover:border-white/40 text-gray-300 hover:text-white rounded-lg transition font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition font-medium flex items-center gap-2 shadow-lg"
              >
                <Check className="w-5 h-5" />
                {editingId ? 'Update Application' : 'Save Application'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Applications List */}
      <div className="bg-[#1E293B] border border-white/10 rounded-lg overflow-hidden">
        {applications.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-400">No applications yet. Click "Add Application" to get started!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0F172A] border-b border-white/10">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-300">Company</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-300">Role</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-300">Status</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-300">Applied</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id} className="border-b border-white/5 hover:bg-[#0F172A]/50 transition">
                    <td className="px-6 py-4">
                      <p className="font-medium text-white">{app.company}</p>
                      {app.notes && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-1">{app.notes}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white">{app.role}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${statusColors[app.status]}`}>
                        {statusEmoji[app.status]} {app.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-400">
                        {new Date(app.applied_at).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(app)}
                          className="p-2 hover:bg-blue-900/30 text-blue-400 hover:text-blue-300 rounded transition"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(app.id)}
                          className="p-2 hover:bg-red-900/30 text-red-400 hover:text-red-300 rounded transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Stats Footer */}
        {applications.length > 0 && (
          <div className="bg-[#0F172A] border-t border-white/10 px-6 py-4 grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-400">Total Applications</p>
              <p className="text-xl font-bold text-white">{applications.length}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Applied</p>
              <p className="text-xl font-bold text-blue-400">
                {applications.filter(a => a.status === 'applied').length}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Under Review</p>
              <p className="text-xl font-bold text-yellow-400">
                {applications.filter(a => a.status === 'under_review').length}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Offers</p>
              <p className="text-xl font-bold text-green-400">
                {applications.filter(a => a.status === 'offered').length}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
