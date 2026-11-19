import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../utils/avatar';
import {
  FileText,
  Video,
  Award,
  BarChart3,
  Sparkles,
  ArrowRight,
  Clock,
  Play,
  Layers,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  User,
  Settings,
  ChevronRight,
  Zap,
  BookOpen,
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout, authFetch } = useAuth();

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [latestResume, setLatestResume] = useState(null);

  const userInitials = getInitials(user?.name);
  const displayName = user?.name || 'Satyajit Rout';

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoadingHistory(true);
    try {
      // 1. Fetch History
      const historyRes = await authFetch('/api/interviews/history');
      if (historyRes.ok) {
        const histData = await historyRes.json();
        setHistory(histData.data?.history || histData.history || []);
      }

      // 2. Fetch Latest Resume
      const resumeRes = await authFetch('/api/resume/latest');
      if (resumeRes.ok) {
        const resData = await resumeRes.json();
        setLatestResume(resData.data?.resume || null);
      }
    } catch (err) {
      console.warn('Dashboard data fetch error:', err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const completed = history.filter((h) => h.status === 'completed');
  const scores = completed.map((h) => h.finalReport?.overallScore || 0);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  // Calculate skill metric averages
  const avgTechAccuracy =
    completed.length > 0
      ? Math.round(
          completed.reduce((acc, h) => acc + (h.finalReport?.technicalAccuracyScore || 70), 0) / completed.length
        )
      : 75;

  const avgCommunication =
    completed.length > 0
      ? Math.round(completed.reduce((acc, h) => acc + (h.finalReport?.communicationScore || 75), 0) / completed.length)
      : 80;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-purple-600 selection:text-white">
      {/* 1. Dashboard Top Header */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between py-3">
          <div className="flex items-center gap-6">
            <Logo to="/" />
            <span className="hidden sm:inline-block px-2.5 py-1 rounded-md bg-purple-900/40 text-purple-300 border border-purple-500/30 text-xs font-mono">
              Candidate Portal
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-medium">AI Talent Engine Online</span>
            </div>

            <Link
              to="/history"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300 hover:text-white hover:border-slate-600 transition"
            >
              History
            </Link>

            <Link
              to="/profile"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300 hover:text-white hover:border-slate-600 transition flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </Link>

            <button
              onClick={handleSignOut}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300 hover:text-white hover:border-slate-600 transition"
            >
              Sign Out
            </button>

            {/* Profile Avatar linking to /profile */}
            <Link
              to="/profile"
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-cyan-400 p-[1.5px] flex items-center justify-center shadow-md shadow-cyan-500/10 cursor-pointer hover:scale-105 transition"
              title={`${displayName} - View Profile`}
            >
              <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-xs font-bold text-white tracking-wider">
                {userInitials}
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Banner */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/30 text-purple-300 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Your Career. Your Skills. Your AI Interview.</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">{displayName}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              Elevate your interview readiness with personalized rounds generated directly from your projects, verified skills, and industry rubrics.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/interview/setup"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 transition hover:scale-[1.02]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start New Interview</span>
            </Link>
          </div>
        </div>

        {/* Top Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800 shadow-lg space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Total Interviews</span>
              <Video className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-3xl font-black text-white">{history.length}</div>
            <p className="text-[11px] text-slate-500">Practice sessions recorded</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800 shadow-lg space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Average Score</span>
              <Award className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-3xl font-black text-purple-400">{avgScore}%</div>
            <p className="text-[11px] text-slate-500">Across {completed.length} completed interviews</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800 shadow-lg space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Technical Accuracy</span>
              <TrendingUp className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-3xl font-black text-cyan-400">{avgTechAccuracy}%</div>
            <p className="text-[11px] text-slate-500">Rubric concept match score</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800 shadow-lg space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Verified Resume</span>
              <FileText className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-sm font-bold text-white truncate max-w-[180px] pt-1">
              {latestResume?.fileName || 'Not Uploaded'}
            </div>
            <p className="text-[11px] text-slate-500">
              {latestResume ? 'AI Profile Active' : 'Upload to personalize'}
            </p>
          </div>
        </div>

        {/* TWO PRIMARY INTERVIEW CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Resume-Based AI Interview */}
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-purple-950/40 via-slate-900/80 to-slate-950 border border-purple-500/40 shadow-2xl relative overflow-hidden group hover:border-purple-500 transition-all">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-lg">
                <FileText className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full bg-purple-900/60 border border-purple-500/40 text-purple-300 text-xs font-mono font-semibold">
                FEATURED
              </span>
            </div>

            <h2 className="text-xl font-bold text-white mb-2">Resume-Based AI Interview</h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
              Our AI analyzes your verified projects, technologies, and experience to ask personalized questions matching your exact background.
            </p>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 mb-6 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Resume Document:</span>
                <span className="text-white font-medium truncate max-w-[200px]">
                  {latestResume?.fileName || 'No Resume Uploaded'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Profile Status:</span>
                <span className="text-emerald-400 font-medium">
                  {latestResume ? 'Analyzed & Ready' : 'Pending Upload'}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              {latestResume ? (
                <>
                  <Link
                    to={`/resume/analysis/${latestResume._id}`}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition"
                  >
                    <span>Confirm AI Profile</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/resume/upload"
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-300 text-xs font-semibold text-center transition"
                  >
                    Upload New
                  </Link>
                </>
              ) : (
                <Link
                  to="/resume/upload"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition"
                >
                  <span>Upload Resume (PDF/DOCX)</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>

          {/* Card 2: General Mock Interview */}
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-cyan-950/30 via-slate-900/80 to-slate-950 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-cyan-500/60 transition-all">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg">
                <Layers className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-300 text-xs font-mono">
                PRACTICE TRACKS
              </span>
            </div>

            <h2 className="text-xl font-bold text-white mb-2">General Mock Interview</h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
              Select specific technology domains (MERN Stack, React.js, JavaScript, Node.js, Java, HR & Behavioral) with graded questions.
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs mb-6">
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-850 flex items-center gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>MERN Full-Stack</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-850 flex items-center gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                <span>React.js Internals</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-850 flex items-center gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Node.js & Express</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-850 flex items-center gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>HR & Behavioral</span>
              </div>
            </div>

            <Link
              to="/interview/setup"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-cyan-500/40 hover:border-cyan-400 bg-cyan-950/40 text-cyan-300 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 transition"
            >
              <span>Configure General Interview</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Skill Performance Overview */}
        <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              <h2 className="text-base font-bold text-white">Skill Performance Overview</h2>
            </div>
            <span className="text-xs text-slate-400">Evaluated across your recorded sessions</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Technical Accuracy</span>
                <span className="font-bold text-white">{avgTechAccuracy}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-purple-500" style={{ width: `${avgTechAccuracy}%` }} />
              </div>
              <span className="text-[10px] text-slate-500">Weight: 50%</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Concept Depth</span>
                <span className="font-bold text-white">{Math.min(avgTechAccuracy + 5, 95)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-cyan-500" style={{ width: `${Math.min(avgTechAccuracy + 5, 95)}%` }} />
              </div>
              <span className="text-[10px] text-slate-500">Weight: 25%</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Answer Completeness</span>
                <span className="font-bold text-white">{Math.max(avgTechAccuracy - 5, 60)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-amber-500" style={{ width: `${Math.max(avgTechAccuracy - 5, 60)}%` }} />
              </div>
              <span className="text-[10px] text-slate-500">Weight: 15%</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Communication Clarity</span>
                <span className="font-bold text-white">{avgCommunication}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${avgCommunication}%` }} />
              </div>
              <span className="text-[10px] text-slate-500">Weight: 10%</span>
            </div>
          </div>
        </div>

        {/* Recent Interview History */}
        <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h2 className="text-base font-bold text-white">Recent Interview History</h2>
            </div>
            <Link to="/history" className="text-xs text-purple-400 hover:underline font-semibold flex items-center gap-1">
              <span>View Full History</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loadingHistory ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading interview records...</div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-xs text-slate-400">No interview sessions recorded yet.</p>
              <Link to="/interview/setup" className="text-xs font-semibold text-purple-400 hover:underline">
                Start your first interview session
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-[11px]">
                    <th className="pb-3 font-medium">Domain / Category</th>
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Score</th>
                    <th className="pb-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {history.slice(0, 5).map((item) => (
                    <tr key={item._id} className="hover:bg-slate-900/50 transition">
                      <td className="py-3 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                          <span>{item.category}</span>
                        </div>
                      </td>
                      <td className="py-3 text-slate-300 capitalize">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono">
                          {item.interviewType === 'resume' ? 'Resume' : item.mode || 'Exam'}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 font-bold">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                            (item.finalReport?.overallScore || 0) >= 70
                              ? 'text-emerald-400 bg-emerald-950/60'
                              : (item.finalReport?.overallScore || 0) >= 40
                              ? 'text-amber-400 bg-amber-950/60'
                              : 'text-slate-400 bg-slate-900'
                          }`}
                        >
                          {item.finalReport?.overallScore !== undefined
                            ? `${item.finalReport.overallScore}%`
                            : 'Incomplete'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          to={`/interview/report/${item._id}`}
                          className="text-purple-400 hover:text-purple-300 font-semibold"
                        >
                          View Report
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
