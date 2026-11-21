import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import InterviewSession from './pages/InterviewSession';
import VideoInterview from './pages/VideoInterview';
import InterviewReport from './pages/InterviewReport';
import InterviewHistory from './pages/InterviewHistory';
import InterviewSetup from './pages/InterviewSetup';
import ResumeUpload from './pages/ResumeUpload';
import ResumeAnalysis from './pages/ResumeAnalysis';
import UserProfile from './pages/UserProfile';

// Auto-scroll handler for page navigation & in-page anchors
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const element = document.getElementById(hash.replace('#', ''));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

/**
 * ProtectedRoute — redirects unauthenticated users to /login.
 * Shows a loading spinner while session verification is in progress.
 */
function ProtectedRoute({ children }) {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-400 p-[2px] animate-pulse">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-slate-400">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!user && !token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<Home />} />

          {/* Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected Routes — require authentication */}
          {/* Candidate Dashboard */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

          {/* Active AI Mock Interview Round (Exam Mode) */}
          <Route path="/interview/setup" element={<ProtectedRoute><InterviewSetup /></ProtectedRoute>} />
          <Route path="/interview/:id" element={<ProtectedRoute><InterviewSession /></ProtectedRoute>} />

          {/* Active Real-Time AI Video Call Interview */}
          <Route path="/interview/video/:id" element={<ProtectedRoute><VideoInterview /></ProtectedRoute>} />

          {/* Comprehensive Interview Evaluation Report */}
          <Route path="/interview/report/:id" element={<ProtectedRoute><InterviewReport /></ProtectedRoute>} />

          {/* Past Interview History & Records */}
          <Route path="/history" element={<ProtectedRoute><InterviewHistory /></ProtectedRoute>} />

          {/* Resume Upload & AI Verification */}
          <Route path="/resume/upload" element={<ProtectedRoute><ResumeUpload /></ProtectedRoute>} />
          <Route path="/resume/analysis/:id" element={<ProtectedRoute><ResumeAnalysis /></ProtectedRoute>} />

          {/* Candidate Profile */}
          <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
