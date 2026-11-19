import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import MicrophoneTest from '../components/MicrophoneTest';
import {
  Sparkles,
  Video,
  FileCheck2,
  FileText,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Play,
  Zap,
} from 'lucide-react';

export default function InterviewSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authFetch, user } = useAuth();

  // Mode: 'resume' or 'general'
  const [interviewType, setInterviewType] = useState('resume');
  const [selectedCategory, setSelectedCategory] = useState('MERN Stack');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [interviewMode, setInterviewMode] = useState('video'); // 'video' | 'exam'

  // Latest resume state
  const [latestResume, setLatestResume] = useState(null);
  const [hasCheckedResume, setHasCheckedResume] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const categories = [
    { id: 'MERN Stack', name: 'MERN Stack', desc: 'Full-stack React, Node, Express, MongoDB systems' },
    { id: 'React.js', name: 'React.js', desc: 'Hooks, Fiber concurrency, Re-rendering optimizations' },
    { id: 'JavaScript', name: 'JavaScript', desc: 'Event Loop, Closures, Prototypal inheritance' },
    { id: 'Node.js', name: 'Node.js', desc: 'Streams, Event loop, Asynchronous I/O pipelines' },
    { id: 'Express.js', name: 'Express.js', desc: 'Middleware architecture, Error handling, Auth' },
    { id: 'MongoDB', name: 'MongoDB', desc: 'Indexing, Aggregation pipelines, Data modeling' },
    { id: 'Java', name: 'Java', desc: 'OOP, Concurrency, JVM internals, Collections' },
    { id: 'HTML', name: 'HTML & Semantic Web', desc: 'DOM, Web Accessibility (a11y), Standards' },
    { id: 'CSS', name: 'CSS & Responsive Design', desc: 'Flexbox, Grid, Animations, Box Model' },
    { id: 'HR Interview', name: 'HR & Culture Round', desc: 'Career narrative, Conflict resolution, Goals' },
    { id: 'Behavioral Interview', name: 'Behavioral Round', desc: 'STAR methodology, Leadership under pressure' },
  ];

  useEffect(() => {
    checkLatestResume();
  }, []);

  const checkLatestResume = async () => {
    try {
      const res = await authFetch('/api/resume/latest');
      const data = await res.json();
      if (res.ok && data.data?.resume) {
        setLatestResume(data.data.resume);
      }
    } catch {}
    setHasCheckedResume(true);
  };

  const handleStartInterview = async () => {
    setIsStarting(true);
    setErrorMsg('');

    try {
      if (interviewType === 'resume') {
        if (!latestResume) {
          navigate('/resume/upload');
          return;
        }
        // Redirect to Resume Analysis confirmation screen if not yet confirmed
        if (latestResume.status !== 'confirmed') {
          navigate(`/resume/analysis/${latestResume._id}`);
          return;
        }

        // Direct launch confirmed resume interview
        const res = await authFetch(`/api/resume/${latestResume._id}/confirm-and-start`, {
          method: 'POST',
          body: JSON.stringify({
            confirmedData: {
              interviewConfig: {
                difficulty,
                durationMinutes,
                mode: interviewMode,
              },
            },
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to start resume interview.');

        const interviewId = data.data?.interviewId;
        if (interviewMode === 'video') {
          navigate(`/interview/video/${interviewId}`);
        } else {
          navigate(`/interview/${interviewId}`);
        }
      } else {
        // General Mock Interview
        const qCount = durationMinutes === 45 ? 15 : durationMinutes === 30 ? 10 : 5;
        const res = await authFetch('/api/interviews/start', {
          method: 'POST',
          body: JSON.stringify({
            mode: interviewMode,
            category: selectedCategory,
            difficulty,
            totalQuestions: qCount,
            durationMinutes,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to start interview.');

        const interviewId = data.data?.interviewId;
        if (interviewMode === 'video') {
          navigate(`/interview/video/${interviewId}`);
        } else {
          navigate(`/interview/${interviewId}`);
        }
      }
    } catch (err) {
      console.error('[Setup Start Error]:', err);
      setErrorMsg(err.message || 'Error initializing round.');
      setIsStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-purple-600 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between py-3">
          <Logo to="/dashboard" />
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300 hover:text-white hover:border-slate-600 transition"
            >
              Dashboard
            </Link>
            <Link
              to="/history"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300 hover:text-white hover:border-slate-600 transition"
            >
              History
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 text-xs font-medium">
            <Zap className="w-3.5 h-3.5 text-cyan-400" /> Custom Interview Studio
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Setup Your AI Mock Interview</h1>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Choose between a personalized interview tailored to your uploaded resume or a specialized technical track.
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Step 1: Select Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card A: Resume-Based */}
          <div
            onClick={() => setInterviewType('resume')}
            className={`p-6 rounded-2xl border cursor-pointer transition-all ${
              interviewType === 'resume'
                ? 'bg-gradient-to-b from-purple-950/30 to-slate-900/90 border-purple-500 ring-2 ring-purple-500/30 shadow-xl'
                : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-md">
                <FileText className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-900/40 border border-purple-500/30 text-purple-300 text-[11px] font-mono">
                Recommended
              </span>
            </div>

            <h3 className="text-lg font-bold text-white mb-1">Resume-Based AI Interview</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              AI Elena analyzes your verified resume, deep-diving into your actual projects, frameworks, and architecture decisions.
            </p>

            {latestResume ? (
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-200 font-medium truncate max-w-[180px]">{latestResume.fileName}</span>
                </div>
                <Link
                  to={`/resume/analysis/${latestResume._id}`}
                  className="text-purple-400 hover:underline text-[11px] font-semibold"
                  onClick={(e) => e.stopPropagation()}
                >
                  Edit Profile
                </Link>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400">
                No resume uploaded yet.{' '}
                <Link to="/resume/upload" className="text-purple-400 underline font-semibold">
                  Upload PDF/DOCX
                </Link>
              </div>
            )}
          </div>

          {/* Card B: General Mock Interview */}
          <div
            onClick={() => setInterviewType('general')}
            className={`p-6 rounded-2xl border cursor-pointer transition-all ${
              interviewType === 'general'
                ? 'bg-gradient-to-b from-cyan-950/30 to-slate-900/90 border-cyan-500 ring-2 ring-cyan-500/30 shadow-xl'
                : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-md">
                <Layers className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-mono">
                Standard
              </span>
            </div>

            <h3 className="text-lg font-bold text-white mb-1">General Mock Interview</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Practice specialized industry tracks (MERN, React, Node.js, Java, HR & Behavioral) with progressive difficulty questions.
            </p>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
              <span>Selected Track:</span>
              <span className="font-semibold text-cyan-300">{selectedCategory}</span>
            </div>
          </div>
        </div>

        {/* Step 2: Track Selection (if General selected) */}
        {interviewType === 'general' && (
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white">Select Technology / Focus Area</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`p-3 rounded-xl text-left border text-xs transition ${
                    selectedCategory === cat.id
                      ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-white mb-0.5">{cat.name}</div>
                  <div className="text-[10px] text-slate-500 line-clamp-1">{cat.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Interview Mode & Duration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Mode */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <label className="text-xs font-bold text-white block">Interview Experience Mode</label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setInterviewMode('video')}
                className={`p-3 rounded-xl border text-center font-semibold transition ${
                  interviewMode === 'video'
                    ? 'bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-600/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Video className="w-4 h-4 mx-auto mb-1 text-cyan-400" />
                AI Video Call
              </button>
              <button
                type="button"
                onClick={() => setInterviewMode('exam')}
                className={`p-3 rounded-xl border text-center font-semibold transition ${
                  interviewMode === 'exam'
                    ? 'bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-600/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <FileCheck2 className="w-4 h-4 mx-auto mb-1 text-purple-400" />
                Exam Mode
              </button>
            </div>
          </div>

          {/* Difficulty */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <label className="text-xs font-bold text-white block">Difficulty</label>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              {['Beginner', 'Intermediate', 'Advanced'].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setDifficulty(lvl)}
                  className={`py-3 rounded-xl border text-center font-semibold transition ${
                    difficulty === lvl
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <label className="text-xs font-bold text-white block">Duration & Questions</label>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              {[15, 30, 45].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMinutes(mins)}
                  className={`py-3 rounded-xl border text-center font-semibold transition ${
                    durationMinutes === mins
                      ? 'bg-cyan-600 border-cyan-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {mins} Min
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Step 4: Microphone & Audio Hardware Check (for AI Video/Voice Mode) */}
        {interviewMode === 'video' && (
          <MicrophoneTest className="bg-slate-900/60" />
        )}

        {/* Launch Button */}
        <div className="flex items-center justify-between p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="text-xs text-slate-400">
            <span>Prepared to start with </span>
            <span className="text-white font-bold">{difficulty}</span>
            <span> difficulty • </span>
            <span className="text-cyan-400 font-bold">{durationMinutes} mins</span>
          </div>

          <button
            onClick={handleStartInterview}
            disabled={isStarting}
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center gap-2 shadow-xl shadow-purple-600/30 transition hover:scale-[1.02]"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isStarting ? 'Launching Room...' : 'Start Interview'}</span>
          </button>
        </div>
      </main>
    </div>
  );
}
