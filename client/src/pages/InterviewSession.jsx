import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';

export default function InterviewSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authFetch, user } = useAuth();

  const [interview, setInterview] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [validationError, setValidationError] = useState('');
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  const [remainingSeconds, setRemainingSeconds] = useState(900);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  // Countdown timer based on persisted deadline
  useEffect(() => {
    if (!interview || !interview.deadline || interview.status === 'completed') return;

    const calcRemaining = () => {
      const diffMs = new Date(interview.deadline).getTime() - Date.now();
      const secs = Math.max(0, Math.floor(diffMs / 1000));
      setRemainingSeconds(secs);

      if (secs === 0 && interview.status === 'in_progress') {
        authFetch(`/api/interviews/${id}/finish`, { method: 'POST' }).finally(() => {
          navigate(`/interview/report/${id}`);
        });
      }
    };

    calcRemaining();
    const timer = setInterval(calcRemaining, 1000);
    return () => clearInterval(timer);
  }, [interview?.deadline, interview?.status]);

  // Load session from backend
  useEffect(() => {
    const fetchSession = async () => {
      try {
        setLoading(true);
        setErrorMsg('');
        const res = await authFetch(`/api/interviews/${id}`);
        if (!res.ok) {
          throw new Error('Interview session not found or access denied.');
        }
        const data = await res.json();
        const sess = data.interview;
        setInterview(sess);

        // Find latest unanswered question or current active question
        const latestUnanswered = sess.questions.find((q) => !q.evaluation);
        if (latestUnanswered) {
          setCurrentQuestion(latestUnanswered);
          setUserAnswer(latestUnanswered.userAnswer || '');
          setEvaluationResult(null);
        } else if (sess.status === 'completed') {
          // If already completed, redirect to report
          navigate(`/interview/report/${id}`);
        } else {
          setCurrentQuestion(sess.questions[sess.questions.length - 1]);
        }
      } catch (err) {
        setErrorMsg(err.message || 'Failed to load interview session.');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [id]);

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!userAnswer.trim()) {
      setValidationError('Please type your technical answer before submitting for AI evaluation.');
      return;
    }

    if (userAnswer.trim().length < 15) {
      setValidationError('Your answer is too brief. Please provide a detailed technical explanation.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await authFetch(`/api/interviews/${id}/answer`, {
        method: 'POST',
        body: JSON.stringify({
          questionId: currentQuestion.questionId,
          userAnswer: userAnswer.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to evaluate answer.');
      }

      setEvaluationResult(data.evaluation);

      // If finished last question
      if (data.isCompleted) {
        setInterview((prev) => ({
          ...prev,
          status: 'completed',
          finalReport: data.finalReport,
        }));
      } else if (data.nextQuestion) {
        // Store next question ready for next step
        setInterview((prev) => ({
          ...prev,
          currentQuestionIndex: (prev?.currentQuestionIndex || 0) + 1,
          nextQ: data.nextQuestion,
        }));
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit answer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProceedNext = async () => {
    const isFinal = (currentQuestion?.questionId || 1) >= (interview?.totalQuestions || 5);
    if (interview?.status === 'completed' || isFinal) {
      navigate(`/interview/report/${id}`);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await authFetch(`/api/interviews/${id}/next-question`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to load next question.');
      }

      if (data.data?.isCompleted) {
        navigate(`/interview/report/${id}`);
        return;
      }

      const nextQ = data.data?.nextQuestion;
      setCurrentQuestion(nextQ);
      setUserAnswer('');
      setEvaluationResult(null);
      setSecondsElapsed(0);
      setInterview((prev) => ({
        ...prev,
        currentQuestionIndex: data.data?.currentQuestionIndex,
      }));
    } catch (err) {
      setErrorMsg(err.message || 'Failed to advance to next question.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipQuestion = async () => {
    setShowSkipConfirm(false);
    try {
      setIsSubmitting(true);
      const res = await authFetch(`/api/interviews/${id}/skip-question`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to skip question.');
      }

      if (data.data?.isCompleted) {
        navigate(`/interview/report/${id}`);
        return;
      }

      const nextQ = data.data?.nextQuestion;
      setCurrentQuestion(nextQ);
      setUserAnswer('');
      setEvaluationResult(null);
      setSecondsElapsed(0);
      setInterview((prev) => ({
        ...prev,
        currentQuestionIndex: data.data?.currentQuestionIndex,
      }));
    } catch (err) {
      setErrorMsg(err.message || 'Error skipping question.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <h2 className="text-xl font-bold text-white mb-2">Connecting to INTERVIX AI Engine...</h2>
        <p className="text-sm text-slate-400">Calibrating question pool and initializing candidate environment.</p>
      </div>
    );
  }

  if (errorMsg && !interview) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
        <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900 border border-red-500/30 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-950/60 border border-red-500/40 flex items-center justify-center text-red-400 mb-4">
            ⚠️
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Session Error</h3>
          <p className="text-sm text-red-300 mb-6">{errorMsg}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition"
          >
            ← Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQNum = currentQuestion?.questionId || 1;
  const totalQCount = interview?.totalQuestions || 5;
  const progressPercent = Math.round(((currentQNum - 1) / totalQCount) * 100);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-purple-600 selection:text-white">
      {/* Top Session Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo to="/dashboard" />
            <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-slate-800 text-xs">
              <span className="px-2.5 py-1 rounded bg-purple-900/30 border border-purple-500/30 text-purple-300 font-bold">
                {interview?.track}
              </span>
              <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-400 font-medium">
                {interview?.difficulty}
              </span>
              <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-400 font-medium">
                {interview?.experienceLevel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Live Countdown Timer */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold ${
                remainingSeconds <= 60
                  ? 'bg-red-950/80 border-red-500 text-red-300 animate-pulse'
                  : remainingSeconds <= 300
                  ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-cyan-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${remainingSeconds <= 60 ? 'bg-red-400' : 'bg-cyan-400'} animate-pulse`} />
              <span>⏱ {formatTimer(remainingSeconds)}</span>
            </div>

            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to pause and exit to the dashboard? Your answered questions are saved.')) {
                  navigate('/dashboard');
                }
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition"
            >
              Exit to Dashboard
            </button>
          </div>
        </div>

        {/* Linear Progress Bar */}
        <div className="w-full h-1 bg-slate-900">
          <div
            className="h-full bg-gradient-to-r from-purple-600 via-indigo-500 to-cyan-400 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Progress & Question Info Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center font-black text-sm text-white">
              {currentQNum}
            </span>
            <div>
              <span className="text-xs uppercase font-extrabold tracking-wider text-purple-400 block">
                Question {currentQNum} of {totalQCount}
              </span>
              <span className="text-xs text-slate-400">
                Focus Area: <strong className="text-slate-200">{currentQuestion?.topic || interview?.track}</strong>
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-400">
            Candidate: <strong className="text-white">{user?.name || 'Satyajit Rout'}</strong>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-sm flex items-center gap-3">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Active Question Display Card */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-purple-950/20 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Technical Prompt
            </span>
            <span className="text-xs font-mono text-slate-500">
              Tier: {currentQuestion?.difficulty || interview?.difficulty}
            </span>
          </div>
          <p className="text-lg sm:text-xl font-medium text-white leading-relaxed">
            {currentQuestion?.question}
          </p>
        </div>

        {/* Candidate Answer Editor Area */}
        {!evaluationResult ? (
          <form onSubmit={handleSubmitAnswer} className="space-y-4">
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xl focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all">
              {/* Editor Header Bar */}
              <div className="px-5 py-3 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Your Answer & Technical Explanation
                </span>
                <span className="text-xs font-mono text-slate-500">
                  {userAnswer.trim().split(/\s+/).filter(Boolean).length} words • {userAnswer.length} chars
                </span>
              </div>

              {/* Textarea Input */}
              <textarea
                value={userAnswer}
                onChange={(e) => {
                  setUserAnswer(e.target.value);
                  if (validationError) setValidationError('');
                }}
                disabled={isSubmitting}
                rows={10}
                placeholder="Structure your answer clearly:
1. Core definition and underlying mechanisms.
2. Code examples or implementation details.
3. Concurrency, memory, and performance implications.
4. Production trade-offs and edge cases."
                className="w-full p-5 bg-slate-950/40 text-slate-100 placeholder-slate-600 font-mono text-sm leading-relaxed focus:outline-none resize-y"
              />

              {/* Tips footer */}
              <div className="px-5 py-2.5 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>💡 Tip: Mention real-world production trade-offs to score in the top 10% tier.</span>
                <button
                  type="button"
                  onClick={() => setUserAnswer('')}
                  className="hover:text-slate-300 transition"
                >
                  Clear Editor
                </button>
              </div>
            </div>

            {validationError && (
              <p className="text-xs text-red-400 font-medium pl-1 flex items-center gap-1.5">
                <span>⚠️</span>
                <span>{validationError}</span>
              </p>
            )}

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <span className="text-xs text-slate-500">
                AI will evaluate Technical Accuracy, Concept Depth, Completeness, and Clarity.
              </span>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowSkipConfirm(true)}
                  disabled={isSubmitting}
                  className="px-5 py-3.5 rounded-xl text-xs font-semibold border border-slate-700 hover:border-red-500/50 hover:bg-red-950/40 text-slate-400 hover:text-red-300 transition"
                >
                  Skip Question
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 transition-all hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>AI Interviewer is Evaluating Your Answer...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Answer & Evaluate</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
            </div>
          </form>
        ) : (
          /* Instant AI Evaluation Result Card */
          <div className="space-y-6 animate-fadeIn">
            <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-purple-500/30 shadow-2xl space-y-6">
              {/* Scorecard Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div>
                  <span className="text-xs uppercase font-extrabold tracking-widest text-cyan-400 block mb-1">
                    Evaluation Complete
                  </span>
                  <h3 className="text-xl font-bold text-white">AI Interviewer Assessment</h3>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Question Score</span>
                    <span className="text-2xl font-black text-purple-400">
                      {evaluationResult.score}/100
                    </span>
                  </div>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg ${
                    evaluationResult.score >= 80
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                      : evaluationResult.score >= 50
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                      : 'bg-red-950/80 text-red-300 border border-red-500/40'
                  }`}>
                    {evaluationResult.score >= 80 ? 'A' : evaluationResult.score >= 50 ? 'B' : 'C'}
                  </div>
                </div>
              </div>

              {/* Rubric Dimension Bars */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { label: 'Technical Accuracy', val: evaluationResult.technicalAccuracy || evaluationResult.score, color: 'bg-cyan-400' },
                  { label: 'Concept Depth', val: evaluationResult.conceptUnderstanding || evaluationResult.score, color: 'bg-purple-400' },
                  { label: 'Completeness', val: evaluationResult.completeness || evaluationResult.score, color: 'bg-indigo-400' },
                  { label: 'Problem Solving', val: evaluationResult.problemSolving || evaluationResult.score, color: 'bg-emerald-400' },
                  { label: 'Clarity', val: evaluationResult.communicationClarity || evaluationResult.score, color: 'bg-amber-400' },
                ].map((item, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
                      <span>{item.label}</span>
                      <span className="font-mono text-white">{item.val}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.val}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/20">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                    <span>✓</span> Strengths Identified
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {evaluationResult.strengths?.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-400">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/20">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
                    <span>!</span> Areas for Improvement
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {evaluationResult.weaknesses?.map((w, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-400">•</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Correct Technical Explanation */}
              {evaluationResult.correctExplanation && (
                <div className="p-5 rounded-xl bg-slate-950 border border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 mb-2">
                    💡 Authoritative Concept Explanation
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {evaluationResult.correctExplanation}
                  </p>
                </div>
              )}

              {/* Suggested Model Answer */}
              {evaluationResult.suggestedAnswer && (
                <div className="p-5 rounded-xl bg-purple-950/20 border border-purple-500/30">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 mb-2">
                    ⭐ Benchmark High-Scoring Response (Staff Level)
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-200 font-mono leading-relaxed bg-slate-950/60 p-4 rounded-lg border border-slate-800">
                    {evaluationResult.suggestedAnswer}
                  </p>
                </div>
              )}

              {/* Improvement Tips */}
              {evaluationResult.improvementTips?.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                  <span className="font-bold text-white block mb-1.5">🚀 Actionable Interview Tips:</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-400">
                    {evaluationResult.improvementTips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Next Step Button */}
              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={handleProceedNext}
                  className="px-8 py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xl shadow-purple-600/30 transition-all hover:scale-105 flex items-center gap-2"
                >
                  <span>
                    {interview?.status === 'completed'
                      ? 'View Comprehensive Final Report →'
                      : `Proceed to Question ${currentQNum + 1} →`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      {/* Skip Confirmation Modal */}
      {showSkipConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="w-10 h-10 rounded-full bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto">
              ⚠️
            </div>
            <h3 className="text-base font-bold text-white">Skip Question #{currentQNum}?</h3>
            <p className="text-xs text-slate-400">
              Skipping will award 0 marks for this question and advance to the next topic.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSkipConfirm(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSkipQuestion}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/30"
              >
                Yes, Skip Question
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

