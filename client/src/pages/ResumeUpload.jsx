import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Logo from '../components/Logo';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FileCode,
  Zap,
} from 'lucide-react';

export default function ResumeUpload() {
  const navigate = useNavigate();
  const { authFetch, user } = useAuth();

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (file) => {
    setErrorMessage('');
    if (!file) return;

    const validExtensions = ['.pdf', '.docx', '.doc'];
    const lowerName = file.name.toLowerCase();
    const hasValidExt = validExtensions.some((ext) => lowerName.endsWith(ext));

    if (!hasValidExt) {
      setErrorMessage('Unsupported file format. Please upload a PDF or DOCX file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 5MB limit. Please upload a smaller document.');
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setErrorMessage('');
    setUploadProgress(15);
    setProcessingStage('Securely uploading resume document...');

    const timer1 = setTimeout(() => {
      setUploadProgress(45);
      setProcessingStage('Parsing text & extracting professional experience...');
    }, 800);

    const timer2 = setTimeout(() => {
      setUploadProgress(75);
      setProcessingStage('Detecting technical skills, projects & architecture topics...');
    }, 1800);

    try {
      const formData = new FormData();
      formData.append('resumeFile', selectedFile);

      // Use authFetch which correctly reads the token and handles FormData
      const res = await authFetch('/api/resume/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      clearTimeout(timer1);
      clearTimeout(timer2);

      if (!res.ok) {
        throw new Error(data.message || 'Failed to upload and analyze resume.');
      }

      setUploadProgress(100);
      setProcessingStage('Analysis complete! Redirecting to confirmation screen...');

      const resumeId = data.data?.resume?._id;
      setTimeout(() => {
        navigate(`/resume/analysis/${resumeId}`);
      }, 600);
    } catch (err) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      console.error('[Upload Error]:', err);
      setErrorMessage(err.message || 'Error uploading file. Please try again.');
      setIsUploading(false);
      setUploadProgress(0);
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
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-12">
        {/* Progress Stepper */}
        <div className="mb-10">
          <div className="flex items-center justify-between max-w-xl mx-auto relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-800 -z-0" />
            <div className="flex flex-col items-center gap-2 relative z-10">
              <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-purple-600/30">
                1
              </div>
              <span className="text-xs font-semibold text-purple-400">Upload Resume</span>
            </div>
            <div className="flex flex-col items-center gap-2 relative z-10">
              <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 text-slate-400 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <span className="text-xs font-medium text-slate-400">AI Analysis</span>
            </div>
            <div className="flex flex-col items-center gap-2 relative z-10">
              <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 text-slate-400 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <span className="text-xs font-medium text-slate-400">Confirm Profile</span>
            </div>
            <div className="flex flex-col items-center gap-2 relative z-10">
              <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 text-slate-400 flex items-center justify-center font-bold text-sm">
                4
              </div>
              <span className="text-xs font-medium text-slate-400">Start Interview</span>
            </div>
          </div>
        </div>

        {/* Header Title */}
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Personalized AI Mock Interview</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Upload Your Resume
          </h1>
          <p className="text-slate-400 max-w-lg mx-auto text-sm sm:text-base">
            Our AI engine analyzes your exact technologies, frameworks, and projects to generate custom, targeted interview questions.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {/* Upload Container */}
        <div className="p-8 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800 shadow-2xl relative overflow-hidden">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />

          {/* Dropzone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-purple-500 bg-purple-950/20 scale-[1.01]'
                : selectedFile
                ? 'border-emerald-500/50 bg-emerald-950/10'
                : 'border-slate-700/80 hover:border-purple-500/60 bg-slate-950/40 hover:bg-slate-900/50'
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600/30 to-cyan-500/30 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 shadow-lg shadow-purple-900/20">
              {selectedFile ? (
                <FileText className="w-8 h-8 text-emerald-400" />
              ) : (
                <UploadCloud className="w-8 h-8 text-purple-400" />
              )}
            </div>

            {selectedFile ? (
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> File Selected
                </div>
                <h3 className="text-lg font-bold text-white">{selectedFile.name}</h3>
                <p className="text-xs text-slate-400">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for analysis
                </p>
                <p className="text-xs text-purple-400 underline pt-2">Click to select a different file</p>
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="text-base sm:text-lg font-semibold text-white">
                  Drag and drop your resume file here
                </h3>
                <p className="text-xs sm:text-sm text-slate-400">
                  Supports <span className="text-slate-200 font-medium">PDF</span> and{' '}
                  <span className="text-slate-200 font-medium">DOCX</span> files up to 5MB
                </p>
                <div className="pt-3">
                  <span className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-purple-300 border border-slate-700 inline-block transition">
                    Browse Files
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Upload & Analysis Progress */}
          {isUploading && (
            <div className="mt-6 space-y-3 p-4 rounded-xl bg-slate-950/80 border border-purple-500/30">
              <div className="flex items-center justify-between text-xs">
                <span className="text-purple-300 font-medium flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 animate-bounce text-cyan-400" />
                  {processingStage}
                </span>
                <span className="font-mono text-cyan-400">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 via-indigo-500 to-cyan-400 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>100% Secure • Never shared or used for unauthorized training</span>
            </div>

            <button
              onClick={handleUploadAndAnalyze}
              disabled={!selectedFile || isUploading}
              className={`w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition shadow-lg ${
                !selectedFile || isUploading
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/30 hover:scale-[1.02]'
              }`}
            >
              <span>{isUploading ? 'Analyzing Resume...' : 'Analyze Resume & Continue'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
