import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';

export default function InterviewReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authFetch, user } = useAuth();

  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [expandedQuestion, setExpandedQuestion] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const res = await authFetch(`/api/interviews/${id}`);
        if (!res.ok) {
          throw new Error('Interview report not found.');
        }
        const data = await res.json();
        setInterview(data.interview);
      } catch (err) {
        setErrorMsg(err.message || 'Failed to load report.');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-400 p-[2px] animate-pulse mb-6">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
            <svg className="w-8 h-8 text-purple-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Generating Comprehensive Report...</h2>
        <p className="text-sm text-slate-400">Compiling rubric evaluation and category metrics.</p>
      </div>
    );
  }

  if (errorMsg || !interview) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
        <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900 border border-red-500/30 text-center">
          <h3 className="text-lg font-bold text-white mb-2">Report Not Found</h3>
          <p className="text-sm text-red-300 mb-6">{errorMsg || 'Could not load interview session.'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const report = interview.finalReport || {};
  const overallScore = report.overallScore || 0;

  let gradeBadge = 'Outstanding';
  let gradeColor = 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40';
  if (overallScore < 50) {
    gradeBadge = 'Needs Revision';
    gradeColor = 'text-red-400 border-red-500/40 bg-red-950/40';
  } else if (overallScore < 80) {
    gradeBadge = 'Competent (Mid-Tier)';
    gradeColor = 'text-amber-400 border-amber-500/40 bg-amber-950/40';
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-purple-600 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3 flex items-center justify-between">
          <Logo to="/dashboard" />
          <div className="flex items-center gap-3">
            <Link
              to="/history"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition"
            >
              All Past Interviews
            </Link>
            <Link
              to="/dashboard"
              className="text-xs font-bold px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition shadow-md"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Banner with Overall Score & Summary */}
        <div className="p-6 sm:p-10 rounded-3xl bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-slate-800 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-950/50 text-purple-300 text-xs font-mono">
              <span>Verified AI Evaluation</span>
              <span>•</span>
              <span>{interview.track}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white">
              Technical Performance Assessment
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              {report.summaryFeedback || 'Detailed review of candidate answers across technical precision, system design principles, and problem-solving velocity.'}
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-xs text-slate-400 justify-center lg:justify-start">
              <span>Difficulty: <strong className="text-white">{interview.difficulty}</strong></span>
              <span>•</span>
              <span>Level: <strong className="text-white">{interview.experienceLevel}</strong></span>
              <span>•</span>
              <span>Date: <strong className="text-white">{new Date(interview.createdAt).toLocaleDateString()}</strong></span>
            </div>
          </div>

          {/* Big Score Gauge Card */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-xl min-w-[220px]">
            <span className="text-xs font-extrabold tracking-widest uppercase text-slate-400 mb-1">
              Overall Score
            </span>
            <div className="text-5xl font-black bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent my-2">
              {overallScore}%
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${gradeColor}`}>
              {gradeBadge}
            </span>
          </div>
        </div>

        {/* KPI Metrics Breakdown */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Questions</span>
            <div className="mt-2 text-3xl font-black text-white">
              {report.totalAnswered || interview.questions.length}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Correct Answers (≥80)</span>
            <div className="mt-2 text-3xl font-black text-emerald-400">
              {report.correctAnswers || 0}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Partially Correct (50–79)</span>
            <div className="mt-2 text-3xl font-black text-amber-400">
              {report.partiallyCorrect || 0}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-red-400">Needs Review (&lt;50)</span>
            <div className="mt-2 text-3xl font-black text-red-400">
              {report.needsImprovement || 0}
            </div>
          </div>
        </div>

        {/* Strengths, Weaknesses & Category Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Category Performance Bars */}
          <div className="lg:col-span-6 p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📊</span> Category Performance
            </h2>
            <div className="space-y-4 pt-2">
              {report.categoryPerformance?.map((cat, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                    <span>{cat.category}</span>
                    <span className="font-mono text-cyan-400">{cat.score}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full transition-all duration-700"
                      style={{ width: `${cat.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strongest & Weakest Skills */}
          <div className="lg:col-span-6 space-y-4">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-2">
                <span>✓</span> Strongest Skills Identified
              </h3>
              <ul className="space-y-2 text-xs text-slate-300">
                {report.strongestSkills?.map((s, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-2">
                <span>!</span> Critical Areas for Improvement
              </h3>
              <ul className="space-y-2 text-xs text-slate-300">
                {report.weakestSkills?.map((w, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Personalized Improvement Roadmap */}
        {report.personalizedRoadmap?.length > 0 && (
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-900 via-purple-950/20 to-slate-900 border border-purple-500/30 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🚀</span> Personalized Improvement Roadmap
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {report.personalizedRoadmap.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-md bg-purple-600/30 text-purple-300 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Question-by-Question Breakdown Accordion */}
        <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center justify-between">
            <span>Question-by-Question Detailed Review</span>
            <span className="text-xs text-slate-400 font-normal">Click any item to view full AI rubric</span>
          </h2>

          <div className="space-y-3">
            {interview.questions.map((q, idx) => {
              const isExpanded = expandedQuestion === q.questionId;
              const qScore = q.evaluation?.score || 0;

              return (
                <div key={idx} className="rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden transition-all">
                  <button
                    onClick={() => setExpandedQuestion(isExpanded ? null : q.questionId)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-900/50 transition"
                  >
                    <div className="flex items-center gap-3 pr-4">
                      <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center flex-shrink-0">
                        Q{q.questionId}
                      </span>
                      <span className="text-sm font-medium text-white line-clamp-1">
                        {q.question}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="font-bold text-xs text-purple-400">{qScore}/100</span>
                      <span className="text-slate-500 text-xs">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-5 border-t border-slate-800/80 bg-slate-900/30 space-y-4 text-xs">
                      <div>
                        <span className="font-bold text-slate-400 block mb-1">Your Submitted Answer:</span>
                        <p className="p-3 bg-slate-950 rounded-lg text-slate-300 font-mono leading-relaxed border border-slate-800">
                          {q.userAnswer || '(No answer recorded)'}
                        </p>
                      </div>

                      {q.evaluation?.suggestedAnswer && (
                        <div>
                          <span className="font-bold text-cyan-300 block mb-1">Benchmark Ideal Answer:</span>
                          <p className="p-3 bg-purple-950/20 rounded-lg text-slate-200 font-mono leading-relaxed border border-purple-500/20">
                            {q.evaluation.suggestedAnswer}
                          </p>
                        </div>
                      )}

                      {q.evaluation?.correctExplanation && (
                        <div>
                          <span className="font-bold text-purple-300 block mb-1">Technical Explanation:</span>
                          <p className="text-slate-400 leading-relaxed">
                            {q.evaluation.correctExplanation}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            to="/dashboard"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xl shadow-purple-600/30 transition-all hover:scale-105 text-center"
          >
            🚀 Launch New Practice Round
          </Link>
          <Link
            to="/history"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition text-center"
          >
            View Interview History
          </Link>
        </div>
      </main>
    </div>
  );
}

