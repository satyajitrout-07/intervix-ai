import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Plus,
  X,
  Edit2,
  Trash2,
  Clock,
  Layers,
  Code2,
  Database,
  Globe,
  Cpu,
  Wrench,
  BookOpen,
  Briefcase,
  HelpCircle,
  Play,
  Save,
  Check,
} from 'lucide-react';

// Safe helper to format any education shape (string, object, array) into a human-readable display string
function formatEducationDisplay(edu) {
  if (!edu) return '';
  if (typeof edu === 'string') return edu.trim();
  if (Array.isArray(edu)) {
    return edu
      .map((e) => {
        if (!e) return '';
        if (typeof e === 'string') return e.trim();
        const degree = (e.degree || '').trim();
        const branch = (e.branch || '').trim();
        const institution = (e.institution || '').trim();
        const year = (e.year || '').trim();
        let text = degree;
        if (branch) {
          if (text && !text.toLowerCase().includes(branch.toLowerCase())) {
            text = `${text} in ${branch}`;
          } else if (!text) {
            text = branch;
          }
        }
        if (institution) text = text ? `${text}, ${institution}` : institution;
        if (year) text = text ? `${text} (${year})` : year;
        return text;
      })
      .filter(Boolean)
      .join('; ');
  }
  if (typeof edu === 'object') {
    const degree = (edu.degree || '').trim();
    const branch = (edu.branch || '').trim();
    const institution = (edu.institution || '').trim();
    const year = (edu.year || '').trim();
    let text = degree;
    if (branch) {
      if (text && !text.toLowerCase().includes(branch.toLowerCase())) {
        text = `${text} in ${branch}`;
      } else if (!text) {
        text = branch;
      }
    }
    if (institution) text = text ? `${text}, ${institution}` : institution;
    if (year) text = text ? `${text} (${year})` : year;
    return text;
  }
  return String(edu);
}

export default function ResumeAnalysis() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authFetch, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [resume, setResume] = useState(null);
  const [previewQuestions, setPreviewQuestions] = useState([]);

  // Editable Profile States
  const [candidateName, setCandidateName] = useState('');
  const [education, setEducation] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Junior');
  const [summary, setSummary] = useState('');

  // Categorized Skills States
  const [categorizedSkills, setCategorizedSkills] = useState({
    languages: [],
    frontend: [],
    backend: [],
    database: [],
    tools: [],
  });
  const [newSkillInputs, setNewSkillInputs] = useState({
    languages: '',
    frontend: '',
    backend: '',
    database: '',
    tools: '',
  });

  // Projects State
  const [projects, setProjects] = useState([]);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    technologies: '',
    role: 'Full Stack Developer',
    duration: '3 months',
  });

  // Interview Configuration State
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [interviewType, setInterviewType] = useState('Mixed');
  const [language, setLanguage] = useState('English');
  const [mode, setMode] = useState('video');

  // Action Loading States
  const [isSaving, setIsSaving] = useState(false);
  const [isStartingInterview, setIsStartingInterview] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState('');

  // Fetch Resume Analysis on mount
  useEffect(() => {
    fetchResumeAnalysis();
  }, [id]);

  const fetchResumeAnalysis = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const endpoint = id && id !== 'latest' ? `/api/resume/${id}` : '/api/resume/latest';
      const res = await authFetch(endpoint);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to load resume analysis.');
      }

      const resDoc = data.data?.resume;
      setResume(resDoc);
      setPreviewQuestions(data.data?.previewQuestions || []);

      // Initialize form with confirmedData or parsedData
      const conf = resDoc.confirmedData || resDoc.parsedData || {};
      setCandidateName(conf.candidateName || user?.name || 'Candidate');
      setEducation(formatEducationDisplay(conf.education || resDoc.parsedData?.education) || 'B.Tech in Computer Science');
      setExperienceLevel(conf.estimatedExperienceLevel || 'Junior');
      setSummary(conf.summary || '');

      setCategorizedSkills({
        languages: conf.categorizedSkills?.languages || [],
        frontend: conf.categorizedSkills?.frontend || [],
        backend: conf.categorizedSkills?.backend || [],
        database: conf.categorizedSkills?.database || [],
        tools: conf.categorizedSkills?.tools || [],
      });

      setProjects(conf.projects || []);

      if (conf.interviewConfig) {
        setDifficulty(conf.interviewConfig.difficulty || 'Intermediate');
        setDurationMinutes(conf.interviewConfig.durationMinutes || 15);
        setInterviewType(conf.interviewConfig.interviewType || 'Mixed');
        setLanguage(conf.interviewConfig.language || 'English');
        setMode(conf.interviewConfig.mode || 'video');
      }
    } catch (err) {
      console.error('[Fetch Resume Error]:', err);
      setErrorMsg(err.message || 'Unable to load resume data. Please try re-uploading.');
    } finally {
      setLoading(false);
    }
  };

  // Skill Management
  const handleRemoveSkill = (category, skillToRemove) => {
    const updated = {
      ...categorizedSkills,
      [category]: categorizedSkills[category].filter((s) => s !== skillToRemove),
    };
    setCategorizedSkills(updated);
    refreshPreviewQuestions(updated, projects, difficulty, interviewType);
  };

  const handleAddSkill = (category) => {
    const skillName = (newSkillInputs[category] || '').trim();
    if (!skillName) return;

    if (!categorizedSkills[category].includes(skillName)) {
      const updated = {
        ...categorizedSkills,
        [category]: [...categorizedSkills[category], skillName],
      };
      setCategorizedSkills(updated);
      refreshPreviewQuestions(updated, projects, difficulty, interviewType);
    }
    setNewSkillInputs({ ...newSkillInputs, [category]: '' });
  };

  // Project Management
  const handleRemoveProject = (indexToRemove) => {
    const updated = projects.filter((_, idx) => idx !== indexToRemove);
    setProjects(updated);
    refreshPreviewQuestions(categorizedSkills, updated, difficulty, interviewType);
  };

  const handleSaveNewProject = () => {
    if (!newProject.title.trim()) return;

    const techArray = newProject.technologies
      ? newProject.technologies
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const updated = [
      ...projects,
      {
        title: newProject.title.trim(),
        description: newProject.description.trim() || 'Software development project.',
        technologies: techArray,
        role: newProject.role.trim() || 'Full Stack Developer',
        duration: newProject.duration.trim() || '3 months',
        suggestedTopics: [`Architecture of ${newProject.title}`, 'Key Technical Decisions'],
      },
    ];

    setProjects(updated);
    setNewProject({
      title: '',
      description: '',
      technologies: '',
      role: 'Full Stack Developer',
      duration: '3 months',
    });
    setIsAddingProject(false);
    refreshPreviewQuestions(categorizedSkills, updated, difficulty, interviewType);
  };

  // Dynamic preview questions refresh
  const refreshPreviewQuestions = async (skills, projs, diff, type) => {
    try {
      const targetId = resume?._id || id;
      const res = await authFetch(`/api/resume/${targetId}/preview-questions`, {
        method: 'POST',
        body: JSON.stringify({
          categorizedSkills: skills,
          projects: projs,
          difficulty: diff,
          interviewType: type,
        }),
      });
      const data = await res.json();
      if (res.ok && data.data?.previewQuestions) {
        setPreviewQuestions(data.data.previewQuestions);
      }
    } catch {}
  };

  // Save changes to MongoDB
  const handleSaveProfile = async (silent = false) => {
    setIsSaving(true);
    setSaveSuccessNotice('');

    try {
      const targetId = resume?._id || id;
      const payload = {
        candidateName,
        education,
        estimatedExperienceLevel: experienceLevel,
        summary,
        categorizedSkills,
        projects,
        interviewConfig: {
          difficulty,
          durationMinutes: Number(durationMinutes),
          interviewType,
          language,
          mode,
        },
      };

      const res = await authFetch(`/api/resume/${targetId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update profile.');
      }

      if (!silent) {
        setSaveSuccessNotice('AI Profile saved successfully in database.');
        setTimeout(() => setSaveSuccessNotice(''), 4000);
      }
      return true;
    } catch (err) {
      console.error('[Save Profile Error]:', err);
      setErrorMsg(err.message || 'Failed to save changes.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Confirm Profile and Start Interview Session
  const handleConfirmAndStart = async () => {
    setIsStartingInterview(true);
    setErrorMsg('');

    try {
      const targetId = resume?._id || id;
      const payload = {
        confirmedData: {
          candidateName,
          education,
          estimatedExperienceLevel: experienceLevel,
          summary,
          categorizedSkills,
          projects,
          interviewConfig: {
            difficulty,
            durationMinutes: Number(durationMinutes),
            interviewType,
            language,
            mode,
          },
        },
      };

      const res = await authFetch(`/api/resume/${targetId}/confirm-and-start`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to start interview from confirmed resume.');
      }

      const interviewId = data.data?.interviewId;
      const launchMode = data.data?.mode || mode;

      if (launchMode === 'video') {
        navigate(`/interview/video/${interviewId}`);
      } else {
        navigate(`/interview/${interviewId}`);
      }
    } catch (err) {
      console.error('[Confirm & Start Error]:', err);
      setErrorMsg(err.message || 'Error initializing interview session.');
      setIsStartingInterview(false);
    }
  };

  // Loading Skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-400 p-[2px] animate-pulse mb-6">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Analyzing Resume Intelligence...</h2>
        <p className="text-sm text-slate-400">Extracting technologies, experience depth, and tailoring question topics.</p>
      </div>
    );
  }

  // Error State with Retry
  if (errorMsg && !resume) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-4 shadow-2xl">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Resume Profile Not Found</h2>
          <p className="text-sm text-slate-400">{errorMsg}</p>
          <div className="flex items-center justify-center gap-3 pt-4">
            <Link
              to="/resume/upload"
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-semibold text-xs text-white transition"
            >
              Upload New Resume
            </Link>
            <button
              onClick={fetchResumeAnalysis}
              className="px-5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 font-semibold text-xs text-slate-300 transition"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const userInitials = candidateName
    ? candidateName
        .split(' ')
        .map((p) => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'SR';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-purple-600 selection:text-white">
      {/* 1. TOP NAVBAR */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between py-3">
          <div className="flex items-center gap-6">
            <Logo to="/dashboard" />
            <span className="hidden sm:inline-block px-2.5 py-1 rounded-md bg-purple-900/40 text-purple-300 border border-purple-500/30 text-xs font-mono">
              Profile Verification Engine
            </span>
          </div>

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
              Interview History
            </Link>

            {/* Profile Avatar */}
            <div
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-cyan-400 p-[1.5px] flex items-center justify-center shadow-md shadow-cyan-500/10 cursor-pointer"
              title={candidateName}
            >
              <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-xs font-bold text-white tracking-wider">
                {userInitials}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* 2. PROGRESS STEPPER */}
        <div className="max-w-3xl mx-auto relative mb-6">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-800 -z-0" />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xs shadow-md shadow-emerald-500/20">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <span className="text-[11px] font-medium text-slate-400">1. Upload Resume</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xs shadow-md shadow-emerald-500/20">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <span className="text-[11px] font-medium text-slate-400">2. AI Analysis</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs ring-4 ring-purple-600/20 shadow-md shadow-purple-600/30">
                3
              </div>
              <span className="text-[11px] font-bold text-purple-400">3. Confirm Profile</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 text-slate-400 flex items-center justify-center font-bold text-xs">
                4
              </div>
              <span className="text-[11px] font-medium text-slate-500">4. Start Interview</span>
            </div>
          </div>
        </div>

        {/* Page Title & Subtitle */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Step 3 of 4: Profile Verification</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Your AI Profile</h1>
            <p className="text-slate-400 text-sm sm:text-base mt-1 max-w-2xl">
              Review what our AI discovered in your resume before starting your personalized interview. You can customize any detected skills or projects.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSaveProfile(false)}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-2 transition"
            >
              <Save className="w-3.5 h-3.5 text-slate-400" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
            <button
              onClick={handleConfirmAndStart}
              disabled={isStartingInterview}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 transition hover:scale-[1.02]"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isStartingInterview ? 'Starting...' : 'Confirm & Start Interview'}</span>
            </button>
          </div>
        </div>

        {/* Success Notice Banner */}
        {saveSuccessNotice && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-3 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveSuccessNotice}</span>
          </div>
        )}

        {/* Error Notice */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 3. RESUME OVERVIEW CARD */}
        <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600/30 to-cyan-500/30 border border-purple-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-purple-950/40">
              <FileText className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-bold text-white">{resume?.fileName || 'Uploaded_Resume.pdf'}</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Analyzed via INTERVIX NLP
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Format: <span className="text-slate-200 uppercase font-semibold">{resume?.fileType || 'PDF'}</span> • Size:{' '}
                <span className="text-slate-200">{((resume?.fileSize || 0) / 1024).toFixed(1)} KB</span> • Uploaded:{' '}
                <span className="text-slate-200">{new Date(resume?.createdAt || Date.now()).toLocaleDateString()}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/resume/upload"
              className="px-4 py-2 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-950 hover:bg-slate-900 text-slate-300 text-xs font-semibold flex items-center gap-2 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Replace Resume</span>
            </Link>
            <button
              onClick={fetchResumeAnalysis}
              className="px-4 py-2 rounded-xl border border-purple-500/30 hover:border-purple-500/60 bg-purple-950/40 text-purple-300 text-xs font-semibold flex items-center gap-2 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Re-analyze</span>
            </button>
          </div>
        </div>

        {/* GRID: Personal Info & Skills */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 4. PERSONAL INFORMATION CARD */}
          <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800 shadow-xl space-y-5 lg:col-span-1">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Briefcase className="w-4 h-4 text-purple-400" />
              <h2 className="text-base font-bold text-white">Personal Information</h2>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Candidate Name</label>
                <input
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-purple-500 transition"
                  placeholder="Your Full Name"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Education / Degree</label>
                <input
                  type="text"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-purple-500 transition"
                  placeholder="e.g. B.Tech in Computer Science"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Estimated Experience Level</label>
                <select
                  value={experienceLevel}
                  onChange={(e) => {
                    setExperienceLevel(e.target.value);
                    const diff =
                      e.target.value === 'Fresher'
                        ? 'Beginner'
                        : e.target.value === 'Advanced'
                        ? 'Advanced'
                        : 'Intermediate';
                    setDifficulty(diff);
                    refreshPreviewQuestions(categorizedSkills, projects, diff, interviewType);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-purple-500 transition"
                >
                  <option value="Fresher">Fresher (0–1 Year)</option>
                  <option value="Junior">Junior (1–2 Years)</option>
                  <option value="Intermediate">Intermediate (2–5 Years)</option>
                  <option value="Advanced">Advanced (5+ Years)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Professional Summary</label>
                <textarea
                  rows={4}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-purple-500 transition resize-none leading-relaxed"
                  placeholder="Candidate summary extracted from resume..."
                />
              </div>
            </div>
          </div>

          {/* 5. SKILLS VERIFICATION CARD */}
          <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800 shadow-xl space-y-6 lg:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <h2 className="text-base font-bold text-white">Skills Verification</h2>
              </div>
              <span className="text-xs text-slate-400">Click &times; to remove or add missing skills</span>
            </div>

            {/* Categorized Skills Section */}
            <div className="space-y-5">
              {/* Category: Frontend */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-purple-300 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-purple-400" /> Frontend Technologies
                  </span>
                  <span className="text-slate-500 font-mono text-[11px]">{categorizedSkills.frontend.length} detected</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-slate-950/70 border border-slate-850">
                  {categorizedSkills.frontend.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-950/60 border border-purple-500/30 text-purple-200 text-xs font-medium"
                    >
                      {skill}
                      <button
                        onClick={() => handleRemoveSkill('frontend', skill)}
                        className="hover:text-red-400 transition"
                        title="Remove skill"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <div className="inline-flex items-center gap-1 ml-1">
                    <input
                      type="text"
                      placeholder="Add frontend skill..."
                      value={newSkillInputs.frontend}
                      onChange={(e) => setNewSkillInputs({ ...newSkillInputs, frontend: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSkill('frontend')}
                      className="px-2.5 py-1 text-xs rounded-lg bg-slate-900 border border-slate-750 text-slate-200 focus:outline-none focus:border-purple-500 w-36"
                    />
                    <button
                      onClick={() => handleAddSkill('frontend')}
                      className="p-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Category: Backend */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" /> Backend Frameworks & Systems
                  </span>
                  <span className="text-slate-500 font-mono text-[11px]">{categorizedSkills.backend.length} detected</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-slate-950/70 border border-slate-850">
                  {categorizedSkills.backend.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-200 text-xs font-medium"
                    >
                      {skill}
                      <button
                        onClick={() => handleRemoveSkill('backend', skill)}
                        className="hover:text-red-400 transition"
                        title="Remove skill"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <div className="inline-flex items-center gap-1 ml-1">
                    <input
                      type="text"
                      placeholder="Add backend skill..."
                      value={newSkillInputs.backend}
                      onChange={(e) => setNewSkillInputs({ ...newSkillInputs, backend: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSkill('backend')}
                      className="px-2.5 py-1 text-xs rounded-lg bg-slate-900 border border-slate-750 text-slate-200 focus:outline-none focus:border-cyan-500 w-36"
                    />
                    <button
                      onClick={() => handleAddSkill('backend')}
                      className="p-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Category: Databases */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-emerald-400" /> Databases & Storage
                  </span>
                  <span className="text-slate-500 font-mono text-[11px]">{categorizedSkills.database.length} detected</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-slate-950/70 border border-slate-850">
                  {categorizedSkills.database.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-200 text-xs font-medium"
                    >
                      {skill}
                      <button
                        onClick={() => handleRemoveSkill('database', skill)}
                        className="hover:text-red-400 transition"
                        title="Remove skill"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <div className="inline-flex items-center gap-1 ml-1">
                    <input
                      type="text"
                      placeholder="Add database..."
                      value={newSkillInputs.database}
                      onChange={(e) => setNewSkillInputs({ ...newSkillInputs, database: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSkill('database')}
                      className="px-2.5 py-1 text-xs rounded-lg bg-slate-900 border border-slate-750 text-slate-200 focus:outline-none focus:border-emerald-500 w-36"
                    />
                    <button
                      onClick={() => handleAddSkill('database')}
                      className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Category: Programming Languages */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-amber-400" /> Programming Languages
                  </span>
                  <span className="text-slate-500 font-mono text-[11px]">{categorizedSkills.languages.length} detected</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-slate-950/70 border border-slate-850">
                  {categorizedSkills.languages.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-950/60 border border-amber-500/30 text-amber-200 text-xs font-medium"
                    >
                      {skill}
                      <button
                        onClick={() => handleRemoveSkill('languages', skill)}
                        className="hover:text-red-400 transition"
                        title="Remove skill"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <div className="inline-flex items-center gap-1 ml-1">
                    <input
                      type="text"
                      placeholder="Add language..."
                      value={newSkillInputs.languages}
                      onChange={(e) => setNewSkillInputs({ ...newSkillInputs, languages: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSkill('languages')}
                      className="px-2.5 py-1 text-xs rounded-lg bg-slate-900 border border-slate-750 text-slate-200 focus:outline-none focus:border-amber-500 w-36"
                    />
                    <button
                      onClick={() => handleAddSkill('languages')}
                      className="p-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Category: Tools & Technologies */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-indigo-400" /> DevOps, Cloud & Developer Tools
                  </span>
                  <span className="text-slate-500 font-mono text-[11px]">{categorizedSkills.tools.length} detected</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-slate-950/70 border border-slate-850">
                  {categorizedSkills.tools.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-200 text-xs font-medium"
                    >
                      {skill}
                      <button
                        onClick={() => handleRemoveSkill('tools', skill)}
                        className="hover:text-red-400 transition"
                        title="Remove skill"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <div className="inline-flex items-center gap-1 ml-1">
                    <input
                      type="text"
                      placeholder="Add tool..."
                      value={newSkillInputs.tools}
                      onChange={(e) => setNewSkillInputs({ ...newSkillInputs, tools: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSkill('tools')}
                      className="px-2.5 py-1 text-xs rounded-lg bg-slate-900 border border-slate-750 text-slate-200 focus:outline-none focus:border-indigo-500 w-36"
                    />
                    <button
                      onClick={() => handleAddSkill('tools')}
                      className="p-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 6. PROJECT ANALYSIS CARD */}
        <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-400" />
              <div>
                <h2 className="text-lg font-bold text-white">Project Analysis & Architecture</h2>
                <p className="text-xs text-slate-400">
                  Projects identified in your resume. Questions will directly examine the technologies and architectural decisions in these projects.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsAddingProject(!isAddingProject)}
              className="px-3 py-1.5 rounded-xl border border-purple-500/40 bg-purple-950/30 hover:bg-purple-900/50 text-purple-300 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Project</span>
            </button>
          </div>

          {/* Add Project Form (if opened) */}
          {isAddingProject && (
            <div className="p-4 rounded-xl bg-slate-950 border border-purple-500/30 space-y-3">
              <h4 className="text-xs font-bold text-purple-300">Add Project Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <input
                  type="text"
                  placeholder="Project Title (e.g. E-Commerce Microservices)"
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-purple-500"
                />
                <input
                  type="text"
                  placeholder="Technologies (comma separated, e.g. React, Node.js, MongoDB)"
                  value={newProject.technologies}
                  onChange={(e) => setNewProject({ ...newProject, technologies: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>
              <textarea
                placeholder="Description of architecture, features, and your role..."
                rows={2}
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-purple-500 resize-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsAddingProject(false)}
                  className="px-3 py-1 text-xs rounded-lg border border-slate-700 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNewProject}
                  className="px-4 py-1 text-xs rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold"
                >
                  Save Project
                </button>
              </div>
            </div>
          )}

          {/* Projects List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((proj, idx) => (
              <div
                key={idx}
                className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition space-y-3 relative group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                      {proj.title}
                    </h3>
                    <span className="text-[11px] text-purple-400/90 font-mono">Role: {proj.role || 'Developer'}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveProject(idx)}
                    className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition"
                    title="Remove project"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{proj.description}</p>

                {/* Tech Tags */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {proj.technologies?.map((tech) => (
                    <span
                      key={tech}
                      className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-mono"
                    >
                      {tech}
                    </span>
                  ))}
                </div>

                {/* Suggested Interview Topics */}
                {proj.suggestedTopics && proj.suggestedTopics.length > 0 && (
                  <div className="pt-2 border-t border-slate-900 text-[11px] space-y-1">
                    <span className="text-slate-500 font-medium">Suggested Interview Topics:</span>
                    <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                      {proj.suggestedTopics.slice(0, 2).map((topic, tIdx) => (
                        <li key={tIdx} className="text-[11px]">
                          {topic}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 7. INTERVIEW CONFIGURATION */}
        <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Clock className="w-4 h-4 text-purple-400" />
            <h2 className="text-base font-bold text-white">Interview Configuration</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
            {/* Difficulty */}
            <div className="space-y-2">
              <label className="font-semibold text-slate-300">Difficulty Level</label>
              <div className="grid grid-cols-3 gap-1.5">
                {['Beginner', 'Intermediate', 'Advanced'].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => {
                      setDifficulty(lvl);
                      refreshPreviewQuestions(categorizedSkills, projects, lvl, interviewType);
                    }}
                    className={`py-2 px-2 rounded-xl text-center font-semibold text-xs border transition ${
                      difficulty === lvl
                        ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label className="font-semibold text-slate-300">Duration (Minutes)</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[15, 30, 45].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDurationMinutes(mins)}
                    className={`py-2 px-2 rounded-xl text-center font-semibold text-xs border transition ${
                      durationMinutes === mins
                        ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-600/30'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {mins} Min ({mins === 45 ? '15 Qs' : mins === 30 ? '10 Qs' : '5 Qs'})
                  </button>
                ))}
              </div>
            </div>

            {/* Interview Type */}
            <div className="space-y-2">
              <label className="font-semibold text-slate-300">Interview Focus</label>
              <div className="grid grid-cols-3 gap-1.5">
                {['Technical', 'Project-Based', 'Mixed'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setInterviewType(type);
                      refreshPreviewQuestions(categorizedSkills, projects, difficulty, type);
                    }}
                    className={`py-2 px-2 rounded-xl text-center font-semibold text-xs border transition ${
                      interviewType === type
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div className="space-y-2">
              <label className="font-semibold text-slate-300">Interview Language</label>
              <div className="grid grid-cols-2 gap-1.5">
                {['English', 'Hindi'].map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage(lang)}
                    className={`py-2 px-2 rounded-xl text-center font-semibold text-xs border transition ${
                      language === lang
                        ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 8. INTERVIEW PREVIEW */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900/90 via-purple-950/20 to-slate-900/90 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              <h2 className="text-base font-bold text-white">Personalized Interview Preview</h2>
            </div>
            <span className="text-[11px] text-slate-400">Questions generated live from your verified profile</span>
          </div>

          <div className="space-y-3">
            {previewQuestions.map((q, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-950/90 border border-slate-800/80 flex items-start gap-3 text-xs"
              >
                <div className="w-6 h-6 rounded-lg bg-purple-950/80 border border-purple-500/40 text-purple-300 font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-cyan-300 border border-cyan-500/20 text-[10px] font-mono">
                      {q.category}
                    </span>
                    <span className="text-slate-500 text-[10px] font-medium">• Focus: {q.focus}</span>
                  </div>
                  <p className="text-slate-200 leading-relaxed font-medium">{q.question}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 9. CONFIRMATION ACTIONS */}
        <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/80 border border-purple-500/30 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 justify-center sm:justify-start">
              <ShieldCheck className="w-5 h-5 text-emerald-400" /> Ready to Launch Your Interview
            </h3>
            <p className="text-xs text-slate-400 max-w-lg">
              Once confirmed, your AI interviewer Elena will initiate the round tailored specifically to your verified skills and projects.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => {
                handleSaveProfile(true);
                navigate('/dashboard');
              }}
              className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold text-xs transition"
            >
              Save and Continue Later
            </button>

            <button
              onClick={handleConfirmAndStart}
              disabled={isStartingInterview}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-purple-600/30 transition hover:scale-[1.02]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isStartingInterview ? 'Initializing Room...' : 'Confirm Profile & Start Interview'}</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
