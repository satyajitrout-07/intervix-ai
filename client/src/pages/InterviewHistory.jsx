import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../utils/avatar';

export default function InterviewHistory() {
  const navigate = useNavigate();
  const { authFetch, user, logout } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setErrorMsg('');
        const res = await authFetch('/api/interviews/history');
        if (!res.ok) {
          throw new Error('Failed to retrieve history records.');
        }
        const data = await res.json();
        setHistory(data.history || []);
      } catch (err) {
        setErrorMsg(err.message || 'Failed to fetch interview history.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const completed = history.filter((h) => h.status === 'completed');
  const scores = completed.map((h) => h.finalReport?.overallScore || 0);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const bestScore = scores.length > 0 ? Math.max(...scores) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-purple-600 selection:text-white">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3 flex items-center justify-between">
          <Logo to="/dashboard" />
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition"
            >
              Dashboard
            </Link>
            <Link
              to="/dashboard#launch"
              className="text-xs font-bold px-4 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md hover:scale-105 transition"
            >
              + New Interview
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Interview Records & History</h1>
          <p className="text-sm text-slate-400 mt-1">
            Track your score progression and review past technical feedback across all practice rounds.
          </p>
        </div>

        {/* Analytics Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Interviews</span>
            <div className="mt-2 text-3xl font-black text-white">{history.length}</div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">Average Score</span>
            <div className="mt-2 text-3xl font-black text-purple-400">{avgScore}%</div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Highest Score</span>
            <div className="mt-2 text-3xl font-black text-cyan-400">{bestScore}%</div>
          </div>
        </div>

        {/* History List */}
        <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <svg className="w-8 h-8 mx-auto text-purple-400 animate-spin mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Loading your interview records...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="py-16 text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-2xl">
                📂
              </div>
              <h3 className="text-lg font-bold text-white">No Interview Sessions Yet</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Take your first mock technical round to begin tracking your analytics, strengths, and personalized career roadmaps.
              </p>
              <Link
                to="/dashboard"
                className="inline-block px-6 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg transition"
              >
                Launch Your First Interview →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Track</th>
                    <th className="py-3 px-4">Tier & Experience</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Questions</th>
                    <th className="py-3 px-4">Overall Score</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {history.map((item) => {
                    const score = item.finalReport?.overallScore || 0;
                    return (
                      <tr key={item._id} className="hover:bg-slate-900/40 transition">
                        <td className="py-4 px-4 font-bold text-white">{item.track}</td>
                        <td className="py-4 px-4 text-xs">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 mr-1.5">
                            {item.difficulty}
                          </span>
                          <span className="text-slate-500">{item.experienceLevel}</span>
                        </td>
                        <td className="py-4 px-4 text-xs text-slate-400">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-4 text-xs text-slate-400">
                          {item.questions?.length || 0} / {item.totalQuestions}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            score >= 80
                              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                              : score >= 50
                              ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                              : 'bg-red-950/60 text-red-300 border border-red-500/30'
                          }`}>
                            {item.status === 'completed' ? `${score}%` : 'In Progress'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => {
                              if (item.status === 'completed') {
                                navigate(`/interview/report/${item._id}`);
                              } else {
                                navigate(`/interview/${item._id}`);
                              }
                            }}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-purple-600 text-white transition"
                          >
                            {item.status === 'completed' ? 'View Report →' : 'Resume Session →'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

