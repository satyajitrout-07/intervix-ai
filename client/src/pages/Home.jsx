import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Logo from '../components/Logo';

export default function Home() {
  const [selectedTech, setSelectedTech] = useState('MERN');
  const [selectedDifficulty, setSelectedDifficulty] = useState('Medium');

  const sampleQuestions = {
    MERN: {
      question: "How do you handle race conditions and optimistic updates in a high-scale React + Express + MongoDB architecture?",
      answerSnippet: "We implement optimistic UI updates via TanStack Query, backed by MongoDB version keys (__v) for optimistic concurrency control and distributed Redis locks...",
      score: "94/100",
      aiNotes: "Excellent architecture clarity. Highlighted MongoDB versioning (__v) and optimistic UI rollback logic accurately."
    },
    React: {
      question: "Explain the difference between useMemo and useCallback. When does memoization actually hurt React performance?",
      answerSnippet: "useCallback caches function instances while useMemo caches computed values. Premature memoization adds memory overhead and re-instantiation checks...",
      score: "91/100",
      aiNotes: "Solid conceptual grasp. Mentioned garbage collection implications and dependency array comparison costs."
    },
    JavaScript: {
      question: "How does the JavaScript Event Loop coordinate the Microtask Queue, Macrotask Queue, and RequestAnimationFrame?",
      answerSnippet: "Microtasks (Promises, queueMicrotask) execute immediately after the current call stack clears before rendering, whereas macrotasks (setTimeout) execute in the next tick...",
      score: "96/100",
      aiNotes: "Superb depth. Correctly articulated the precise order of microtask exhaustion before UI paint."
    },
    Java: {
      question: "Compare Java Virtual Threads (Project Loom) with traditional OS-level thread pools in high-throughput microservices.",
      answerSnippet: "Virtual threads provide M:N user-mode scheduling over carrier threads, drastically reducing heap overhead per thread from 1MB to few kilobytes...",
      score: "89/100",
      aiNotes: "Strong answer. Highlighted carrier thread pinning and non-blocking I/O behavior effectively."
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-purple-600 selection:text-white">
      {/* Background Glow Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-900/30 rounded-full blur-[128px]" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-indigo-900/20 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-cyan-900/20 rounded-full blur-[128px]" />
      </div>

      {/* Reusable Navbar */}
      <Navbar />

      {/* Main Content */}
      <main className="flex-1 z-10">
        {/* Hero Section */}
        <section className="relative pt-16 pb-20 md:pt-24 md:pb-32 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-950/40 backdrop-blur-md mb-8 shadow-inner shadow-purple-500/10">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs sm:text-sm font-semibold tracking-wide text-purple-200 uppercase">
                Practice. Improve. Get Hired.
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
              Master Technical Interviews with{' '}
              <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
                INTERVIX AI
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              The intelligent AI mock interview platform that simulates realistic technical rounds for JavaScript, Java, React, MERN, and system design with instant actionable scoring.
            </p>

            {/* Call to Action Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/signup"
                className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xl shadow-purple-600/30 transition-all hover:scale-105 flex items-center justify-center gap-2"
              >
                <span>Launch Mock Interview</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-bold bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 transition-all flex items-center justify-center gap-2"
              >
                <span>Existing User Sign In</span>
              </Link>
            </div>

            {/* Metric Highlights */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto pt-8 border-t border-slate-800/80">
              <div className="flex flex-col items-center">
                <span className="text-3xl font-extrabold text-white">94%</span>
                <span className="text-xs uppercase tracking-wider text-slate-400 mt-1">Hire Offer Rate</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-extrabold text-purple-400">50K+</span>
                <span className="text-xs uppercase tracking-wider text-slate-400 mt-1">AI Questions Solved</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-extrabold text-cyan-400">&lt; 3 sec</span>
                <span className="text-xs uppercase tracking-wider text-slate-400 mt-1">Real-Time Evaluation</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-extrabold text-white">4.9/5</span>
                <span className="text-xs uppercase tracking-wider text-slate-400 mt-1">Candidate Rating</span>
              </div>
            </div>
          </div>
        </section>

        {/* Live Interactive Mock Simulator Preview */}
        <section id="demo" className="py-16 bg-slate-900/40 border-y border-slate-800/60">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white tracking-tight">Interactive Interview Sandbox</h2>
              <p className="mt-3 text-slate-400">See how INTERVIX AI listens, scores, and delivers instant hiring feedback.</p>
            </div>

            {/* Sandbox Container */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8">
              {/* Stack & Difficulty Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-2">Track:</span>
                  {['MERN', 'React', 'JavaScript', 'Java'].map((tech) => (
                    <button
                      key={tech}
                      onClick={() => setSelectedTech(tech)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedTech === tech
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                          : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      {tech}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-2">Difficulty:</span>
                  {['Easy', 'Medium', 'Hard'].map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setSelectedDifficulty(diff)}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                        selectedDifficulty === diff
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              {/* Simulation Content */}
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* AI Question & Candidate Answer */}
                <div className="lg:col-span-7 flex flex-col space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-purple-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-purple-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                        AI Interviewer Question
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">{selectedTech} • {selectedDifficulty}</span>
                    </div>
                    <p className="text-slate-100 font-medium text-sm sm:text-base leading-relaxed">
                      "{sampleQuestions[selectedTech].question}"
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800">
                    <span className="text-xs font-bold text-slate-400 mb-2 block">Candidate Response (Audio & Text):</span>
                    <p className="text-slate-300 text-sm font-mono leading-relaxed italic bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                      "{sampleQuestions[selectedTech].answerSnippet}"
                    </p>
                  </div>
                </div>

                {/* Real-time AI Evaluation Panel */}
                <div className="lg:col-span-5 p-5 rounded-xl bg-gradient-to-br from-slate-950 to-purple-950/30 border border-purple-500/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">AI Scorecard</span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-purple-600/30 text-purple-300 border border-purple-500/30">
                        {sampleQuestions[selectedTech].score}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                          <span>Technical Precision</span>
                          <span className="text-cyan-400">95%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full w-[95%]" />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                          <span>Code Efficiency & Best Practice</span>
                          <span className="text-purple-400">92%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full w-[92%]" />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                          <span>Communication & Articulation</span>
                          <span className="text-emerald-400">94%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full w-[94%]" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 p-3 rounded-lg bg-purple-900/20 border border-purple-500/20 text-xs text-purple-200 leading-relaxed">
                      <strong className="text-white block mb-1">💡 Key Takeaway:</strong>
                      {sampleQuestions[selectedTech].aiNotes}
                    </div>
                  </div>

                  <Link
                    to="/signup"
                    className="mt-5 w-full py-2.5 rounded-lg text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition-colors shadow-md text-center block"
                  >
                    Try This Track in Live Mode →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section id="features" className="py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-xs uppercase font-extrabold tracking-widest text-purple-400 mb-3">Enterprise-Grade Features</h2>
              <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Engineered to turn mock practice into high-paying offers
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/50 transition-all hover:-translate-y-1 group">
                <div className="w-12 h-12 rounded-xl bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">AI-Generated Questions</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Dynamic prompts tailored precisely to your selected stack (JavaScript, Java, React, MERN) and target tier (Easy, Medium, Hard).
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/50 transition-all hover:-translate-y-1 group">
                <div className="w-12 h-12 rounded-xl bg-cyan-900/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Voice-Based Interviews</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Real conversational audio simulation. Speak naturally to the AI interviewer and receive feedback on pacing, confidence, and articulation.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/50 transition-all hover:-translate-y-1 group">
                <div className="w-12 h-12 rounded-xl bg-indigo-900/40 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Instant Feedback & Scoring</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Comprehensive performance rubric evaluating algorithmic accuracy, architecture patterns, time complexity, and clean code principles.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/50 transition-all hover:-translate-y-1 group">
                <div className="w-12 h-12 rounded-xl bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Resume Upload & Tailoring</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Upload your CV to automatically craft hyper-customized questions drilling into your actual past projects, tech stack, and claims.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/50 transition-all hover:-translate-y-1 group">
                <div className="w-12 h-12 rounded-xl bg-cyan-900/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Analytics & History</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Deep candidate dashboard visualizing strength graphs over time, identifying blind spots, and tracking readiness indices.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/50 transition-all hover:-translate-y-1 group">
                <div className="w-12 h-12 rounded-xl bg-indigo-900/40 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Admin & Recruiter Portal</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Comprehensive administrative oversight, question pool curation, candidate benchmarks, and evaluation audit trails.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20 bg-slate-900/50 border-t border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-xs uppercase font-extrabold tracking-widest text-cyan-400 mb-3">Step-by-Step Flow</h2>
              <p className="text-3xl sm:text-4xl font-extrabold text-white">How INTERVIX AI Prepares You</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
              {[
                {
                  step: "01",
                  title: "Select Stack & Tier",
                  desc: "Pick JavaScript, Java, React, or MERN and calibrate your difficulty from junior to staff engineer."
                },
                {
                  step: "02",
                  title: "Conduct AI Interview",
                  desc: "Engage in live voice or text technical rounds facing questions modeled after top tech company interviews."
                },
                {
                  step: "03",
                  title: "Instant AI Scoring",
                  desc: "Receive rigorous, line-by-line feedback with optimized solutions and communication metrics in seconds."
                },
                {
                  step: "04",
                  title: "Iterate & Get Hired",
                  desc: "Track your progress on your personal dashboard, fix blind spots, and walk into actual interviews with confidence."
                }
              ].map((item, index) => (
                <div key={index} className="flex flex-col items-center text-center p-6 rounded-2xl bg-slate-950/60 border border-slate-800 relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center text-white font-black text-xl mb-6 shadow-lg shadow-purple-600/20">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative rounded-3xl overflow-hidden p-8 sm:p-14 text-center bg-gradient-to-r from-purple-900/60 via-indigo-900/50 to-slate-900 border border-purple-500/30 shadow-2xl">
              <div className="relative z-10">
                <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                  Ready to Ace Your Next Interview?
                </h2>
                <p className="mt-4 text-base sm:text-lg text-purple-200 max-w-xl mx-auto">
                  Join thousands of developers leveling up their technical skills with INTERVIX AI today.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    to="/signup"
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-base font-bold bg-white text-slate-950 hover:bg-slate-100 transition-all shadow-xl hover:scale-105"
                  >
                    Start Free Interview Now
                  </Link>
                  <Link
                    to="/login"
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-base font-bold bg-purple-950/80 text-purple-200 border border-purple-500/40 hover:bg-purple-900/80 transition-all"
                  >
                    Candidate Sign In
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800/80 py-12 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Logo to="/" />
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
              <a href="#features" className="hover:text-purple-400 transition-colors">Features</a>
              <a href="#demo" className="hover:text-purple-400 transition-colors">Sandbox</a>
              <a href="#how-it-works" className="hover:text-purple-400 transition-colors">How It Works</a>
              <Link to="/login" className="hover:text-purple-400 transition-colors">Login</Link>
              <Link to="/signup" className="hover:text-purple-400 transition-colors">Signup</Link>
              <Link to="/dashboard" className="hover:text-purple-400 transition-colors">Dashboard</Link>
            </div>
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} INTERVIX AI. Practice. Improve. Get Hired.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

