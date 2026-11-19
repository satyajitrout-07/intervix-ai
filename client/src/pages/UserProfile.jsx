import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import {
  User,
  Mail,
  Briefcase,
  Layers,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Award,
  ArrowRight,
  Shield,
} from 'lucide-react';

export default function UserProfile() {
  const navigate = useNavigate();
  const { authFetch, user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [name, setName] = useState('');
  const [targetRole, setTargetRole] = useState('Full Stack Developer');
  const [preferredStack, setPreferredStack] = useState('MERN Stack');

  // Password Update
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status messages
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/users/profile');
      const data = await res.json();
      if (res.ok && data.data) {
        setProfileData(data.data);
        setName(data.data.user?.name || '');
        setTargetRole(data.data.user?.targetRole || 'Full Stack Developer');
        setPreferredStack(data.data.user?.preferredStack || 'MERN Stack');
      }
    } catch (err) {
      console.error('[Fetch Profile Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    if (newPassword && newPassword !== confirmPassword) {
      setErrorMsg('New password and confirmation do not match.');
      setIsSaving(false);
      return;
    }

    try {
      const payload = {
        name,
        targetRole,
        preferredStack,
        ...(newPassword ? { currentPassword, newPassword } : {}),
      };

      const res = await authFetch('/api/users/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update profile.');
      }

      setSuccessMsg('Profile and settings updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('[Update Profile Error]:', err);
      setErrorMsg(err.message || 'Error updating settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const userInitials = name
    ? name
        .split(' ')
        .map((p) => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'SR';

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
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-950/30 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-cyan-400 p-[2px] shadow-lg shadow-purple-600/20">
              <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-lg font-bold text-white tracking-wider">
                {userInitials}
              </div>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{name || 'Your Account'}</h1>
              <p className="text-xs sm:text-sm text-slate-400">{user?.email || 'Candidate Account'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
              Active Member
            </span>
          </div>
        </div>

        {/* Status Messages */}
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-1">Total Interviews</span>
            <span className="text-2xl font-black text-white">{profileData?.stats?.totalInterviews || 0}</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-1">Average Score</span>
            <span className="text-2xl font-black text-purple-400">{profileData?.stats?.avgScore || 0}%</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-1">Completed Rounds</span>
            <span className="text-2xl font-black text-cyan-400">{profileData?.stats?.completedInterviews || 0}</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-1">Resumes Uploaded</span>
            <span className="text-2xl font-black text-emerald-400">{profileData?.stats?.totalResumesUploaded || 0}</span>
          </div>
        </div>

        {/* Settings Form */}
        <form onSubmit={handleUpdateProfile} className="space-y-6">
          {/* Personal Settings */}
          <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800 shadow-xl space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <User className="w-4 h-4 text-purple-400" /> Personal & Career Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Email Address</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950/60 border border-slate-850 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Target Role</label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Senior Full Stack Engineer"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Preferred Technology Stack</label>
                <input
                  type="text"
                  value={preferredStack}
                  onChange={(e) => setPreferredStack(e.target.value)}
                  placeholder="e.g. MERN Stack, React & Node.js"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Security & Password */}
          <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800 shadow-xl space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Lock className="w-4 h-4 text-cyan-400" /> Security & Password
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Leave blank to keep existing"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 transition hover:scale-[1.02]"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Changes...' : 'Save Profile & Settings'}</span>
            </button>
          </div>
        </form>

        {/* Linked Resumes Section */}
        {profileData?.resumes && profileData.resumes.length > 0 && (
          <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" /> Linked Resumes
              </h2>
              <Link to="/resume/upload" className="text-xs text-purple-400 hover:underline">
                Upload New Resume
              </Link>
            </div>

            <div className="space-y-2">
              {profileData.resumes.map((r) => (
                <div
                  key={r.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <div>
                      <span className="font-semibold text-white block">{r.fileName}</span>
                      <span className="text-slate-500 text-[11px]">
                        Uploaded {new Date(r.createdAt).toLocaleDateString()} • {(r.fileSize / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>
                  <Link
                    to={`/resume/analysis/${r.id}`}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-purple-300 hover:text-white hover:border-purple-500 font-semibold text-xs flex items-center gap-1 transition"
                  >
                    <span>View Profile</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
