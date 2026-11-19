import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import MicrophoneTest from '../components/MicrophoneTest';
import {
  Mic,
  MicOff,
  PhoneOff,
  Sparkles,
  RotateCcw,
  Keyboard,
  Radio,
  Volume2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Shield,
  Video,
  Clock,
  Settings,
  FastForward,
  Check,
  Send,
  Loader2,
} from 'lucide-react';

export default function VideoInterview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authFetch, user } = useAuth();

  const [interview, setInterview] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Call & Audio State
  const [isMicOn, setIsMicOn] = useState(true);
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  const [micPermissionError, setMicPermissionError] = useState('');
  const [audioInputLevel, setAudioInputLevel] = useState(0); // 0 - 100
  const [selectedDeviceId, setSelectedDeviceId] = useState(() => {
    return localStorage.getItem('intervix_mic_device_id') || '';
  });
  const [availableDevices, setAvailableDevices] = useState([]);
  const [showMicSettingsModal, setShowMicSettingsModal] = useState(false);

  // Captions & Timer
  const [showCaptions, setShowCaptions] = useState(true);
  const [activeCaption, setActiveCaption] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(900); // 15 mins default

  // AI Interviewer State: 'speaking' | 'listening' | 'evaluating' | 'idle'
  const [aiState, setAiState] = useState('idle');
  const [mouthOpen, setMouthOpen] = useState(false);

  // Candidate Speech & Transcription
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribingBackend, setIsTranscribingBackend] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(true);
  const [showTextInputModal, setShowTextInputModal] = useState(false);
  const [manualTextAnswer, setManualTextAnswer] = useState('');

  // Evaluation & Question Progress State
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [spokenFeedback, setSpokenFeedback] = useState('');
  const [isQuestionAnswered, setIsQuestionAnswered] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [isAdvancingQuestion, setIsAdvancingQuestion] = useState(false);

  // Audio / Media / WebSpeech Refs
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const lipSyncIntervalRef = useRef(null);
  const hasSpokenWelcomeRef = useRef(false);

  // ----------------------------------------------------
  // 1. COUNTDOWN TIMER WITH PERSISTED BACKEND DEADLINE
  // ----------------------------------------------------
  useEffect(() => {
    if (!interview || !interview.deadline || interview.status === 'completed') return;

    const calculateRemaining = () => {
      const diffMs = new Date(interview.deadline).getTime() - Date.now();
      const secs = Math.max(0, Math.floor(diffMs / 1000));
      setRemainingSeconds(secs);

      if (secs === 0 && interview.status === 'in_progress') {
        handleTimeExpired();
      }
    };

    calculateRemaining();
    const timerInterval = setInterval(calculateRemaining, 1000);
    return () => clearInterval(timerInterval);
  }, [interview?.deadline, interview?.status]);

  const handleTimeExpired = async () => {
    try {
      await authFetch(`/api/interviews/${id}/finish`, { method: 'POST' });
    } catch {}
    navigate(`/interview/report/${id}`);
  };

  const formatCountdown = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ----------------------------------------------------
  // 2. HARDWARE MICROPHONE STREAM & AUDIO ANALYSER
  // ----------------------------------------------------
  const initMicrophoneStream = async (deviceIdToUse = null) => {
    setMicPermissionError('');

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setMicPermissionError(
        'Browsers require a secure origin (HTTPS or localhost) to capture microphone audio.'
      );
      return false;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicPermissionError('Your browser does not support audio capture via MediaDevices.');
      return false;
    }

    // Stop existing tracks & audio context before creating new
    cleanupMicrophone();

    try {
      const devId = deviceIdToUse || selectedDeviceId;
      const audioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };

      if (devId) {
        audioConstraints.deviceId = { exact: devId };
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false,
      });

      streamRef.current = stream;
      setMicPermissionGranted(true);

      // Enumerate available input devices
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const inputs = allDevices.filter((d) => d.kind === 'audioinput');
        setAvailableDevices(inputs);

        const activeTrack = stream.getAudioTracks()[0];
        if (activeTrack) {
          const settings = activeTrack.getSettings();
          const currentDevId = settings.deviceId || devId || (inputs[0] ? inputs[0].deviceId : '');
          setSelectedDeviceId(currentDevId);
          if (currentDevId) {
            localStorage.setItem('intervix_mic_device_id', currentDevId);
          }
        }
      } catch (enumErr) {
        console.warn('[Device Enumeration Note]:', enumErr);
      }

      // Initialize Web Audio API Analyser for Live Volume Visualizer
      setupAudioVisualizer(stream);
      return true;
    } catch (err) {
      console.error('[Microphone Permission Error]:', err);
      setMicPermissionGranted(false);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicPermissionError(
          'Microphone permission denied. Please click the lock or camera icon in your address bar and allow microphone access.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setMicPermissionError('No microphone detected on your system. Please connect an audio input device.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setMicPermissionError('Microphone is in use by another application or blocked by your operating system.');
      } else if (err.name === 'OverconstrainedError') {
        // Fallback to default
        setSelectedDeviceId('');
        localStorage.removeItem('intervix_mic_device_id');
        return initMicrophoneStream('');
      } else {
        setMicPermissionError(err.message || 'Unable to open microphone stream.');
      }
      return false;
    }
  };

  const setupAudioVisualizer = (stream) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const loop = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(100, Math.round((avg / 110) * 100));
        setAudioInputLevel(normalized);

        animFrameRef.current = requestAnimationFrame(loop);
      };

      animFrameRef.current = requestAnimationFrame(loop);
    } catch (e) {
      console.warn('[AudioContext Visualizer Error]:', e);
    }
  };

  const cleanupMicrophone = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setAudioInputLevel(0);
  };

  // ----------------------------------------------------
  // 3. MEDIA RECORDER & AUDIO CHUNK CAPTURE
  // ----------------------------------------------------
  const startMediaRecording = () => {
    if (!streamRef.current || streamRef.current.getAudioTracks().length === 0) {
      return;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      return;
    }

    audioChunksRef.current = [];

    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/wav',
    ];
    let selectedMime = '';
    for (const m of mimeTypes) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) {
        selectedMime = m;
        break;
      }
    }

    try {
      const recorder = selectedMime
        ? new MediaRecorder(streamRef.current, { mimeType: selectedMime })
        : new MediaRecorder(streamRef.current);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start(250); // Emit chunk every 250ms
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.warn('[MediaRecorder Start Warning]:', err);
    }
  };

  const stopMediaRecording = () => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        setIsRecording(false);
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setIsRecording(false);
        resolve(audioBlob.size > 0 ? audioBlob : null);
      };

      try {
        mediaRecorderRef.current.stop();
      } catch {
        setIsRecording(false);
        resolve(null);
      }
    });
  };

  // ----------------------------------------------------
  // 4. SPEECH-TO-TEXT (REAL-TIME WEBSPEECH + BACKEND STT)
  // ----------------------------------------------------
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setRecognitionSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript + ' ';
        }
        const cleaned = fullTranscript.trim();
        setTranscript(cleaned);
        if (showCaptions && cleaned) {
          setActiveCaption(`Candidate: "${cleaned}"`);
        }
      };

      recognition.onerror = (event) => {
        if (event.error === 'no-speech') {
          // Normal silence, keep alive
          return;
        }
        if (event.error === 'not-allowed') {
          setMicPermissionGranted(false);
          setMicPermissionError('Speech recognition microphone access denied.');
        } else if (event.error === 'network') {
          console.warn('[SpeechRecognition Network Notice]: Falling back to backend transcription.');
        }
      };

      recognition.onend = () => {
        // Only restart if candidate is actively answering, mic is unmuted, and AI is not speaking
        if (isRecording && isMicOn && aiState === 'listening') {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('[SpeechRecognition Init Error]:', e);
      setRecognitionSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }
    };
  }, [showCaptions]);

  const startListeningSession = () => {
    if (!isMicOn) return;
    setAiState('listening');
    setActiveCaption('Listening to your answer... Speak into your microphone.');

    // Start raw audio recording
    startMediaRecording();

    // Start live browser speech recognition if available
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        // Recognition might already be active
      }
    }
  };

  const stopListeningSession = async () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    const blob = await stopMediaRecording();
    return blob;
  };

  // ----------------------------------------------------
  // 5. TEXT-TO-SPEECH (AI INTERVIEWER SPEAKS)
  // ----------------------------------------------------
  const startLipSync = () => {
    stopLipSync();
    lipSyncIntervalRef.current = setInterval(() => {
      setMouthOpen((prev) => !prev);
    }, 135);
  };

  const stopLipSync = () => {
    if (lipSyncIntervalRef.current) {
      clearInterval(lipSyncIntervalRef.current);
      lipSyncIntervalRef.current = null;
    }
    setMouthOpen(false);
  };

  const speakAI = (text, onComplete) => {
    // 1. Immediately pause candidate microphone recording to prevent AI speaker acoustic feedback
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.pause();
      } catch {}
    }

    if (!synthRef.current) {
      if (onComplete) onComplete();
      return;
    }

    synthRef.current.cancel();
    setAiState('speaking');
    setActiveCaption(`AI Elena: "${text}"`);
    startLipSync();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.98;
    utterance.pitch = 1.05;

    const voices = synthRef.current.getVoices();
    const naturalVoice = voices.find(
      (v) =>
        v.name.includes('Google') ||
        v.name.includes('Natural') ||
        v.name.includes('Samantha') ||
        (v.lang === 'en-US' && v.name.includes('Female'))
    );
    if (naturalVoice) utterance.voice = naturalVoice;

    utterance.onend = () => {
      stopLipSync();
      if (onComplete) {
        onComplete();
      } else {
        setAiState('listening');
      }
    };

    utterance.onerror = () => {
      stopLipSync();
      if (onComplete) {
        onComplete();
      } else {
        setAiState('listening');
      }
    };

    synthRef.current.speak(utterance);
  };

  // ----------------------------------------------------
  // 6. INITIALIZE SESSION & RESTORE ON REFRESH
  // ----------------------------------------------------
  useEffect(() => {
    async function loadInterviewSession() {
      try {
        setLoading(true);
        setErrorMsg('');

        // Step 1: Request microphone permission
        await initMicrophoneStream();

        // Step 2: Fetch interview session details
        const res = await authFetch(`/api/interviews/${id}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || 'Failed to connect to interview session.');
        }

        const interviewData = data.data?.interview || data.interview;
        setInterview(interviewData);

        const currentIdx = interviewData.currentQuestionIndex || 0;
        setCurrentQuestionIndex(currentIdx);

        const q = interviewData.questions[currentIdx] || interviewData.questions[0];
        setCurrentQuestion(q);

        // If question already has an answer / evaluation (restored on refresh)
        if (q?.evaluation) {
          setEvaluationResult(q.evaluation);
          setTranscript(q.userAnswer || '');
          setIsQuestionAnswered(true);
          setAiState('idle');
          setActiveCaption('Session restored. You can review your evaluation or click Next Question.');
          return;
        }

        // Fresh Question: Greet and speak
        if (!hasSpokenWelcomeRef.current) {
          hasSpokenWelcomeRef.current = true;
          const greeting = currentIdx === 0
            ? `Hello ${user?.name || 'Candidate'}! Welcome to your INTERVIX AI technical interview. I will be your interviewer. Let's begin: ${q.question}`
            : `Here is your next question: ${q.question}`;

          setTimeout(() => {
            speakAI(greeting, () => {
              startListeningSession();
            });
          }, 600);
        }
      } catch (err) {
        console.error('[Load Session Error]:', err);
        setErrorMsg(err.message || 'Unable to connect to interview room.');
      } finally {
        setLoading(false);
      }
    }

    loadInterviewSession();

    return () => {
      if (synthRef.current) synthRef.current.cancel();
      stopLipSync();
      cleanupMicrophone();
    };
  }, [id]);

  // ----------------------------------------------------
  // 7. SUBMIT CANDIDATE ANSWER (DUAL-PATH TRANSCRIPTION)
  // ----------------------------------------------------
  const handleSubmitAnswer = async (manualAnswer = null) => {
    let finalAnswer = (manualAnswer !== null ? manualAnswer : transcript).trim();

    // Stop microphone recording
    const recordedBlob = await stopListeningSession();

    // If live transcript is empty but audio was recorded, send to backend fallback STT
    if (!finalAnswer && recordedBlob && recordedBlob.size > 2000) {
      setIsTranscribingBackend(true);
      setActiveCaption('Transcribing candidate voice via backend speech engine...');
      try {
        const formData = new FormData();
        const ext = recordedBlob.type.includes('webm') ? 'webm' : 'wav';
        formData.append('audioFile', recordedBlob, `candidate_turn.${ext}`);

        const transRes = await authFetch(`/api/interviews/${id}/transcribe`, {
          method: 'POST',
          body: formData,
        });

        if (transRes.ok) {
          const transData = await transRes.json();
          if (transData.data?.transcript && transData.data.transcript.trim()) {
            finalAnswer = transData.data.transcript.trim();
            setTranscript(finalAnswer);
          }
        }
      } catch (transErr) {
        console.warn('[Backend STT Attempt Notice]:', transErr);
      } finally {
        setIsTranscribingBackend(false);
      }
    }

    // Validate non-empty answer
    if (!finalAnswer || finalAnswer.length < 3) {
      speakAI(
        "I didn't catch an answer through your microphone. Please speak your answer clearly or click Type Answer.",
        () => {
          startListeningSession();
        }
      );
      return;
    }

    setIsEvaluating(true);
    setAiState('evaluating');
    setActiveCaption('Elena is analyzing your technical answer against rubric dimensions...');

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
        throw new Error(responseData.message || 'Failed to evaluate answer.');
      }

      const turn = responseData.data;
      setEvaluationResult(turn.evaluation);
      setSpokenFeedback(turn.spokenScript || '');
      setIsQuestionAnswered(true);

      // AI speaks conversational feedback. Once finished, AI goes idle and Next Question is ready!
      speakAI(turn.spokenScript, () => {
        setAiState('idle');
        setActiveCaption('Evaluation complete. Review your score and click Next Question to continue.');
      });
    } catch (err) {
      console.error('[Submit Answer Error]:', err);
      setErrorMsg(err.message || 'Error evaluating answer.');
      setAiState('listening');
    } finally {
      setIsEvaluating(false);
    }
  };

  // ----------------------------------------------------
  // 8. NEXT QUESTION BUTTON (REQUIREMENT 3)
  // ----------------------------------------------------
  const handleNextQuestion = async () => {
    const isFinal = currentQuestion?.questionId >= (interview?.totalQuestions || 5);

    if (isFinal) {
      navigate(`/interview/report/${id}`);
      return;
    }

    setIsAdvancingQuestion(true);
    try {
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
      const nextIdx = data.data?.currentQuestionIndex;

      setCurrentQuestion(nextQ);
      setCurrentQuestionIndex(nextIdx);
      setTranscript('');
      setEvaluationResult(null);
      setSpokenFeedback('');
      setIsQuestionAnswered(false);

      // Speak new question
      const prompt = `Question number ${nextQ.questionId}: ${nextQ.question}`;
      speakAI(prompt, () => {
        startListeningSession();
      });
    } catch (err) {
      console.error('[Next Question Error]:', err);
      setErrorMsg(err.message || 'Failed to advance to next question.');
    } finally {
      setIsAdvancingQuestion(false);
    }
  };

  // ----------------------------------------------------
  // 9. SKIP QUESTION (REQUIREMENT 3)
  // ----------------------------------------------------
  const handleSkipConfirm = async () => {
    setShowSkipModal(false);
    setIsAdvancingQuestion(true);

    try {
      const res = await authFetch(`/api/interviews/${id}/skip-question`, {
        method: 'POST',
      });
      const data = await res.json();

      if (data.data?.isCompleted) {
        navigate(`/interview/report/${id}`);
        return;
      }

      const nextQ = data.data?.nextQuestion;
      const nextIdx = data.data?.currentQuestionIndex;

      setCurrentQuestion(nextQ);
      setCurrentQuestionIndex(nextIdx);
      setTranscript('');
      setEvaluationResult(null);
      setSpokenFeedback('');
      setIsQuestionAnswered(false);

      speakAI(`Skipping to Question ${nextQ.questionId}: ${nextQ.question}`, () => {
        startListeningSession();
      });
    } catch (err) {
      setErrorMsg(err.message || 'Error skipping question.');
    } finally {
      setIsAdvancingQuestion(false);
    }
  };

  // ----------------------------------------------------
  // 10. REPLAY QUESTION BUTTON
  // ----------------------------------------------------
  const handleRepeatQuestion = () => {
    if (currentQuestion) {
      speakAI(`Here is the question again: ${currentQuestion.question}`, () => {
        if (!isQuestionAnswered) {
          startListeningSession();
        }
      });
    }
  };

  // Toggle Mute / Unmute
  const toggleMute = () => {
    const nextState = !isMicOn;
    setIsMicOn(nextState);

    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = nextState;
      });
    }

    if (!nextState) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    } else {
      if (aiState === 'listening') {
        startListeningSession();
      }
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-400 p-[2px] animate-pulse mb-6">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
            <Radio className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Connecting to AI Interview Room...</h2>
        <p className="text-xs text-slate-400">Testing microphone access & establishing real-time audio pipeline.</p>
      </div>
    );
  }

  const currentQNum = currentQuestion ? currentQuestion.questionId : currentQuestionIndex + 1;
  const totalQCount = interview?.totalQuestions || 5;
  const isFinalQuestion = currentQNum >= totalQCount;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-purple-600 selection:text-white">
      {/* Top Session Bar */}
      <header className="h-16 bg-slate-950/90 border-b border-slate-800/80 px-4 sm:px-8 flex items-center justify-between z-30 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Logo to="/dashboard" />
          <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-slate-800 text-xs text-slate-300">
            <span className="font-semibold text-white">{interview?.category || 'AI Interview Round'}</span>
            <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30 text-[10px] font-mono">
              {interview?.difficulty || 'Intermediate'}
            </span>
          </div>
        </div>

        {/* Live Status Indicators & Countdown Timer */}
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-mono text-[11px] hidden sm:inline">Elena AI Live</span>
          </div>

          {/* Countdown Timer (Requirement 4) */}
          <div
            className={`px-3 py-1 rounded-full border text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              remainingSeconds <= 60
                ? 'bg-red-950/80 border-red-500/60 text-red-400 animate-pulse'
                : remainingSeconds <= 300
                ? 'bg-amber-950/80 border-amber-500/50 text-amber-400'
                : 'bg-slate-900 border-slate-800 text-cyan-400'
            }`}
            title="Interview Countdown Timer"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>⏱ {formatCountdown(remainingSeconds)}</span>
          </div>
        </div>
      </header>

      {/* Permission Warning Banner */}
      {micPermissionError && (
        <div className="bg-red-950/90 border-b border-red-500/40 px-6 py-2.5 text-xs text-red-200 flex items-center justify-between z-30">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{micPermissionError}</span>
          </div>
          <button
            onClick={() => initMicrophoneStream()}
            className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] transition"
          >
            Enable Microphone
          </button>
        </div>
      )}

      {/* Main Video & Audio Studio */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-6 relative">
        {/* Left: AI Interviewer Video Avatar Screen */}
        <div className="flex-1 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border border-purple-500/20 shadow-2xl overflow-hidden relative flex flex-col p-6 min-h-[440px]">
          {/* Interviewer Details & Status Badge */}
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-950/80 border border-slate-800 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping" />
              <span className="font-bold text-white">Elena Vance</span>
              <span className="text-purple-300 text-[11px]">Staff AI Technical Recruiter</span>
            </div>

            {/* AI Status Badge */}
            <div
              className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
                aiState === 'speaking'
                  ? 'bg-purple-900/60 text-purple-300 border border-purple-500/40'
                  : aiState === 'evaluating'
                  ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-500/40'
                  : aiState === 'listening'
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  aiState === 'speaking'
                    ? 'bg-purple-400 animate-pulse'
                    : aiState === 'evaluating'
                    ? 'bg-cyan-400 animate-spin'
                    : aiState === 'listening'
                    ? 'bg-emerald-400 animate-ping'
                    : 'bg-slate-500'
                }`}
              />
              <span>
                {aiState === 'speaking'
                  ? 'Speaking'
                  : aiState === 'evaluating'
                  ? 'Evaluating'
                  : aiState === 'listening'
                  ? 'Listening'
                  : 'Ready'}
              </span>
            </div>
          </div>

          {/* Center: Animated Virtual Human Interviewer Avatar */}
          <div className="my-auto flex flex-col items-center justify-center relative z-10 py-4">
            {/* Ambient Aura */}
            <div
              className={`absolute w-64 h-64 rounded-full blur-[90px] transition-all duration-700 pointer-events-none ${
                aiState === 'speaking'
                  ? 'bg-purple-600/30 scale-125'
                  : aiState === 'evaluating'
                  ? 'bg-cyan-500/30 scale-110'
                  : 'bg-indigo-600/15 scale-100'
              }`}
            />

            {/* AI Avatar Face */}
            <div className="relative w-44 h-44 sm:w-56 sm:h-56 rounded-full p-[3px] bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-400 shadow-2xl flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-slate-950 flex flex-col items-center justify-center overflow-hidden relative">
                <svg viewBox="0 0 160 160" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="160" height="160" fill="#0B1120" />
                  <circle cx="80" cy="80" r="70" fill="url(#bgGrad)" opacity="0.4" />
                  <path d="M25 155C28 120 50 110 80 110C110 110 132 120 135 155Z" fill="#1E293B" />
                  <path d="M58 112L80 145L102 112" fill="#3B82F6" opacity="0.8" />
                  <path d="M68 110L80 132L92 110" fill="#FFFFFF" />
                  <rect x="72" y="92" width="16" height="22" rx="4" fill="#F1C27D" />
                  <ellipse cx="80" cy="68" rx="30" ry="34" fill="#FCD399" />
                  <path
                    d="M48 64C46 36 60 22 80 22C100 22 114 36 112 64C112 68 108 52 104 48C94 38 66 38 56 48C52 52 48 68 48 64Z"
                    fill="#332418"
                  />
                  <path d="M47 62C45 74 46 90 50 96C51 86 52 72 54 66C52 64 49 62 47 62Z" fill="#332418" />
                  <path d="M113 62C115 74 114 90 110 96C109 86 108 72 106 66C108 64 111 62 113 62Z" fill="#332418" />
                  <ellipse cx="68" cy="65" rx="4" ry="4" fill="#1E293B" />
                  <circle cx="69.5" cy="63.5" r="1.2" fill="#FFFFFF" />
                  <ellipse cx="92" cy="65" rx="4" ry="4" fill="#1E293B" />
                  <circle cx="93.5" cy="63.5" r="1.2" fill="#FFFFFF" />
                  <path d="M63 58C67 56 73 57 75 59" stroke="#332418" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M97 58C93 56 87 57 85 59" stroke="#332418" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M79 67L77 75H83" stroke="#DDA15E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
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
            <div className="z-10 mt-auto p-3 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-800 text-xs sm:text-sm text-slate-200 text-center font-medium">
              {activeCaption}
            </div>
          )}
        </div>

        {/* Right: Candidate Audio Panel & Real-Time Answer Stream */}
        <div className="w-full lg:w-88 flex flex-col gap-4">
          {/* Candidate Voice Card */}
          <div className="relative rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-cyan-400 p-[2px] shadow-lg shadow-purple-600/20">
              <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center text-sm font-bold text-white">
                {user?.name
                  ? user.name
                      .split(' ')
                      .map((p) => p[0])
                      .join('')
                      .toUpperCase()
                  : 'SR'}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">{user?.name || 'Candidate'} (You)</h3>
              <p className="text-[11px] text-slate-400 truncate max-w-[220px]">
                {availableDevices.find((d) => d.deviceId === selectedDeviceId)?.label || 'Microphone Channel'}
              </p>
            </div>

            {/* Live Audio Visualizer Waves (Driven by Web Audio API Level) */}
            <div className="flex items-center gap-1.5 h-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
                const barHeight = isMicOn && micPermissionGranted
                  ? Math.max(4, Math.min(24, Math.round((audioInputLevel / 100) * 24 * (1 + (i % 3) * 0.2))))
                  : 4;
                return (
                  <span
                    key={i}
                    className={`w-1 rounded-full transition-all duration-75 ${
                      isMicOn && audioInputLevel > 15
                        ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                        : isMicOn
                        ? 'bg-emerald-500/60'
                        : 'bg-slate-700'
                    }`}
                    style={{ height: `${barHeight}px` }}
                  />
                );
              })}
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
              {isMicOn && micPermissionGranted ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <Mic className="w-3.5 h-3.5" /> Mic Ready ({audioInputLevel}%)
                </span>
              ) : !micPermissionGranted ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Permission Required
                </span>
              ) : (
                <span className="text-red-400 flex items-center gap-1">
                  <MicOff className="w-3.5 h-3.5" /> Muted
                </span>
              )}

              <button
                type="button"
                onClick={() => setShowMicSettingsModal(true)}
                className="text-cyan-400 hover:underline text-[10px] pl-2 border-l border-slate-800"
              >
                Settings
              </button>
            </div>
          </div>

          {/* Real-time Spoken Transcript Box & Answer Actions */}
          <div className="flex-1 rounded-2xl bg-slate-900/80 border border-slate-800 p-4 flex flex-col justify-between shadow-xl min-h-[220px]">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isRecording && isMicOn ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                    }`}
                  />
                  Your Answer
                </span>
                <span className="text-[10px] text-slate-500">Live Transcription</span>
              </div>

              {/* Editable Answer Textarea */}
              <div className="mt-2">
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  disabled={isEvaluating || isQuestionAnswered}
                  rows={4}
                  placeholder={
                    isRecording && isMicOn
                      ? 'Listening to your microphone... Speak clearly, or edit this text directly.'
                      : 'Microphone paused. Click Submit Answer or Type Answer.'
                  }
                  className="w-full p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-none focus:border-purple-500 transition resize-none leading-relaxed"
                />
              </div>

              {/* Short Evaluation Result Pill (Shown after submission) */}
              {evaluationResult && (
                <div className="mt-2 p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs space-y-1 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Score: {evaluationResult.score}/100
                    </span>
                    <span className="text-[10px] font-mono uppercase text-purple-300">
                      {evaluationResult.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 line-clamp-2">
                    {evaluationResult.feedback}
                  </p>
                </div>
              )}
            </div>

            {/* Answer & Next Question Buttons (Requirements 1, 3, 4) */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              {/* If not yet evaluated: Submit Answer Button */}
              {!isQuestionAnswered ? (
                <button
                  type="button"
                  onClick={() => handleSubmitAnswer()}
                  disabled={isEvaluating || isTranscribingBackend || (!transcript.trim() && !isRecording)}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {isEvaluating || isTranscribingBackend ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isTranscribingBackend ? 'Transcribing Voice...' : 'Evaluating Answer...'}</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Answer</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              ) : (
                /* Next Question Button - Enabled only after successful evaluation */
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  disabled={isAdvancingQuestion || isEvaluating}
                  className="w-full py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  {isAdvancingQuestion ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Loading Next Question...</span>
                    </>
                  ) : isFinalQuestion ? (
                    <>
                      <span>Finish Interview & View Report</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Next Question →</span>
                    </>
                  )}
                </button>
              )}

              {/* Secondary Controls: Replay Question, Type Answer, Skip Question */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handleRepeatQuestion}
                  disabled={aiState === 'speaking'}
                  className="py-1.5 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition flex items-center justify-center gap-1 disabled:opacity-50"
                  title="AI repeats the current question"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Replay</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowTextInputModal(true)}
                  disabled={isQuestionAnswered}
                  className="py-1.5 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition flex items-center justify-center gap-1 disabled:opacity-50"
                  title="Type your answer manually"
                >
                  <Keyboard className="w-3 h-3" />
                  <span>Type</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSkipModal(true)}
                  disabled={isQuestionAnswered || isAdvancingQuestion}
                  className="py-1.5 text-[11px] font-semibold bg-slate-800 hover:bg-red-950/60 hover:text-red-300 text-slate-400 rounded-lg transition flex items-center justify-center gap-1 disabled:opacity-50"
                  title="Skip this question with confirmation"
                >
                  <FastForward className="w-3 h-3" />
                  <span>Skip</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Video Call Bottom Dock Controls */}
      <footer className="h-20 bg-slate-950/95 border-t border-slate-800/80 px-6 flex items-center justify-center gap-4 z-30">
        {/* Toggle Microphone */}
        <button
          onClick={toggleMute}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg transition-all shadow-md ${
            isMicOn
              ? 'bg-slate-800 text-slate-100 hover:bg-slate-700'
              : 'bg-red-600 text-white hover:bg-red-500'
          }`}
          title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
        >
          {isMicOn ? <Mic className="w-5 h-5 text-emerald-400" /> : <MicOff className="w-5 h-5 text-white" />}
        </button>

        {/* Captions Toggle */}
        <button
          onClick={() => setShowCaptions(!showCaptions)}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xs transition-all shadow-md ${
            showCaptions ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
          title="Toggle Subtitles / Captions"
        >
          CC
        </button>

        {/* Audio / Mic Settings */}
        <button
          onClick={() => setShowMicSettingsModal(true)}
          className="w-12 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all shadow-md"
          title="Microphone Settings & Hardware Test"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* End Call Button */}
        <button
          onClick={() => setShowEndModal(true)}
          className="w-12 h-12 rounded-2xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center text-lg shadow-lg shadow-red-600/30 transition-all hover:scale-105"
          title="End Interview"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </footer>

      {/* Skip Question Confirmation Modal (Requirement 3) */}
      {showSkipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl space-y-4 text-center">
            <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Skip Question #{currentQNum}?</h3>
            <p className="text-xs text-slate-400">
              Skipping will record 0 marks for this question and move to the next topic. Are you sure you want to proceed?
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSkipModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSkipConfirm}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/30"
              >
                Yes, Skip Question
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Call Confirmation Modal */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl space-y-4 text-center">
            <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
            <h3 className="text-base font-bold text-white">End Interview Session?</h3>
            <p className="text-xs text-slate-400">
              All questions answered so far have been saved and evaluated. You can view your performance report immediately.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEndModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Continue Interview
              </button>
              <button
                type="button"
                onClick={() => navigate(`/interview/report/${id}`)}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/30"
              >
                End & View Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-Call Microphone Settings Modal */}
      {showMicSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-cyan-400" /> Microphone Settings & Hardware Test
              </h3>
              <button
                type="button"
                onClick={() => setShowMicSettingsModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <MicrophoneTest
              onReady={(ready) => {
                if (ready) {
                  setMicPermissionGranted(true);
                  setMicPermissionError('');
                }
              }}
            />

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowMicSettingsModal(false);
                  initMicrophoneStream();
                }}
                className="px-5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-md"
              >
                Save & Return to Interview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fallback Text Input Modal */}
      {showTextInputModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Type Technical Answer</h3>
              <button
                type="button"
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
              value={manualTextAnswer}
              onChange={(e) => setManualTextAnswer(e.target.value)}
              placeholder="Type your explanation or code solution here..."
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-purple-500 resize-none"
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
                  if (manualTextAnswer.trim()) {
                    setTranscript(manualTextAnswer.trim());
                    setShowTextInputModal(false);
                    handleSubmitAnswer(manualTextAnswer.trim());
                    setManualTextAnswer('');
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
