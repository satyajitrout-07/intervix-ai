import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../utils/avatar';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout, authFetch } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState('JavaScript');
  const [selectedDifficulty, setSelectedDifficulty] = useState('Intermediate');
  const [selectedExperience, setSelectedExperience] = useState('Junior (1–2 years)');
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [selectedMode, setSelectedMode] = useState('video'); // 'video' | 'exam'
  const [isStartingInterview, setIsStartingInterview] = useState(false);
  const [startError, setStartError] = useState('');

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const userInitials = getInitials(user?.name);
  const displayName = user?.name || 'Satyajit Rout';

  // Fetch real past interview sessions from MongoDB
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoadingHistory(true);
        const res = await authFetch('/api/interviews/history');
        if (res.ok) {
          const data = await res.json();
          setHistory(data.data?.history || data.history || []);
        }
      } catch (err) {
        console.warn('Failed to fetch history in dashboard:', err.message);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, []);

  const categories = [
    { id: 'JavaScript', name: 'JavaScript', icon: '📜', desc: 'Closures, Event Loop, Prototypes & Asynchronous ES6+' },
    { id: 'React.js', name: 'React.js', icon: '⚛️', desc: 'Hooks, Fiber Reconciler, Concurrency & State patterns' },
    { id: 'Node.js', name: 'Node.js', icon: '🟢', desc: 'Event Loop, Libuv, Streams, I/O & Memory optimization' },
    { id: 'Express.js', name: 'Express.js', icon: '🚂', desc: 'Middleware pipelines, Routing, Error handling & Auth' },
    { id: 'MongoDB', name: 'MongoDB', icon: '🍃', desc: 'Aggregation pipelines, Compound indexes & ACID modeling' },
    { id: 'MERN Stack', name: 'MERN Stack', icon: '⚡', desc: 'Full-stack systems, Concurrency & Optimistic updates' },
    { id: 'Java', name: 'Java', icon: '☕', desc: 'Core OOP, Collections, Concurrency & Virtual Threads' },
    { id: 'HTML', name: 'HTML', icon: '🌐', desc: 'Semantic HTML, Accessibility (a11y) & DOM architecture' },
    { id: 'CSS', name: 'CSS', icon: '🎨', desc: 'Box Model, Flexbox, Grid, Animations & Responsive layouts' },
    { id: 'HR Interview', name: 'HR Interview', icon: '💼', desc: 'Professional narrative, Problem resolution & Culture' },
    { id: 'Behavioral Interview', name: 'Behavioral', icon: '🎯', desc: 'STAR methodology, Leadership & High-pressure execution' },
  ];

  const difficulties = [
    { id: 'Beginner', label: 'Beginner', badge: 'Junior (0-2 Yrs)', color: 'text-emerald-400' },
    { id: 'Intermediate', label: 'Intermediate', badge: 'Mid-Level (2-5 Yrs)', color: 'text-amber-400' },
    { id: 'Advanced', label: 'Advanced', badge: 'Senior / Staff (5+ Yrs)', color: 'text-red-400' },
  ];

  const handleStartInterview = async (overrideMode = null) => {
    const modeToUse = overrideMode || selectedMode;
    setIsStartingInterview(true);
    setStartError('');

    try {
      const res = await authFetch('/api/interviews/start', {
        method: 'POST',
        body: JSON.stringify({
          mode: modeToUse,
          category: selectedCategory,
          difficulty: selectedDifficulty,
          experienceLevel: selectedExperience,
          totalQuestions: Number(totalQuestions),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to start interview session.');
      }

      const interviewId = data.data?.interviewId || data.interviewId;

      if (modeToUse === 'video') {
        navigate(`/interview/video/${interviewId}`);
      } else {
        navigate(`/interview/${interviewId}`);
      }
    } catch (err) {
      console.error('[Start Interview Error]:', err);
      setStartError(err.message || 'Server error starting interview. Please verify the backend is running.');
      setIsStartingInterview(false);
    }
  };

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const completed = history.filter((h) => h.status === 'completed');
  const scores = completed.map((h) => h.finalReport?.overallScore || 0);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-purple-600 selection:text-white">
      {/* Dashboard Top Header */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between py-3">
          <div className="flex items-center gap-6">
            <Logo to="/" />
            <span className="hidden sm:inline-block px-2.5 py-1 rounded-md bg-purple-900/40 text-purple-300 border border-purple-500/30 text-xs font-mono">
              Student Portal
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-medium">AI Voice & Video Engine Online</span>
            </div>

            <Link
              to="/history"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition"
            >
              Interview History
            </Link>

            <button
              onClick={handleSignOut}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition"
            >
              Sign Out
            </button>

            {/* Circular Blue/Gradient Avatar */}
            <div
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-cyan-400 p-[1.5px] flex items-center justify-center shadow-md shadow-cyan-500/10 cursor-pointer"
              title={user?.name ? `${user.name} (${user.email || ''})` : 'User Profile'}
            >
              <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-xs font-bold text-white tracking-wider">
                {userInitials}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-slate-800 shadow-xl">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Welcome back, <span className="text-purple-400">{displayName}</span>!
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Select your topic and launch an Exam or real-time AI Video Call interview with Elena.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const el = document.getElementById('modes');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 transition-all hover:scale-105"
            >
              + Start Practice Round
            </button>
          </div>
        </div>

        {/* Quick Analytics Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Interviews Completed</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{completed.length}</span>
              <span className="text-xs text-emerald-400 font-bold">in MongoDB</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Average AI Score</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-purple-400">{avgScore > 0 ? `${avgScore}%` : '--'}</span>
              <span className="text-xs text-purple-300 font-bold">Strict Rubric</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Topic</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-lg sm:text-xl font-bold text-white">{selectedCategory}</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Difficulty</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-lg sm:text-xl font-bold text-cyan-400">{selectedDifficulty}</span>
            </div>
          </div>
        </div>

        {/* STEP 1: INTERVIEW MODE SELECTION CARDS */}
        <section id="modes" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Choose Your Interview Experience</h2>
              <p className="text-xs text-slate-400">Select how you would like to be evaluated today.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* OPTION B: AI LIVE VIDEO INTERVIEW */}
            <div
              onClick={() => setSelectedMode('video')}
              className={`p-6 sm:p-8 rounded-3xl border cursor-pointer transition-all relative overflow-hidden group ${
                selectedMode === 'video'
                  ? 'bg-gradient-to-br from-purple-950/60 via-slate-900 to-slate-950 border-purple-500 shadow-2xl ring-2 ring-purple-500'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase bg-purple-600/30 text-purple-300 border border-purple-500/40">
                ⭐ Highly Recommended
              </div>

              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center text-2xl mb-5 shadow-lg group-hover:scale-105 transition-transform">
                🎥
              </div>

              <h3 className="text-2xl font-black text-white mb-2">
                Real-Time AI Video Call Interview
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
                Attend a realistic online video interview with <strong>Elena</strong>, our virtual AI interviewer.
                Features real-time speech synthesis, webcam preview, animated lip-sync, and conversational follow-ups.
              </p>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 mb-6">
                <span className="flex items-center gap-1.5">✓ Natural AI Spoken Voice</span>
                <span className="flex items-center gap-1.5">✓ Lip-Sync Virtual Human</span>
                <span className="flex items-center gap-1.5">✓ Real-time Speech-To-Text</span>
                <span className="flex items-center gap-1.5">✓ Instant Rubric Grading</span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
                <span className="text-xs font-bold text-purple-400">
                  {selectedMode === 'video' ? '● Selected Mode' : 'Click to Select'}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartInterview('video');
                  }}
                  disabled={isStartingInterview}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg transition hover:scale-105"
                >
                  Launch Video Call →
                </button>
              </div>
            </div>

            {/* OPTION A: EXAM MODE */}
            <div
              onClick={() => setSelectedMode('exam')}
              className={`p-6 sm:p-8 rounded-3xl border cursor-pointer transition-all relative overflow-hidden group ${
                selectedMode === 'exam'
                  ? 'bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 border-cyan-500 shadow-2xl ring-2 ring-cyan-500'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-2xl mb-5 shadow-lg group-hover:scale-105 transition-transform">
                📝
              </div>

              <h3 className="text-2xl font-black text-white mb-2">
                Structured Technical Exam Mode
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
                Structured written & code interview session. Enter detailed explanations or solutions in the technical editor, navigate questions at your pace, and review before final submission.
              </p>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 mb-6">
                <span className="flex items-center gap-1.5">✓ Technical Code Textarea</span>
                <span className="flex items-center gap-1.5">✓ Countdown Question Timer</span>
                <span className="flex items-center gap-1.5">✓ Deep Rubric Breakdown</span>
                <span className="flex items-center gap-1.5">✓ Question Review Accordion</span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
                <span className="text-xs font-bold text-cyan-400">
                  {selectedMode === 'exam' ? '● Selected Mode' : 'Click to Select'}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartInterview('exam');
                  }}
                  disabled={isStartingInterview}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg transition hover:scale-105"
                >
                  Start Exam Mode →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* STEP 2: CATEGORY & DIFFICULTY CONFIGURATION */}
        <section id="config" className="p-6 sm:p-8 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-xl font-bold text-white">Configure Interview Track</h2>
            <p className="text-xs text-slate-400 mt-0.5">Select from 11 specialized engineering and behavioral disciplines.</p>
          </div>

          {startError && (
            <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>{startError}</span>
            </div>
          )}

          {/* 1. Category Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              1. Choose Category ({categories.length} available)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.id)}
                  className={`p-3.5 rounded-xl text-left border transition-all ${
                    selectedCategory === c.id
                      ? 'bg-purple-950/40 border-purple-500 shadow-md shadow-purple-600/20 ring-1 ring-purple-500'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xl mb-1">{c.icon}</div>
                  <h3 className="text-xs font-bold text-white">{c.name}</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">{c.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Difficulty Level */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              2. Select Difficulty Level
            </label>
            <div className="grid grid-cols-3 gap-4 max-w-xl">
              {difficulties.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDifficulty(d.id)}
                  className={`py-3 px-4 rounded-xl text-center border transition-all ${
                    selectedDifficulty === d.id
                      ? 'bg-slate-800 border-purple-500 shadow-sm ring-1 ring-purple-500'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="block text-sm font-bold text-white">{d.label}</span>
                  <span className={`text-[11px] font-medium ${d.color}`}>{d.badge}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Number of Questions */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              3. Number of Questions
            </label>
            <div className="grid grid-cols-3 gap-4 max-w-sm">
              {[5, 10, 15].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setTotalQuestions(count)}
                  className={`py-2 px-3 rounded-xl text-center border transition-all ${
                    totalQuestions === count
                      ? 'bg-purple-600 border-purple-500 text-white font-bold shadow-md'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xs">{count} Questions</span>
                </button>
              ))}
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400">
              Selected: <strong className="text-white">{selectedCategory}</strong> • <strong className="text-white">{selectedDifficulty}</strong> • Mode: <strong className="text-purple-400 uppercase">{selectedMode === 'video' ? 'AI Video Call' : 'Exam Mode'}</strong>.
            </div>

            <button
              type="button"
              onClick={() => handleStartInterview()}
              disabled={isStartingInterview}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 transition-all hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isStartingInterview ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r=