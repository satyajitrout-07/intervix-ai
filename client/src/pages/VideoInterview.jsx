import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';

export default function VideoInterview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authFetch, user } = useAuth();

  const [interview, setInterview] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Call Controls State
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [showCaptions, setShowCaptions] = useState(true);
  const [activeCaption, setActiveCaption] = useState('');
  const [callTimer, setCallTimer] = useState(0);

  // AI Interviewer State
  // 'speaking' | 'listening' | 'thinking' | 'idle'
  const [aiState, setAiState] = useState('idle');
  const [mouthOpen, setMouthOpen] = useState(false);

  // Candidate Speech Recognition
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(true);
  const [showTextInputModal, setShowTextInputModal] = useState(false);
  const [textFallbackAnswer, setTextFallbackAnswer] = useState('');

  // Evaluation Feedback State
  const [isProcessingTurn, setIsProcessingTurn] = useState(false);
  const [lastFeedback, setLastFeedback] = useState(null);

  // Audio / Video Refs
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const lipSyncIntervalRef = useRef(null);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallTimer((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 1. Initialize Camera
  useEffect(() => {
    let stream = null;

    async function initCamera() {
      try {
        if (isCameraOn && navigator.mediaDevices?.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false,
          });
          mediaStreamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        }
      } catch (err) {
        console.warn('[Camera Access Note]:', err.message);
        setIsCameraOn(false);
      }
    }

    if (isCameraOn) {
      initCamera();
    } else {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isCameraOn]);

  // 2. Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript + ' ';
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        const full = (transcript + ' ' + final + interim).trim();
        setTranscript(full);
        setActiveCaption(`Candidate: "${interim || final || full}"`);
      };

      recognition.onerror = (e) => {
        console.warn('[Speech Recognition Error]:', e.error);
        if (e.error === 'not-allowed') {
          setIsMicOn(false);
        }
      };

      recognition.onend = () => {
        if (isListening && isMicOn) {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognitionRef.current = recognition;
    } else {
      setRecognitionSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [isListening, isMicOn, transcript]);

  // Lip-sync simulation during AI speech
  const startLipSync = () => {
    clearInterval(lipSyncIntervalRef.current);
    lipSyncIntervalRef.current = setInterval(() => {
      setMouthOpen((prev) => !prev);
    }, 160);
  };

  const stopLipSync = () => {
    clearInterval(lipSyncIntervalRef.current);
    setMouthOpen(false);
  };

  // Text-To-Speech for AI Interviewer
  const speakAI = (text, onFinish) => {
    if (!('speechSynthesis' in window)) {
      if (onFinish) onFinish();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;

    // Pick realistic natural English voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Zira'))) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      setAiState('speaking');
      setActiveCaption(`AI Elena: "${text}"`);
      startLipSync();
    };

    utterance.onend = () => {
      stopLipSync();
      setAiState('listening');
      if (onFinish) onFinish();
      startCandidateListening();
    };

    utterance.onerror = () => {
      stopLipSync();
      setAiState('listening');
      if (onFinish) onFinish();
    };

    window.speechSynthesis.speak(utterance);
  };

  const startCandidateListening = () => {
    if (recognitionRef.current && isMicOn) {
      try {
        setTranscript('');
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.warn('Recognition start exception:', e.message);
      }
    }
  };

  const stopCandidateListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch {}
    }
  };

  // Load Session and trigger AI Greeting
  useEffect(() => {
    let active = true;

    async function loadInterview() {
      try {
        setLoading(true);
        const res = await authFetch(`/api/interviews/${id}`);
        if (!res.ok) {
          throw new Error('Interview session not found.');
        }
        const data = await res.json();
        const sess = data.data?.interview || data.interview;

        if (sess.status === 'completed') {
          navigate(`/interview/report/${id}`);
          return;
        }

        if (active) {
          setInterview(sess);
          const firstUnanswered = sess.questions.find((q) => !q.evaluation) || sess.questions[0];
          setCurrentQuestion(firstUnanswered);

          // Greet candidate after short warm-up delay
          setTimeout(() => {
            if (active && firstUnanswered) {
              const greetingText = `Hello ${user?.name || 'Candidate'}! Welcome to your INTERVIX AI technical interview for ${sess.category}. I'm Elena, your interviewer today. Let's begin with our first question: ${firstUnanswered.question}`;
              speakAI(greetingText);
            }
          }, 800);
        }
      } catch (err) {
        if (active) setErrorMsg(err.message || 'Failed to load video interview session.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadInterview();

    return () => {
      active = false;
      stopLipSync();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [id]);

  // Candidate finishes spoken answer -> Submit to Backend
  const handleDoneAnswering = async (manualAnswer = null) => {
    const finalAnswer = (manualAnswer || transcript).trim();
    stopCandidateListening();

    if (!finalAnswer) {
      setActiveCaption('AI Elena: "I didn\'t catch your answer clearly. Please speak your explanation or click Type Answer."');
      speakAI("I didn't catch your explanation clearly. Could you please answer again or type your solution?");
      return;
    }

    setAiState('thinking');
    setIsProcessingTurn(true);
    setActiveCaption('AI Elena is analyzing your answer against technical rubrics...');

    try {
      const res = await authFetch(`/api/interviews/${id}/video-turn`, {
        method: 'POST',
        body: JSON.stringify({
          questionId: currentQuestion.questionId,
          userAnswer: finalAnswer,
        }),
      });

      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(responseData.message || 'Failed to process answer evaluation.');
      }

      const turn = responseData.data;
      setLastFeedback(turn.evaluation);

      // AI speaks conversational feedback + transitions to next question
      speakAI(turn.spokenScript, () => {
        if (turn.isCompleted) {
          navigate(`/interview/report/${id}`);
        } else if (turn.nextQuestion) {
          setCurrentQuestion(turn.nextQuestion);
          setTranscript('');
        }
      });
    } catch (err) {
      setErrorMsg(err.message || 'Error processing response.');
      setAiState('listening');
    } finally {
      setIsProcessingTurn(false);
    }
  };

  const handleRepeatQuestion = () => {
    if (currentQuestion) {
      speakAI(`Here is the question again: ${currentQuestion.question}`);
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
        <h2 className="text-xl font-bold text-white mb-2">Connecting to Video Interview Room...</h2>
        <p className="text-sm text-slate-400">Initializing AI Video Agent and WebRTC streams.</p>
      </div>
    );
  }

  const currentQNum = currentQuestion?.questionId || 1;
  const totalQCount = interview?.totalQuestions || 5;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-purple-600 selection:text-white overflow-hidden">
      {/* Video Call Top Bar */}
      <header className="h-16 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between z-30">
        <div className="flex items-center gap-4">
          <Logo to="/dashboard" />
          <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-slate-800 text-xs">
            <span className="px-2.5 py-1 rounded-md bg-purple-950/60 text-purple-300 border border-purple-500/30 font-bold">
              {interview?.category}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
              {interview?.difficulty}
            </span>
          </div>
        </div>

        {/* Call Status & Timer */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-mono">{formatTime(callTimer)}</span>
            <span className="hidden md:inline text-slate-500">| HD Secure Call</span>
          </div>

          <button
            onClick={() => {
              if (window.confirm('Do you want to end this interview session? Your answered questions are saved.')) {
                navigate(`/interview/report/${id}`);
              }
            }}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition shadow-md"
          >
            End Interview
          </button>
        </div>
      </header>

      {/* Main Video Call Area */}
      <main className="flex-1 p-3 sm:p-6 flex flex-col lg:flex-row gap-4 max-w-7xl w-full mx-auto relative overflow-hidden">
        {/* Left: AI Interviewer Video Screen (Elena) */}
        <div className="flex-1 relative rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col justify-between p-6 sm:p-8">
          {/* Top Info overlay */}
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-3 bg-slate-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-800 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping" />
              <span className="font-bold text-white">Elena Vance</span>
              <span className="text-purple-300 text-[11px]">Staff AI Technical Recruiter</span>
            </div>

            {/* AI Status Badge */}
            <div className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
              aiState === 'speaking'
                ? 'bg-purple-900/60 text-purple-300 border border-purple-500/40'
                : aiState === 'thinking'
                ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-500/40'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                aiState === 'speaking' ? 'bg-purple-400 animate-pulse' : aiState === 'thinking' ? 'bg-cyan-400 animate-spin' : 'bg-slate-500'
              }`} />
              <span>{aiState === 'speaking' ? 'Speaking' : aiState === 'thinking' ? 'Evaluating' : 'Listening'}</span>
            </div>
          </div>

          {/* Center: Animated Virtual Human Interviewer Avatar */}
          <div className="my-auto flex flex-col items-center justify-center relative z-10 py-4">
            {/* Ambient Aura behind avatar */}
            <div className={`absolute w-64 h-64 rounded-full blur-[90px] transition-all duration-700 pointer-events-none ${
              aiState === 'speaking'
                ? 'bg-purple-600/30 scale-125'
                : aiState === 'thinking'
                ? 'bg-cyan-500/30 scale-110'
                : 'bg-indigo-600/15 scale-100'
            }`} />

            {/* Stylized Photorealistic AI Avatar Representation */}
            <div className="relative w-44 h-44 sm:w-56 sm:h-56 rounded-full p-[3px] bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-400 shadow-2xl flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-slate-950 flex flex-col items-center justify-center overflow-hidden relative">
                {/* Avatar SVG Figure */}
                <svg viewBox="0 0 160 160" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Subtle Studio Backdrop */}
                  <rect width="160" height="160" fill="#0B1120" />
                  <circle cx="80" cy="80" r="70" fill="url(#bgGrad)" opacity="0.4" />
                  
                  {/* Shoulders & Business Suit */}
                  <path d="M25 155C28 120 50 110 80 110C110 110 132 120 135 155Z" fill="#1E293B" />
                  <path d="M58 112L80 145L102 112" fill="#3B82F6" opacity="0.8" />
                  <path d="M68 110L80 132L92 110" fill="#FFFFFF" />

                  {/* Neck */}
                  <rect x="72" y="92" width="16" height="22" rx="4" fill="#F1C27D" />

                  {/* Head */}
                  <ellipse cx="80" cy="68" rx="30" ry="34" fill="#FCD399" />

                  {/* Professional Hair */}
                  <path d="M48 64C46 36 60 22 80 22C100 22 114 36 112 64C112 68 108 52 104 48C94 38 66 38 56 48C52 52 48 68 48 64Z" fill="#332418" />
                  <path d="M47 62C45 74 46 90 50 96C51 86 52 72 54 66C52 64 49 62 47 62Z" fill="#332418" />
                  <path d="M113 62C115 74 114 90 110 96C109 86 108 72 106 66C108 64 111 62 113 62Z" fill="#332418" />

                  {/* Eyes with attentive gaze */}
                  <ellipse cx="68" cy="65" rx="4" ry="4" fill="#1E293B" />
                  <circle cx="69.5" cy="63.5" r="1.2" fill="#FFFFFF" />
                  <ellipse cx="92" cy="65" rx="4" ry="4" fill="#1E293B" />
                  <circle cx="93.5" cy="63.5" r="1.2" fill="#FFFFFF" />

                  {/* Eyebrows */}
                  <path d="M63 58C67 56 73 57 75 59" stroke="#332418" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M97 58C93 56 87 57 85 59" stroke="#332418" strokeWidth="1.8" strokeLinecap="round" />

                  {/* Nose */}
                  <path d="M79 67L77 75H83" stroke="#DDA15E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />

                  {/* Lip-Sync Animated Mouth */}
                  {mouthOpen && aiState === 'speaking' ? (
                    <ellipse cx="80" cy="85" rx="6" ry="4.5" fill="#C2410C" />
                  ) : (
                    <path d="M74 84C77 86 83 86 86 84" stroke="#C2410C" strokeWidth="2.2" strokeLinecap="round" />
                  )}

                  <defs>
                    <radialGradient id="bgGrad" cx="0.5" cy="0.5" r="0.5">
                      <stop offset="0%" stopColor="#7C3AED" />
                      <stop offset="100%" stopColor="#0B1120" />
                    </radialGradient>
                  </defs>
                </svg>

                {/* Subtitle Indicator */}
                <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                  <div className="flex gap-1 items-center h-2">
                    {[1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className={`w-1 rounded-full transition-all duration-300 ${
                          aiState === 'speaking' ? 'bg-purple-400 h-3 animate-pulse' : 'bg-slate-700 h-1'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Current Active Question Display */}
            <div className="mt-5 max-w-lg text-center px-4">
              <span className="text-[11px] uppercase font-bold tracking-widest text-purple-400 block mb-1">
                Question {currentQNum} of {totalQCount}
              </span>
              <p className="text-base sm:text-lg font-medium text-white leading-relaxed drop-shadow-md">
                "{currentQuestion?.question}"
              </p>
            </div>
          </div>

          {/* Subtitles / Live Captions Overlay */}
          {showCaptions && activeCaption && (
            <div className="z-10 mt-auto p-3 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800 text-xs sm:text-sm text-slate-200 text-center font-medium animate-fadeIn">
              {activeCaption}
            </div>
          )}
        </div>

        {/* Right: Candidate Live Webcam Preview & Controls */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          {/* Candidate Video Window */}
          <div className="relative rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden aspect-video lg:aspect-auto lg:h-52 shadow-xl flex items-center justify-center">
            {isCameraOn ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-4 text-center">
                <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-xl font-bold text-slate-300 mb-2">
                  SR
                </div>
                <span className="text-xs text-slate-400 font-medium">Camera is Off</span>
              </div>
            )}

            {/* Candidate Name Badge */}
            <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-sm px-2.5 py-1 rounded-md text-[11px] font-bold text-white border border-slate-800">
              {user?.name || 'Satyajit Rout'} (You)
            </div>

            {/* Mic Indicator */}
            <div className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs ${
              isMicOn ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' : 'bg-red-950 text-red-400 border border-red-500/40'
            }`}>
              {isMicOn ? '🎤' : '🔇'}
            </div>
          </div>

          {/* Real-time Spoken Transcript Box */}
          <div className="flex-1 rounded-2xl bg-slate-900/80 border border-slate-800 p-4 flex flex-col justify-between shadow-xl min-h-[160px]">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                  Spoken Answer
                </span>
                <span className="text-[10px] text-slate-500">Live STT</span>
              </div>

              <div className="mt-2 text-xs font-mono text-slate-300 leading-relaxed max-h-36 overflow-y-auto pr-1">
                {transcript ? (
                  transcript
                ) : (
                  <span className="text-slate-500 italic">
                    {isListening
                      ? 'Listening to your microphone... Speak clearly.'
                      : 'Click "Start Answering" or "Speak" below.'}
                  </span>
                )}
              </div>
            </div>

            {/* Answer Action Button */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <button
                type="button"
                onClick={() => handleDoneAnswering()}
                disabled={isProcessingTurn || !transcript.trim()}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {isProcessingTurn ? (
                  <span>AI Analyzing Answer...</span>
                ) : (
                  <>
                    <span>Submit Spoken Answer</span>
                    <span>→</span>
                  </>
                )}
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRepeatQuestion}
                  className="flex-1 py-1.5 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                >
                  🔊 Repeat Question
                </button>
                <button
                  type="button"
                  onClick={() => setShowTextInputModal(true)}
                  className="flex-1 py-1.5 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                >
                  ⌨️ Type Answer
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Video Call Controls Dock */}
      <footer className="h-20 bg-slate-950/95 border-t border-slate-800/80 px-6 flex items-center justify-center gap-4 z-30">
        {/* Toggle Microphone */}
        <button
          onClick={() => {
            const next = !isMicOn;
            setIsMicOn(next);
            if (!next) stopCandidateListening();
          }}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg transition-all shadow-md ${
            isMicOn
              ? 'bg-slate-800 text-slate-100 hover:bg-slate-700'
              : 'bg-red-600 text-white hover:bg-red-500'
          }`}
          title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
        >
          {isMicOn ? '🎤' : '🔇'}
        </button>

        {/* Toggle Camera */}
        <button
          onClick={() => setIsCameraOn(!isCameraOn)}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg transition-all shadow-md ${
            isCameraOn
              ? 'bg-slate-800 text-slate-100 hover:bg-slate-700'
              : 'bg-red-600 text-white hover:bg-red-500'
          }`}
          title={isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
        >
          {isCameraOn ? '📹' : '🚫'}
        </button>

        {/* Captions Toggle */}
        <button
          onClick={() => setShowCaptions(!showCaptions)}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xs transition-all shadow-md ${
            showCaptions
              ? 'bg-purple-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
          title="Toggle Subtitles / Captions"
        >
          CC
        </button>

        {/* End Call */}
        <button
          onClick={() => {
            if (window.confirm('Do you want to end this interview session? Your answered questions are saved.')) {
              navigate(`/interview/report/${id}`);
            }
          }}
          className="w-12 h-12 rounded-2xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center text-lg shadow-lg shadow-red-600/30 transition-all hover:scale-105"
          title="End Call"
        >
          📞
        </button>
      </footer>

      {/* Fallback Text Input Modal */}
      {showTextInputModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Type Technical Answer</h3>
              <button
                onClick={() => setShowTextInputModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              <strong>Question:</strong> {currentQuestion?.question}
            </p>

            <textarea
              rows={6}
              value={textFallbackAnswer}
              onChange={(e) => setTextFallbackAnswer(e.target.value)}
              placeholder="Type your explanation or code solution here..."
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowTextInputModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (textFallbackAnswer.trim()) {
                    setTranscript(textFallbackAnswer.trim());
                    setShowTextInputModal(false);
                    handleDoneAnswering(textFallbackAnswer.trim());
                    setTextFallbackAnswer('');
                  }
                }}
                className="px-5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-lg shadow-md"
              >
                Submit Written Answer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
