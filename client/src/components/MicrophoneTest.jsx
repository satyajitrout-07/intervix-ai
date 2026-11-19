import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  Play,
  Square,
  RefreshCw,
  Settings,
} from 'lucide-react';

export default function MicrophoneTest({ onReady, className = '' }) {
  const [permissionStatus, setPermissionStatus] = useState('prompt'); // 'prompt' | 'granted' | 'denied' | 'not_found' | 'insecure'
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(() => {
    return localStorage.getItem('intervix_mic_device_id') || '';
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 100
  const [isTesting, setIsTesting] = useState(false);
  const [isRecordingTest, setIsRecordingTest] = useState(false);
  const [testCountdown, setTestCountdown] = useState(0);
  const [testAudioUrl, setTestAudioUrl] = useState(null);
  const [testAudioSize, setTestAudioSize] = useState(0);

  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const testChunksRef = useRef([]);
  const countdownTimerRef = useRef(null);

  // Check secure context on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setPermissionStatus('insecure');
      setErrorMessage(
        'Browsers require a secure context (HTTPS or localhost) to access your microphone.'
      );
    }
  }, []);

  // Request & Initialize Microphone
  const requestMicrophoneAccess = async (deviceIdToUse = null) => {
    stopAllAudio();
    setErrorMessage('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionStatus('denied');
      setErrorMessage('Your browser does not support audio capture via MediaDevices.');
      return;
    }

    try {
      const audioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };

      const devId = deviceIdToUse || selectedDeviceId;
      if (devId) {
        audioConstraints.deviceId = { exact: devId };
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false,
      });

      streamRef.current = stream;
      setPermissionStatus('granted');
      setIsTesting(true);

      // Enumerate available audio input devices
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = allDevices.filter((d) => d.kind === 'audioinput');
        setDevices(audioInputs);

        const activeTrack = stream.getAudioTracks()[0];
        if (activeTrack) {
          const settings = activeTrack.getSettings();
          const currentDevId = settings.deviceId || devId || (audioInputs[0] ? audioInputs[0].deviceId : '');
          setSelectedDeviceId(currentDevId);
          if (currentDevId) {
            localStorage.setItem('intervix_mic_device_id', currentDevId);
          }
        }
      } catch (enumErr) {
        console.warn('[Device Enumeration Notice]:', enumErr);
      }

      // Initialize Web Audio API Analyser for Live Level Meter
      initAudioMeter(stream);

      if (onReady) {
        onReady(true);
      }
    } catch (err) {
      console.error('[Microphone Access Error]:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionStatus('denied');
        setErrorMessage(
          'Microphone permission was denied. Please allow microphone access in your browser settings (click the lock or camera icon in the URL bar).'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionStatus('not_found');
        setErrorMessage('No microphone device was detected on your computer.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setPermissionStatus('denied');
        setErrorMessage('The microphone is currently in use by another application or blocked by your OS.');
      } else if (err.name === 'OverconstrainedError') {
        // Fallback to default device
        setSelectedDeviceId('');
        localStorage.removeItem('intervix_mic_device_id');
        requestMicrophoneAccess('');
      } else {
        setPermissionStatus('denied');
        setErrorMessage(err.message || 'Unable to access microphone.');
      }

      if (onReady) {
        onReady(false);
      }
    }
  };

  // Web Audio API Level Meter
  const initAudioMeter = (stream) => {
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
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateMeter = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setAudioLevel(normalized);

        animFrameRef.current = requestAnimationFrame(updateMeter);
      };

      animFrameRef.current = requestAnimationFrame(updateMeter);
    } catch (e) {
      console.warn('[AudioContext Meter Error]:', e);
    }
  };

  // Start a short 4-second audio recording test
  const startRecordingTest = () => {
    if (!streamRef.current || streamRef.current.getAudioTracks().length === 0) {
      requestMicrophoneAccess();
      return;
    }

    setTestAudioUrl(null);
    setTestAudioSize(0);
    testChunksRef.current = [];

    // Check supported MIME type
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

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          testChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(testChunksRef.current, {
          type: selectedMime || 'audio/webm',
        });
        setTestAudioSize(audioBlob.size);
        if (audioBlob.size > 0) {
          const url = URL.createObjectURL(audioBlob);
          setTestAudioUrl(url);
        }
        setIsRecordingTest(false);
      };

      recorder.start(200);
      mediaRecorderRef.current = recorder;
      setIsRecordingTest(true);
      setTestCountdown(4);

      countdownTimerRef.current = setInterval(() => {
        setTestCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current);
            stopRecordingTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (recErr) {
      console.error('[Test Recorder Error]:', recErr);
      setErrorMessage('Failed to start test recording: ' + recErr.message);
      setIsRecordingTest(false);
    }
  };

  const stopRecordingTest = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    setIsRecordingTest(false);
  };

  const stopAllAudio = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
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
    setAudioLevel(0);
  };

  // Device selection change
  const handleDeviceChange = (e) => {
    const newId = e.target.value;
    setSelectedDeviceId(newId);
    localStorage.setItem('intervix_mic_device_id', newId);
    requestMicrophoneAccess(newId);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllAudio();
      if (testAudioUrl) {
        URL.revokeObjectURL(testAudioUrl);
      }
    };
  }, []);

  return (
    <div className={`p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-950 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Candidate Microphone Check</h4>
            <p className="text-[11px] text-slate-400">Test voice capture & audio level before interview</p>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {permissionStatus === 'granted' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Mic Ready
            </span>
          ) : permissionStatus === 'denied' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-950/80 border border-red-500/30 text-red-300 text-xs font-semibold">
              <MicOff className="w-3.5 h-3.5" /> Blocked
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" /> Unchecked
            </span>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/30 text-red-300 text-xs leading-relaxed flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Device Selection & Trigger */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Device Select */}
        <div className="sm:col-span-2 space-y-1">
          <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
            <Settings className="w-3 h-3 text-cyan-400" /> Input Microphone Device:
          </label>
          <select
            value={selectedDeviceId}
            onChange={handleDeviceChange}
            disabled={devices.length === 0}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500 transition disabled:opacity-50"
          >
            {devices.length > 0 ? (
              devices.map((d, idx) => (
                <option key={d.deviceId || idx} value={d.deviceId}>
                  {d.label || `Microphone ${idx + 1}`}
                </option>
              ))
            ) : (
              <option value="">Default System Microphone</option>
            )}
          </select>
        </div>

        {/* Test Access Button */}
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => requestMicrophoneAccess()}
            className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>{permissionStatus === 'granted' ? 'Re-test Mic' : 'Allow & Test'}</span>
          </button>
        </div>
      </div>

      {/* Live Level Visualizer Meter */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Volume2 className="w-3.5 h-3.5 text-slate-400" /> Live Volume Meter:
          </span>
          <span className="font-mono text-white text-xs">{audioLevel}%</span>
        </div>

        {/* Visualizer Bar */}
        <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800 flex items-center">
          <div
            className={`h-full rounded-full transition-all duration-75 ${
              audioLevel > 60
                ? 'bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500'
                : audioLevel > 20
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.max(2, audioLevel)}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-500 italic">
          Speak a few words into your microphone. The green volume bar should move when you speak.
        </p>
      </div>

      {/* 4-Second Test Recording & Playback */}
      <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          {!isRecordingTest ? (
            <button
              type="button"
              onClick={startRecordingTest}
              disabled={permissionStatus !== 'granted'}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30 transition disabled:opacity-40 flex items-center gap-2"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Record Short Sample (4s)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecordingTest}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-md animate-pulse flex items-center gap-2"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Recording... ({testCountdown}s left)</span>
            </button>
          )}
        </div>

        {/* Playback Component */}
        {testAudioUrl && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-emerald-400">
              Captured: {(testAudioSize / 1024).toFixed(1)} KB
            </span>
            <audio controls src={testAudioUrl} className="h-8 max-w-[200px]" />
          </div>
        )}
      </div>
    </div>
  );
}
