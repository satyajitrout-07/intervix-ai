import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import MicrophoneTest from '../components/MicrophoneTest';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
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
  Clock,
  Settings,
  FastForward,
  Check,
  Send,
  Loader2,
  Camera,
  CameraOff,
  Sliders,
  HelpCircle,
  Layers,
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

  // ----------------------------------------------------
  // Microphone & Audio Hardware State
  // ----------------------------------------------------
  const [isMicOn, setIsMicOn] = useState(true);
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  const [micPermissionError, setMicPermissionError] = useState('');
  const [audioInputLevel, setAudioInputLevel] = useState(0);
  const [selectedMicDeviceId, setSelectedMicDeviceId] = useState(() => {
    return localStorage.getItem('intervix_mic_device_id') || '';
  });
  const [availableAudioDevices, setAvailableAudioDevices] = useState([]);

  // ----------------------------------------------------
  // Webcam & Video Hardware State
  // ----------------------------------------------------
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false);
  const [cameraPermissionError, setCameraPermissionError] = useState('');
  const [selectedCameraDeviceId, setSelectedCameraDeviceId] = useState(() => {
    return localStorage.getItem('intervix_camera_device_id') || '';
  });
  const [availableVideoDevices, setAvailableVideoDevices] = useState([]);
  const [sttLanguage, setSttLanguage] = useState('en-IN'); // High-accuracy Indian English & Hinglish support

  // ----------------------------------------------------
  // Captions, Timer & UI State
  // ----------------------------------------------------
  const [showCaptions, setShowCaptions] = useState(true);
  const [activeCaption, setActiveCaption] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(900);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsActiveTab, setSettingsActiveTab] = useState('camera'); // 'camera' | 'audio'

  // ----------------------------------------------------
  // AI Interviewer State: 'speaking' | 'listening' | 'evaluating' | 'idle'
  // ----------------------------------------------------
  const [aiState, setAiState] = useState('idle');
  const [mouthOpen, setMouthOpen] = useState(false);

  // ----------------------------------------------------
  // Candidate Speech & Transcription
  // ----------------------------------------------------
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribingBackend, setIsTranscribingBackend] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(true);
  const [sttStatus, setSttStatus] = useState('');
  const [showTextInputModal, setShowTextInputModal] = useState(false);
  const [manualTextAnswer, setManualTextAnswer] = useState('');

  // ----------------------------------------------------
  // Evaluation & Question Progress State
  // ----------------------------------------------------
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [spokenFeedback, setSpokenFeedback] = useState('');
  const [isQuestionAnswered, setIsQuestionAnswered] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [isAdvancingQuestion, setIsAdvancingQuestion] = useState(false);

  // ----------------------------------------------------
  // Media Refs (Audio & Video streams are independent)
  // ----------------------------------------------------
  const micStreamRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const candidateVideoRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const lipSyncIntervalRef = useRef(null);
  const hasSpokenWelcomeRef = useRef(false);

  // Live state refs to avoid stale closure bugs
  const isRecordingRef = useRef(false);
  const isMicOnRef = useRef(true);
  const aiStateRef = useRef('idle');

  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  useEffect(() => { isMicOnRef.current = isMicOn; }, [isMicOn]);
  useEffect(() => { aiStateRef.current = aiState; }, [aiState]);

  // ----------------------------------------------------
  // 1. COUNTDOWN TIMER WITH PERSISTED DEADLINE
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
  // 2. CAMERA / WEBCAM INITIALIZATION & CONTROLS
  // ----------------------------------------------------
  const startCamera = useCallback(async (deviceIdToUse = null) => {
    setCameraPermissionError('');
    setIsCameraStarting(true);

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setCameraPermissionError('Browsers require a secure origin (HTTPS or localhost) to open the camera.');
      setIsCameraStarting(false);
      return false;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraPermissionError('Your browser does not support camera access via MediaDevices.');
      setIsCameraStarting(false);
      return false;
    }

    // Stop existing camera tracks before re-opening
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      cameraStreamRef.current = null;
    }

    try {
      const camId = deviceIdToUse !== null ? deviceIdToUse : selectedCameraDeviceId;
      const videoConstraints = {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user',
      };

      // Use ideal instead of exact to prevent OverconstrainedError if device ID changed
      if (camId) {
        videoConstraints.deviceId = { ideal: camId };
      }

      // Audio is intentionally false here to keep mic and camera independent
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });

      cameraStreamRef.current = videoStream;
      setCameraPermissionGranted(true);
      setIsCameraOn(true);

      // Attach stream to video ref and start playing
      if (candidateVideoRef.current) {
        candidateVideoRef.current.srcObject = videoStream;
        candidateVideoRef.current.play().catch((playErr) => {
          console.warn('[Webcam Play Catch]:', playErr);
        });
      }

      // Enumerate available video input devices
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
        setAvailableVideoDevices(videoInputs);

        const activeTrack = videoStream.getVideoTracks()[0];
        if (activeTrack) {
          const settings = activeTrack.getSettings();
          const currentDevId = settings.deviceId || camId || (videoInputs[0] ? videoInputs[0].deviceId : '');
          setSelectedCameraDeviceId(currentDevId);
          if (currentDevId) {
            localStorage.setItem('intervix_camera_device_id', currentDevId);
          }
        }
      } catch (enumErr) {
        console.warn('[Camera Enumeration Note]:', enumErr);
      }

      return true;
    } catch (err) {
      console.error('[Camera Permission Error]:', err);
      setCameraPermissionGranted(false);
      setIsCameraOn(false);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraPermissionError('Camera permission denied. Please allow camera access in your browser settings (look for the lock/camera icon in the address bar).');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraPermissionError('No webcam or camera device detected on your system. Please connect a webcam.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraPermissionError('Camera is currently in use by another application (e.g. Zoom, Teams, or another browser tab).');
      } else if (err.name === 'OverconstrainedError') {
        setSelectedCameraDeviceId('');
        localStorage.removeItem('intervix_camera_device_id');
        return startCamera('');
      } else {
        setCameraPermissionError(err.message || 'Unable to open camera stream.');
      }
      return false;
    } finally {
      setIsCameraStarting(false);
    }
  }, [selectedCameraDeviceId]);

  const stopCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      cameraStreamRef.current = null;
    }
    if (candidateVideoRef.current) {
      candidateVideoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
  }, []);

  const toggleCamera = async () => {
    if (isCameraOn) {
      stopCamera();
    } else {
      await startCamera();
    }
  };

  // Re-attach camera stream to video element when isCameraOn toggles
  useEffect(() => {
    if (isCameraOn && candidateVideoRef.current && cameraStreamRef.current) {
      candidateVideoRef.current.srcObject = cameraStreamRef.current;
      candidateVideoRef.current.play().catch(() => {});
    }
  }, [isCameraOn]);

  // Listen for plug/unplug of audio and video devices
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.addEventListener) {
      const handleDeviceChange = async () => {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          setAvailableVideoDevices(devices.filter((d) => d.kind === 'videoinput'));
          setAvailableAudioDevices(devices.filter((d) => d.kind === 'audioinput'));
        } catch {}
      };
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
      return () => navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    }
  }, []);

  // ----------------------------------------------------
  // 3. HARDWARE MICROPHONE STREAM & AUDIO ANALYSER
  // ----------------------------------------------------
  const initMicrophoneStream = useCallback(async (deviceIdToUse = null) => {
    setMicPermissionError('');

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setMicPermissionError('Browsers require a secure origin (HTTPS or localhost) to capture audio.');
      return false;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicPermissionError('Your browser does not support audio capture via MediaDevices.');
      return false;
    }

    cleanupMicrophone();

    try {
      const devId = deviceIdToUse !== null ? deviceIdToUse : selectedMicDeviceId;
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
        video: false, // Video is handled separately
      });

      micStreamRef.current = stream;
      setMicPermissionGranted(true);

      // Enumerate available audio input devices
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const inputs = allDevices.filter((d) => d.kind === 'audioinput');
        setAvailableAudioDevices(inputs);

        const activeTrack = stream.getAudioTracks()[0];
        if (activeTrack) {
          const settings = activeTrack.getSettings();
          const currentDevId = settings.deviceId || devId || (inputs[0] ? inputs[0].deviceId : '');
          setSelectedMicDeviceId(currentDevId);
          if (currentDevId) {
            localStorage.setItem('intervix_mic_device_id', currentDevId);
          }
        }
      } catch (enumErr) {
        console.warn('[Mic Device Enumeration Note]:', enumErr);
      }

      setupAudioVisualizer(stream);
      return true;
    } catch (err) {
      console.error('[Microphone Permission Error]:', err);
      setMicPermissionGranted(false);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicPermissionError('Microphone permission denied. Please allow microphone access in browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setMicPermissionError('No microphone detected on your system. Please connect an audio input device.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setMicPermissionError('Microphone is in use by another application or blocked by your OS.');
      } else if (err.name === 'OverconstrainedError') {
        setSelectedMicDeviceId('');
        localStorage.removeItem('intervix_mic_device_id');
        return initMicrophoneStream('');
      } else {
        setMicPermissionError(err.message || 'Unable to open microphone stream.');
      }
      return false;
    }
  }, [selectedMicDeviceId]);

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
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    setAudioInputLevel(0);
  };

  // Toggle Mute / Unmute
  const toggleMute = () => {
    const nextState = !isMicOn;
    setIsMicOn(nextState);
    isMicOnRef.current = nextState;

    if (micStreamRef.current) {
      micStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = nextState;
      });
    }

    if (!nextState) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setSttStatus('Microphone muted.');
    } else {
      if (aiStateRef.current === 'listening') {
        startListeningSession();
      }
      setSttStatus('');
    }
  };

  // ----------------------------------------------------
  // 4. MEDIA RECORDER & AUDIO CHUNK CAPTURE
  // ----------------------------------------------------
  const startMediaRecording = () => {
    if (!micStreamRef.current || micStreamRef.current.getAudioTracks().length === 0) {
      console.warn('[MediaRecorder]: No audio stream available.');
      return;
    }

    micStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = true;
    });

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      return;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      try {
        mediaRecorderRef.current.resume();
        setIsRecording(true);
        isRecordingRef.current = true;
        return;
      } catch (err) {
        console.warn('[MediaRecorder Resume Warning]:', err);
      }
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
        ? new MediaRecorder(micStreamRef.current, { mimeType: selectedMime })
        : new MediaRecorder(micStreamRef.current);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      isRecordingRef.current = true;
    } catch (err) {
      console.error('[MediaRecorder Start Error]:', err);
      setSttStatus(`Recording error: ${err.message}. Please use the Type Answer button.`);
    }
  };

  const stopMediaRecording = () => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        setIsRecording(false);
        isRecordingRef.current = false;
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const chunks = [...audioChunksRef.current];
        const audioBlob = new Blob(chunks, { type: mimeType });
        setIsRecording(false);
        isRecordingRef.current = false;
        resolve(audioBlob.size > 100 ? audioBlob : null);
      };

      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('[MediaRecorder Stop Warning]:', err);
        setIsRecording(false);
        isRecordingRef.current = false;
        resolve(null);
      }
    });
  };

  // ----------------------------------------------------
  // 5. SPEECH-TO-TEXT (REAL-TIME WEBSPEECH ENGINE)
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
      recognition.lang = sttLanguage || 'en-IN';
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        if (aiStateRef.current === 'speaking') return;

        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript + ' ';
        }
        const cleaned = fullTranscript.trim();
        if (cleaned) {
          setTranscript(cleaned);
          if (showCaptions) {
            setActiveCaption(`You: "${cleaned.slice(0, 100)}${cleaned.length > 100 ? '...' : ''}"`);
          }
        }
      };

      recognition.onerror = (event) => {
        if (event.error === 'no-speech') return;
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setMicPermissionGranted(false);
          setMicPermissionError('Speech recognition access was denied by your browser.');
          setSttStatus('Browser speech recognition blocked. Please type your answer or check permissions.');
        } else if (event.error === 'network') {
          setSttStatus('Browser speech recognition requires internet. Backend transcription will be used.');
        } else if (event.error === 'aborted') {
          // Normal abort when AI speaks
        } else {
          console.warn('[SpeechRecognition Error]:', event.error);
        }
      };

      recognition.onend = () => {
        if (isRecordingRef.current && isMicOnRef.current && aiStateRef.current === 'listening') {
          setTimeout(() => {
            if (isRecordingRef.current && isMicOnRef.current && aiStateRef.current === 'listening') {
              try {
                recognition.start();
              } catch (restartErr) {
                console.warn('[SpeechRecognition Restart Note]:', restartErr.message);
              }
            }
          }, 120);
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
  }, [showCaptions, sttLanguage]);

  const startListeningSession = () => {
    if (!isMicOnRef.current) return;

    setAiState('listening');
    aiStateRef.current = 'listening';
    setActiveCaption('Listening to your answer... Speak clearly into your microphone.');
    setSttStatus('');

    startMediaRecording();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch {}
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
  // 6. TEXT-TO-SPEECH (AI INTERVIEWER SPEAKS)
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
    aiStateRef.current = 'speaking';
    setActiveCaption(`Elena: "${text.slice(0, 120)}${text.length > 120 ? '...' : ''}"`);
    startLipSync();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    utterance.volume = 1.0;

    const voices = synthRef.current.getVoices();
    const naturalVoice = voices.find(
      (v) =>
        v.name.includes('Google') ||
        v.name.includes('Natural') ||
        v.name.includes('Samantha') ||
        (v.lang === 'en-US' && v.name.toLowerCase().includes('female'))
    );
    if (naturalVoice) utterance.voice = naturalVoice;

    utterance.onend = () => {
      stopLipSync();
      if (onComplete) {
        onComplete();
      } else {
        setAiState('listening');
        aiStateRef.current = 'listening';
      }
    };

    utterance.onerror = (e) => {
      console.warn('[SpeechSynthesis Error]:', e.error);
      stopLipSync();
      if (onComplete) {
        onComplete();
      } else {
        setAiState('listening');
        aiStateRef.current = 'listening';
      }
    };

    synthRef.current.speak(utterance);
  };

  // ----------------------------------------------------
  // 7. INITIALIZE SESSION & HARDWARE ON MOUNT
  // ----------------------------------------------------
  useEffect(() => {
    async function loadInterviewSession() {
      try {
        setLoading(true);
        setErrorMsg('');

        // Step 1: Request microphone permission & start audio analyser
        await initMicrophoneStream();

        // Step 2: Request webcam video stream
        await startCamera();

        // Step 3: Fetch interview session details
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

        // If question already has an evaluation (restored on page refresh)
        if (q?.evaluation) {
          setEvaluationResult(q.evaluation);
          setTranscript(q.userAnswer || '');
          setIsQuestionAnswered(true);
          setAiState('idle');
          aiStateRef.current = 'idle';
          setActiveCaption('Session restored. Review your evaluation or click Next Question.');
          return;
        }

        // Greet and speak question
        if (!hasSpokenWelcomeRef.current) {
          hasSpokenWelcomeRef.current = true;
          const greeting =
            currentIdx === 0
              ? `Hello ${user?.name || 'Candidate'}! Welcome to your INTERVIX AI technical interview. I will be your interviewer today. Let's begin with Question 1: ${q.question}`
              : `Welcome back. Here is your current question: ${q.question}`;

          setTimeout(() => {
            speakAI(greeting, () => {
              startListeningSession();
            });
          }, 800);
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
      stopCamera();
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, [id]);

  // ----------------------------------------------------
  // 8. SUBMIT CANDIDATE ANSWER (DUAL-PATH TRANSCRIPTION)
  // ----------------------------------------------------
  const handleSubmitAnswer = async (manualAnswer = null) => {
    let finalAnswer = (manualAnswer !== null ? manualAnswer : transcript).trim();

    // Stop microphone recording and collect audio blob
    const recordedBlob = await stopListeningSession();

    // If live browser transcript is empty but audio was recorded → backend STT fallback
    if (!finalAnswer && recordedBlob && recordedBlob.size > 500) {
      setIsTranscribingBackend(true);
      setSttStatus('Transcribing your voice using backend speech engine...');
      setActiveCaption('Processing your voice recording...');

      try {
        const formData = new FormData();
        const mimeType = recordedBlob.type || 'audio/webm';
        const ext = mimeType.includes('ogg') ? 'ogg'
          : mimeType.includes('mp4') ? 'mp4'
          : mimeType.includes('wav') ? 'wav'
          : 'webm';

        formData.append('audioFile', recordedBlob, `candidate_answer.${ext}`);

        const transRes = await authFetch(`/api/interviews/${id}/transcribe`, {
          method: 'POST',
          body: formData,
        });

        const transData = await transRes.json();
        if (transRes.ok && transData.data?.transcript && transData.data.transcript.trim()) {
          finalAnswer = transData.data.transcript.trim();
          setTranscript(finalAnswer);
          setSttStatus(`Backend transcription successful (${transData.data.provider}).`);
        } else if (!transRes.ok) {
          setSttStatus(`Backend transcription failed: ${transData.message || 'Unknown error'}.`);
        } else {
          setSttStatus(
            transData.data?.message ||
            'No speech-to-text API key configured on the server. Please type your answer or add GEMINI_API_KEY to server/.env'
          );
        }
      } catch (transErr) {
        setSttStatus(`Transcription network error: ${transErr.message}`);
      } finally {
        setIsTranscribingBackend(false);
      }
    }

    if (!finalAnswer || finalAnswer.length < 3) {
      const noAnswerMsg =
        "I didn't capture your answer through the microphone. Please speak clearly, or use the Type Answer button to type your response.";
      speakAI(noAnswerMsg, () => {
        startListeningSession();
      });
      setSttStatus('No answer captured. Try again or use Type Answer.');
      return;
    }

    setIsEvaluating(true);
    setAiState('evaluating');
    aiStateRef.current = 'evaluating';
    setActiveCaption('Elena is analyzing your technical answer against the evaluation rubric...');
    setSttStatus('');

    try {
      const res = await authFetch(`/api/interviews/${id}/evaluate-answer`, {
        method: 'POST',
        body: JSON.stringify({
          questionId: currentQuestion.questionId,
          candidateAnswer: finalAnswer,
          userAnswer: finalAnswer,
          question: currentQuestion.question,
          expectedAnswer: currentQuestion.expectedAnswer,
          topic: currentQuestion.category || interview?.category,
          difficulty: currentQuestion.difficulty || interview?.difficulty,
        }),
      });

      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(responseData.message || 'Failed to evaluate answer.');
      }

      const turn = responseData.data || responseData;
      const evaluation = turn.evaluation || responseData.evaluation;
      const script = turn.spokenScript || responseData.spokenScript || evaluation?.spokenResponse || '';

      setEvaluationResult(evaluation);
      setSpokenFeedback(script);
      setIsQuestionAnswered(true);

      speakAI(script, () => {
        setAiState('idle');
        aiStateRef.current = 'idle';
        setActiveCaption('Evaluation complete. Review your score and click Next Question to continue.');
      });
    } catch (err) {
      console.error('[Submit Answer Error]:', err);
      setErrorMsg(err.message || 'Error evaluating answer.');
      setAiState('listening');
      aiStateRef.current = 'listening';
    } finally {
      setIsEvaluating(false);
    }
  };

  // ----------------------------------------------------
  // 9. NEXT QUESTION & SKIP HANDLERS
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
      setSttStatus('');
      audioChunksRef.current = [];

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
      setSttStatus('');
      audioChunksRef.current = [];

      speakAI(`Skipping to Question ${nextQ.questionId}: ${nextQ.question}`, () => {
        startListeningSession();
      });
    } catch (err) {
      setErrorMsg(err.message || 'Error skipping question.');
    } finally {
      setIsAdvancingQuestion(false);
    }
  };

  const handleRepeatQuestion = () => {
    if (currentQuestion) {
      speakAI(`Here is the question again: ${currentQuestion.question}`, () => {
        if (!isQuestionAnswered) {
          startListeningSession();
        }
      });
    }
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-400 p-[2px] animate-pulse mb-6">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
            <Radio className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Connecting to AI Interview Room...</h2>
        <p className="text-xs text-slate-400">Initializing webcam preview, microphone input & AI interviewer.</p>
      </div>
    );
  }

  // Error Screen
  if (errorMsg && !interview) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
        <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900 border border-red-500/30 text-center space-y-4 shadow-2xl">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">Session Connection Error</h3>
          <p className="text-sm text-red-300">{errorMsg}</p>
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

  const currentQNum = currentQuestion ? currentQuestion.questionId : currentQuestionIndex + 1;
  const totalQCount = interview?.totalQuestions || 5;
  const isFinalQuestion = currentQNum >= totalQCount;
  const progressPercent = Math.min(100, Math.round(((currentQNum - 1) / totalQCount) * 100));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-purple-600 selection:text-white pb-24">
      {/* ---------------------------------------------------- */}
      {/* 1. TOP SESSION HEADER */}
      {/* ---------------------------------------------------- */}
      <header className="h-16 bg-slate-950/90 border-b border-slate-800/80 px-4 sm:px-8 flex items-center justify-between z-30 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-4">
          <Logo to="/dashboard" />
          <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-slate-800 text-xs text-slate-300">
            <span className="font-semibold text-white">{interview?.category || 'AI Technical Interview'}</span>
            <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30 text-[10px] font-mono">
              {interview?.difficulty || 'Intermediate'}
            </span>
          </div>
        </div>

        {/* Live Status Indicators & Countdown Timer */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-mono text-[11px] hidden sm:inline">Elena AI Live</span>
          </div>

          <div
            className={`px-3 py-1 rounded-full border text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              remainingSeconds <= 60
                ? 'bg-red-950/80 border-red-500/60 text-red-400 animate-pulse'
                : remainingSeconds <= 300
                ? 'bg-amber-950/80 border-amber-500/50 text-amber-400'
                : 'bg-slate-900 border-slate-800 text-cyan-400'
            }`}
            title="Interview Session Countdown Timer"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>⏱ {formatCountdown(remainingSeconds)}</span>
          </div>
        </div>
      </header>

      {/* Permission Warning Banners */}
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

      {cameraPermissionError && (
        <div className="bg-amber-950/90 border-b border-amber-500/40 px-6 py-2.5 text-xs text-amber-200 flex items-center justify-between z-30">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{cameraPermissionError}</span>
          </div>
          <button
            onClick={() => startCamera()}
            className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] transition"
          >
            Enable Camera
          </button>
        </div>
      )}

      {sttStatus && !micPermissionError && (
        <div className="bg-cyan-950/70 border-b border-cyan-500/30 px-6 py-2 text-xs text-cyan-200 flex items-center gap-2 z-30">
          <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{sttStatus}</span>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. MAIN TWO-COLUMN VIDEO INTERVIEW WORKSPACE */}
      {/* ---------------------------------------------------- */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-6 relative">
        {/* =================================================== */}
        {/* LEFT SECTION (APPROX 60%): QUESTION & CANDIDATE ANSWER */}
        {/* =================================================== */}
        <div className="w-full lg:w-[58%] xl:w-[60%] flex flex-col gap-5 min-w-0">
          {/* A. DEDICATED QUESTION CARD (TOP-LEFT) */}
          <div className="rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800 p-5 sm:p-6 shadow-xl backdrop-blur-xl relative overflow-hidden space-y-4">
            <div className="absolute top-0 right-0 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* Question Progress & Metadata Header */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold tracking-wide shadow-md shadow-purple-600/20">
                  Question {currentQNum} of {totalQCount}
                </span>

                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-cyan-300 text-xs font-medium flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{currentQuestion?.category || interview?.category || 'Technical Assessment'}</span>
                </span>

                <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300 text-xs font-mono">
                  {currentQuestion?.difficulty || interview?.difficulty || 'Intermediate'}
                </span>
              </div>

              {/* Step indicator */}
              <span className="text-xs font-mono text-purple-400 font-bold shrink-0">
                {Math.round(progressPercent)}% Done
              </span>
            </div>

            {/* Question Progress Bar */}
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400 transition-all duration-500"
                style={{ width: `${Math.max(5, (currentQNum / totalQCount) * 100)}%` }}
              />
            </div>

            {/* Full AI-Generated Question Text (Never clipped) */}
            <div className="pt-1">
              <h2
                className="text-base sm:text-xl font-bold text-white leading-relaxed tracking-normal"
                style={{
                  overflowWrap: 'break-word',
                  wordBreak: 'normal',
                  minWidth: 0,
                }}
              >
                {currentQuestion?.question || 'Generating your interview question...'}
              </h2>
            </div>

            {/* Essential Concepts Badges */}
            {currentQuestion?.essentialConcepts && currentQuestion.essentialConcepts.length > 0 && (
              <div className="pt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
                  Key Topics:
                </span>
                {currentQuestion.essentialConcepts.map((concept, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-purple-950/40 border border-purple-500/20 text-purple-300 text-[11px]"
                  >
                    {concept}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* B. YOUR ANSWER & TRANSCRIPTION PANEL */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 shadow-xl backdrop-blur-xl flex flex-col justify-between space-y-4 flex-1 min-h-[320px]">
            <div className="space-y-3">
              {/* Answer Header & Live Audio Level Meter */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isRecording && isMicOn ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                    }`}
                  />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Your Technical Answer</span>
                </div>

                {/* Microphone Activity Pill */}
                <div className="flex items-center gap-2 text-xs">
                  {isMicOn && micPermissionGranted ? (
                    <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                      <Mic className="w-3.5 h-3.5" />
                      <span>{isRecording ? `Listening (${audioInputLevel}%)` : 'Ready'}</span>
                    </span>
                  ) : !micPermissionGranted ? (
                    <span className="text-amber-400 font-mono text-[11px]">Mic Blocked</span>
                  ) : (
                    <span className="text-red-400 font-mono text-[11px]">Muted</span>
                  )}
                </div>
              </div>

              {/* Editable Answer Textarea */}
              <div className="relative">
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  disabled={isEvaluating || isQuestionAnswered}
                  rows={5}
                  placeholder={
                    isRecording && isMicOn
                      ? 'Listening to your microphone... Speak clearly. Your words will appear here in real time. You can edit this text at any time before submitting.'
                      : !micPermissionGranted
                      ? 'Microphone permission not granted. Please use the Type button below to enter your answer.'
                      : 'Microphone is ready. Speak your answer, or type directly in this box to formulate your technical response.'
                  }
                  className="w-full p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 text-slate-100 text-xs sm:text-sm font-mono focus:outline-none focus:border-purple-500 transition resize-none leading-relaxed shadow-inner"
                />

                <div className="absolute right-3 bottom-3 text-[10px] text-slate-500 font-mono">
                  {transcript.split(/\s+/).filter(Boolean).length} words • {transcript.length} chars
                </div>
              </div>

              {/* Comprehensive AI Evaluation Rubric Breakdown (When Answered) */}
              {evaluationResult && (
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-purple-500/30 text-xs space-y-4 animate-fadeIn shadow-2xl">
                  {/* Top Header: Score Gauge & Result Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center font-extrabold text-white text-sm">
                        {evaluationResult.score ?? 0}
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">Evaluation Score</span>
                        <span className="text-sm font-bold text-white">{evaluationResult.score ?? 0} / 100</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Result Badge */}
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                          (evaluationResult.result === 'correct' || evaluationResult.status === 'correct' || evaluationResult.score >= 75)
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                            : (evaluationResult.result === 'partially_correct' || evaluationResult.status === 'partially_correct' || evaluationResult.score >= 40)
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                            : (evaluationResult.result === 'needs_clarification' || evaluationResult.status === 'needs_clarification')
                            ? 'bg-purple-950/80 text-purple-300 border border-purple-500/40'
                            : 'bg-red-950/80 text-red-300 border border-red-500/40'
                        }`}
                      >
                        {(evaluationResult.result === 'correct' || evaluationResult.status === 'correct' || evaluationResult.score >= 75) ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (evaluationResult.result === 'partially_correct' || evaluationResult.status === 'partially_correct' || evaluationResult.score >= 40) ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                        )}
                        <span>
                          {evaluationResult.result
                            ? evaluationResult.result.replace('_', ' ')
                            : evaluationResult.status
                            ? evaluationResult.status.replace('_', ' ')
                            : 'Evaluated'}
                        </span>
                      </span>

                      {/* Knowledge Tag */}
                      {evaluationResult.technicalKnowledge && (
                        <span className="hidden sm:inline-block px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-medium border border-slate-700">
                          {evaluationResult.technicalKnowledge}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Elena Spoken Response with Audio Replay */}
                  {(spokenFeedback || evaluationResult.spokenResponse) && (
                    <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-cyan-400" />
                          <span>Elena's Voice Feedback</span>
                        </span>
                        <p className="text-slate-200 text-xs italic leading-relaxed">
                          "{spokenFeedback || evaluationResult.spokenResponse}"
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => speakAI(spokenFeedback || evaluationResult.spokenResponse)}
                        className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/30 text-[11px] font-semibold flex items-center gap-1 shrink-0 transition"
                        title="Replay Elena's voice feedback"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-cyan-300" />
                        <span>Replay</span>
                      </button>
                    </div>
                  )}

                  {/* Feedback Summary */}
                  {evaluationResult.feedback && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-300">Technical Assessment:</span>
                      <p className="text-slate-300 text-xs leading-relaxed">
                        {evaluationResult.feedback}
                      </p>
                    </div>
                  )}

                  {/* Strengths & Mistakes Side-by-Side */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Strengths */}
                    {Array.isArray(evaluationResult.strengths) && evaluationResult.strengths.length > 0 && (
                      <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-1.5">
                        <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Strengths
                        </span>
                        <ul className="space-y-1 text-slate-300 text-[11px]">
                          {evaluationResult.strengths.map((str, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-emerald-400 mt-0.5">•</span>
                              <span>{str}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Mistakes / Missing Nuances */}
                    {((Array.isArray(evaluationResult.mistakes) && evaluationResult.mistakes.length > 0) ||
                      (Array.isArray(evaluationResult.missingConcepts) && evaluationResult.missingConcepts.length > 0)) && (
                      <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 space-y-1.5">
                        <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Nuances & Missing Points
                        </span>
                        <ul className="space-y-1 text-slate-300 text-[11px]">
                          {(evaluationResult.mistakes || evaluationResult.missingConcepts || []).slice(0, 3).map((mis, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-amber-400 mt-0.5">•</span>
                              <span>{mis}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Improvement Tips */}
                  {Array.isArray(evaluationResult.improvementTips) && evaluationResult.improvementTips.length > 0 && (
                    <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/20 space-y-1.5">
                      <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Actionable Tips for Next Time
                      </span>
                      <ul className="space-y-1 text-slate-300 text-[11px]">
                        {evaluationResult.improvementTips.map((tip, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-indigo-400 mt-0.5">→</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Reference Solution / Explanation */}
                  {(evaluationResult.correctExplanation || evaluationResult.explanation || evaluationResult.suggestedAnswer) && (
                    <details className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 text-xs text-slate-300 cursor-pointer">
                      <summary className="font-semibold text-purple-300 hover:text-purple-200 select-none">
                        View Model Reference Explanation & Architecture
                      </summary>
                      <div className="mt-2.5 pt-2.5 border-t border-slate-800 text-[11px] text-slate-300 leading-relaxed space-y-2 font-mono whitespace-pre-wrap">
                        {evaluationResult.correctExplanation || evaluationResult.explanation || evaluationResult.suggestedAnswer}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>

            {/* Answer Control Buttons */}
            <div className="pt-3 border-t border-slate-800/80 space-y-3">
              {!isQuestionAnswered ? (
                <button
                  type="button"
                  onClick={() => handleSubmitAnswer()}
                  disabled={isEvaluating || isTranscribingBackend}
                  className="w-full py-3 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 transition-all hover:scale-[1.01] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {isEvaluating || isTranscribingBackend ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isTranscribingBackend ? 'Transcribing Audio...' : 'Evaluating Technical Answer...'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Answer</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  disabled={isAdvancingQuestion || isEvaluating}
                  className="w-full py-3.5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
                >
                  {isAdvancingQuestion ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Advancing to Next Question...</span>
                    </>
                  ) : isFinalQuestion ? (
                    <>
                      <span>Finish Interview & View Comprehensive Report</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Next Question →</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}

              {/* Secondary Utility Controls */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handleRepeatQuestion}
                  disabled={aiState === 'speaking'}
                  className="py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  title="Elena repeats the current question"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Replay</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowTextInputModal(true)}
                  disabled={isQuestionAnswered}
                  className="py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  title="Open full writing modal"
                >
                  <Keyboard className="w-3.5 h-3.5 text-purple-400" />
                  <span>Type</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSkipModal(true)}
                  disabled={isQuestionAnswered || isAdvancingQuestion}
                  className="py-2 text-xs font-semibold bg-slate-800 hover:bg-red-950/60 hover:text-red-300 text-slate-400 rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  title="Skip this question"
                >
                  <FastForward className="w-3.5 h-3.5 text-amber-400" />
                  <span>Skip</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* =================================================== */}
        {/* RIGHT SECTION (APPROX 40%): ELENA AI & WEBCAM PREVIEW */}
        {/* =================================================== */}
        <div className="w-full lg:w-[42%] xl:w-[40%] flex flex-col gap-5 min-w-0">
          {/* A. LARGE ELENA AI INTERVIEWER VIDEO AREA */}
          <div className="rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border border-purple-500/25 p-5 shadow-2xl relative flex flex-col justify-between overflow-hidden min-h-[340px] sm:min-h-[380px]">
            {/* Elena Header Badge */}
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/80 border border-slate-800 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping" />
                <span className="font-bold text-white">Elena Vance</span>
                <span className="text-purple-300 text-[11px] hidden sm:inline">AI Recruiter</span>
              </div>

              {/* Status Indicator */}
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

            {/* Virtual Interviewer Avatar Centerpiece */}
            <div className="my-auto flex flex-col items-center justify-center relative z-10 py-2">
              <div
                className={`absolute w-56 h-56 rounded-full blur-[80px] transition-all duration-700 pointer-events-none ${
                  aiState === 'speaking'
                    ? 'bg-purple-600/35 scale-125'
                    : aiState === 'evaluating'
                    ? 'bg-cyan-500/30 scale-110'
                    : 'bg-indigo-600/15 scale-100'
                }`}
              />

              <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-full p-[3px] bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-400 shadow-2xl flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-slate-950 flex flex-col items-center justify-center overflow-hidden relative">
                  <svg viewBox="0 0 160 160" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="160" height="160" fill="#0B1120" />
                    <circle cx="80" cy="80" r="70" fill="url(#bgElenaGrad)" opacity="0.4" />
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
                      <radialGradient id="bgElenaGrad" cx="0.5" cy="0.5" r="0.5">
                        <stop offset="0%" stopColor="#7C3AED" />
                        <stop offset="100%" stopColor="#0B1120" />
                      </radialGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>

            {/* Subtitles / Captions Overlay */}
            {showCaptions && activeCaption && (
              <div className="z-10 p-2.5 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-800 text-xs text-slate-200 text-center font-medium shadow-md">
                {activeCaption}
              </div>
            )}
          </div>

          {/* B. CANDIDATE WEBCAM VIDEO PREVIEW (REAL FEED) */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden relative flex flex-col min-h-[220px]">
            {/* Real Video Element */}
            <div className="relative w-full aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
              <video
                ref={candidateVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transition-all ${
                  isCameraOn && cameraPermissionGranted ? 'block' : 'hidden'
                }`}
              />

              {/* Camera OFF or Blocked Placeholder */}
              {(!isCameraOn || !cameraPermissionGranted) && (
                <div className="flex flex-col items-center justify-center p-6 text-center space-y-2">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-cyan-400 p-[2px] shadow-lg shadow-purple-600/20">
                    <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-sm font-bold text-white tracking-wider">
                      {user?.name
                        ? user.name
                            .split(' ')
                            .map((p) => p[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)
                        : 'ME'}
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-slate-300">
                    {user?.name || 'Candidate'} (You)
                  </span>

                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <VideoOff className="w-3.5 h-3.5 text-red-400" />
                    <span>{!cameraPermissionGranted ? 'Camera Unavailable' : 'Camera is Turned Off'}</span>
                  </span>

                  {cameraPermissionError && (
                    <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-500/30 text-amber-200 text-[10px] leading-relaxed max-w-[260px] text-center">
                      {cameraPermissionError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={toggleCamera}
                    disabled={isCameraStarting}
                    className="mt-1 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-[11px] font-semibold transition flex items-center gap-1.5 shadow-md shadow-purple-600/30"
                  >
                    {isCameraStarting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Starting Webcam...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-3.5 h-3.5" />
                        <span>{!cameraPermissionGranted ? 'Allow & Start Camera' : 'Turn On Camera'}</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Top-Right Overlaid Control Badges on Video */}
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
                <button
                  type="button"
                  onClick={toggleCamera}
                  className={`p-1.5 rounded-lg text-xs backdrop-blur-md transition ${
                    isCameraOn
                      ? 'bg-slate-900/80 text-emerald-400 border border-slate-700/80 hover:bg-slate-800'
                      : 'bg-red-950/80 text-red-300 border border-red-500/40 hover:bg-red-900'
                  }`}
                  title={isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
                >
                  {isCameraOn ? <Camera className="w-3.5 h-3.5" /> : <CameraOff className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={toggleMute}
                  className={`p-1.5 rounded-lg text-xs backdrop-blur-md transition ${
                    isMicOn
                      ? 'bg-slate-900/80 text-emerald-400 border border-slate-700/80 hover:bg-slate-800'
                      : 'bg-red-950/80 text-red-300 border border-red-500/40 hover:bg-red-900'
                  }`}
                  title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
                >
                  {isMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Bottom-Left Overlaid Name Banner */}
              <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[11px] text-white flex items-center gap-1.5 z-10">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold truncate max-w-[140px]">{user?.name || 'Candidate'}</span>
              </div>
            </div>

            {/* Bottom Info Bar */}
            <div className="p-3 bg-slate-950 border-t border-slate-850 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5 truncate">
                <Video className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate max-w-[160px]">
                  {isCameraOn && cameraPermissionGranted
                    ? availableVideoDevices.find((d) => d.deviceId === selectedCameraDeviceId)?.label || 'Live Webcam Feed'
                    : 'Camera Disabled'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSettingsActiveTab('camera');
                  setShowSettingsModal(true);
                }}
                className="text-cyan-400 hover:underline shrink-0"
              >
                Device Settings
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ---------------------------------------------------- */}
      {/* 3. FIXED RESPONSIVE BOTTOM TOOLBAR */}
      {/* ---------------------------------------------------- */}
      <footer className="fixed bottom-0 left-0 right-0 h-20 bg-slate-950/95 border-t border-slate-800/90 px-4 sm:px-6 flex items-center justify-center gap-3 sm:gap-4 z-40 backdrop-blur-md shadow-2xl">
        {/* Microphone Toggle */}
        <button
          onClick={toggleMute}
          className={`px-4 sm:px-5 h-12 rounded-2xl flex items-center gap-2 text-xs font-semibold transition-all shadow-md ${
            isMicOn
              ? 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700'
              : 'bg-red-600 text-white hover:bg-red-500 shadow-red-600/30'
          }`}
          title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
        >
          {isMicOn ? (
            <>
              <Mic className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Mic On</span>
            </>
          ) : (
            <>
              <MicOff className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">Mic Off</span>
            </>
          )}
        </button>

        {/* Camera Toggle */}
        <button
          onClick={toggleCamera}
          disabled={isCameraStarting}
          className={`px-4 sm:px-5 h-12 rounded-2xl flex items-center gap-2 text-xs font-semibold transition-all shadow-md ${
            isCameraOn
              ? 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700'
              : 'bg-red-600 text-white hover:bg-red-500 shadow-red-600/30'
          }`}
          title={isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
        >
          {isCameraStarting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span className="hidden sm:inline">Starting...</span>
            </>
          ) : isCameraOn ? (
            <>
              <Video className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Camera On</span>
            </>
          ) : (
            <>
              <VideoOff className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">Camera Off</span>
            </>
          )}
        </button>

        {/* Closed Captions Toggle */}
        <button
          onClick={() => setShowCaptions(!showCaptions)}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xs transition-all shadow-md ${
            showCaptions
              ? 'bg-purple-600 text-white shadow-purple-600/30'
              : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
          }`}
          title="Toggle Subtitles / Captions (CC)"
        >
          CC
        </button>

        {/* Device Settings Modal */}
        <button
          onClick={() => setShowSettingsModal(true)}
          className="w-12 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all shadow-md border border-slate-700"
          title="Audio & Video Device Settings"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* End Interview Call */}
        <button
          onClick={() => setShowEndModal(true)}
          className="px-4 sm:px-5 h-12 rounded-2xl bg-red-600 hover:bg-red-500 text-white flex items-center gap-2 text-xs font-bold shadow-lg shadow-red-600/30 transition-all hover:scale-105"
          title="End Interview Session"
        >
          <PhoneOff className="w-4 h-4" />
          <span className="hidden sm:inline">End Call</span>
        </button>
      </footer>

      {/* ---------------------------------------------------- */}
      {/* 4. MODALS (SETTINGS, SKIP, END, TEXT-INPUT) */}
      {/* ---------------------------------------------------- */}

      {/* Hardware Settings Modal (Camera & Microphone Tabs) */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" /> Device & Hardware Settings
              </h3>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSettingsActiveTab('camera')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition ${
                  settingsActiveTab === 'camera'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Camera Settings</span>
              </button>

              <button
                type="button"
                onClick={() => setSettingsActiveTab('audio')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition ${
                  settingsActiveTab === 'audio'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Microphone Settings</span>
              </button>
            </div>

            {/* Tab 1: Camera Device Selector */}
            {settingsActiveTab === 'camera' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Select Camera Device
                  </label>
                  <select
                    value={selectedCameraDeviceId}
                    onChange={(e) => {
                      setSelectedCameraDeviceId(e.target.value);
                      startCamera(e.target.value);
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
                  >
                    {availableVideoDevices.length > 0 ? (
                      availableVideoDevices.map((dev, idx) => (
                        <option key={dev.deviceId || idx} value={dev.deviceId}>
                          {dev.label || `Camera ${idx + 1}`}
                        </option>
                      ))
                    ) : (
                      <option value="">Default Web Camera</option>
                    )}
                  </select>
                </div>

                {/* Camera Status Card */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-white block">Camera Status</span>
                    <span className="text-slate-400 text-[11px]">
                      {isCameraOn ? 'Webcam active & streaming' : 'Webcam stopped'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={toggleCamera}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      isCameraOn
                        ? 'bg-red-950 text-red-300 border border-red-500/40'
                        : 'bg-emerald-600 text-white hover:bg-emerald-500'
                    }`}
                  >
                    {isCameraOn ? 'Stop Camera' : 'Start Camera'}
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Microphone Device Selector & Hardware Test */}
            {settingsActiveTab === 'audio' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Select Microphone Input Device
                  </label>
                  <select
                    value={selectedMicDeviceId}
                    onChange={(e) => {
                      setSelectedMicDeviceId(e.target.value);
                      initMicrophoneStream(e.target.value);
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
                  >
                    {availableAudioDevices.length > 0 ? (
                      availableAudioDevices.map((dev, idx) => (
                        <option key={dev.deviceId || idx} value={dev.deviceId}>
                          {dev.label || `Microphone ${idx + 1}`}
                        </option>
                      ))
                    ) : (
                      <option value="">Default Microphone</option>
                    )}
                  </select>
                </div>

                {/* Voice Recognition Language Selector */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Voice Recognition Language
                  </label>
                  <select
                    value={sttLanguage}
                    onChange={(e) => setSttLanguage(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
                  >
                    <option value="en-IN">English (India & Hinglish) - Recommended</option>
                    <option value="en-US">English (United States)</option>
                    <option value="hi-IN">Hindi (India)</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Choose 'English (India & Hinglish)' for optimal speech-to-text accuracy with Indian accents and technical terms mixed with Hindi.
                  </span>
                </div>

                {/* Built-in Hardware Audio Test Component */}
                <MicrophoneTest
                  onReady={(ready) => {
                    if (ready) {
                      setMicPermissionGranted(true);
                      setMicPermissionError('');
                    }
                  }}
                />
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-5 py-2.5 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-md transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skip Question Confirmation Modal */}
      {showSkipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl space-y-4 text-center">
            <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Skip Question #{currentQNum}?</h3>
            <p className="text-xs text-slate-400">
              Skipping will record 0 marks for this question and advance Elena to the next topic.
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
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

      {/* Fallback Text Input Modal */}
      {showTextInputModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-purple-400" /> Type Technical Answer
              </h3>
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
              placeholder="Type your explanation or technical solution here..."
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-purple-500 resize-none"
              autoFocus
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
                  const trimmed = manualTextAnswer.trim();
                  if (trimmed) {
                    setTranscript(trimmed);
                    setShowTextInputModal(false);
                    handleSubmitAnswer(trimmed);
                    setManualTextAnswer('');
                  }
                }}
                disabled={!manualTextAnswer.trim()}
                className="px-5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-lg shadow-md disabled:opacity-40"
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
