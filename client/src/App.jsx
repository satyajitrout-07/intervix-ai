import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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

          {/* Candidate Dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Active AI Mock Interview Round (Exam Mode) */}
          <Route path="/interview/setup" element={<InterviewSetup />} />
          <Route path="/interview/:id" element={<InterviewSession />} />

          {/* Active Real-Time AI Video Call Interview */}
          <Route path="/interview/video/:id" element={<VideoInterview />} />

          {/* Comprehensive Interview Evaluation Report */}
          <Route path="/interview/report/:id" element={<InterviewReport />} />

          {/* Past Interview History & Records */}
          <Route path="/history" element={<InterviewHistory />} />

          {/* Resume Upload & AI Verification */}
          <Route path="/resume/upload" element={<ResumeUpload />} />
          <Route path="/resume/analysis/:id" element={<ResumeAnalysis />} />

          {/* Candidate Profile */}
          <Route path="/profile" element={<UserProfile />} />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
