const Resume = require('../models/Resume');
const Interview = require('../models/Interview');
const {
  parseResume,
  generatePreviewQuestions,
  normalizeEducation,
  formatEducationToString,
  normalizeParsedData,
} = require('../services/resumeParser');
const aiService = require('../services/aiService');

// @desc    Upload & analyze a resume (PDF/DOCX)
// @route   POST /api/resume/upload
// @access  Private
const uploadResume = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No resume file provided. Please upload a PDF or DOCX file (up to 5MB).',
      });
    }

    const { originalname, size, buffer, mimetype } = req.file;
    const lowerName = originalname.toLowerCase();
    let fileType = '';

    if (lowerName.endsWith('.pdf') || mimetype === 'application/pdf') {
      fileType = 'pdf';
    } else if (
      lowerName.endsWith('.docx') ||
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      fileType = 'docx';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid file format. Only PDF and DOCX files are supported.',
      });
    }

    // Parse resume text and extract structured information
    const { rawText, parsedData } = await parseResume(buffer, fileType);

    // Initial confirmed data defaults (education string formatted cleanly for display/confirmation)
    const confirmedEducationStr = typeof parsedData.education === 'string'
      ? parsedData.education.trim()
      : formatEducationToString(parsedData.education);

    const confirmedData = {
      candidateName: parsedData.candidateName || req.user.name || 'Candidate',
      education: confirmedEducationStr || 'B.Tech in Computer Science',
      estimatedExperienceLevel: parsedData.estimatedExperienceLevel || 'Junior',
      summary: parsedData.summary || '',
      categorizedSkills: parsedData.categorizedSkills,
      projects: parsedData.projects,
      interviewConfig: {
        difficulty:
          parsedData.estimatedExperienceLevel === 'Fresher'
            ? 'Beginner'
            : parsedData.estimatedExperienceLevel === 'Advanced'
            ? 'Advanced'
            : 'Intermediate',
        durationMinutes: 15,
        interviewType: 'Mixed',
        language: 'English',
        mode: 'video',
      },
    };

    // Save to MongoDB
    const resume = await Resume.create({
      userId: req.user._id,
      fileName: originalname,
      fileType,
      fileSize: size,
      rawText,
      status: 'analyzed',
      parsedData,
      confirmedData,
    });

    // Generate preview questions based on the extracted profile
    const previewQuestions = generatePreviewQuestions(
      confirmedData.categorizedSkills,
      confirmedData.projects,
      confirmedData.interviewConfig.difficulty,
      confirmedData.interviewConfig.interviewType
    );

    return res.status(201).json({
      success: true,
      message: 'Resume uploaded and analyzed successfully.',
      data: {
        resume,
        previewQuestions,
      },
    });
  } catch (error) {
    console.error('[Resume Upload Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to process and analyze resume.',
    });
  }
};

// @desc    Get user's most recent uploaded resume
// @route   GET /api/resume/latest
// @access  Private
const getLatestResume = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const resume = await Resume.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'No resume found for this account. Please upload your resume to begin.',
      });
    }

    const previewQuestions = generatePreviewQuestions(
      resume.confirmedData?.categorizedSkills || resume.parsedData?.categorizedSkills,
      resume.confirmedData?.projects || resume.parsedData?.projects,
      resume.confirmedData?.interviewConfig?.difficulty || 'Intermediate',
      resume.confirmedData?.interviewConfig?.interviewType || 'Mixed'
    );

    return res.status(200).json({
      success: true,
      data: {
        resume,
        previewQuestions,
      },
    });
  } catch (error) {
    console.error('[Get Latest Resume Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching resume.',
    });
  }
};

// @desc    Get resume by ID
// @route   GET /api/resume/:id
// @access  Private
const getResumeById = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const resume = await Resume.findOne({ _id: req.params.id, userId: req.user._id });
    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found.',
      });
    }

    const previewQuestions = generatePreviewQuestions(
      resume.confirmedData?.categorizedSkills || resume.parsedData?.categorizedSkills,
      resume.confirmedData?.projects || resume.parsedData?.projects,
      resume.confirmedData?.interviewConfig?.difficulty || 'Intermediate',
      resume.confirmedData?.interviewConfig?.interviewType || 'Mixed'
    );

    return res.status(200).json({
      success: true,
      data: {
        resume,
        previewQuestions,
      },
    });
  } catch (error) {
    console.error('[Get Resume Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching resume details.',
    });
  }
};

// @desc    Update / confirm user's verified profile data
// @route   PUT /api/resume/:id
// @access  Private
const updateConfirmedProfile = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const { id } = req.params;
    const { candidateName, education, estimatedExperienceLevel, summary, categorizedSkills, projects, interviewConfig } =
      req.body || {};

    const resume = await Resume.findOne({ _id: id, userId: req.user._id });
    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume profile not found.',
      });
    }

    if (candidateName) resume.confirmedData.candidateName = candidateName.trim();
    if (education !== undefined) {
      resume.confirmedData.education = typeof education === 'string'
        ? education.trim()
        : formatEducationToString(education);
    }
    if (estimatedExperienceLevel) resume.confirmedData.estimatedExperienceLevel = estimatedExperienceLevel;
    if (summary !== undefined) resume.confirmedData.summary = summary.trim();

    if (categorizedSkills) {
      resume.confirmedData.categorizedSkills = {
        frontend: Array.isArray(categorizedSkills.frontend) ? categorizedSkills.frontend : [],
        backend: Array.isArray(categorizedSkills.backend) ? categorizedSkills.backend : [],
        database: Array.isArray(categorizedSkills.database) ? categorizedSkills.database : [],
        languages: Array.isArray(categorizedSkills.languages) ? categorizedSkills.languages : [],
        tools: Array.isArray(categorizedSkills.tools) ? categorizedSkills.tools : [],
      };
    }

    if (Array.isArray(projects)) {
      resume.confirmedData.projects = projects.map((p, idx) => ({
        title: p.title || `Project ${idx + 1}`,
        description: p.description || '',
        technologies: Array.isArray(p.technologies) ? p.technologies : [],
        role: p.role || 'Developer',
        duration: p.duration || '',
        suggestedTopics: Array.isArray(p.suggestedTopics) ? p.suggestedTopics : [],
      }));
    }

    if (interviewConfig) {
      resume.confirmedData.interviewConfig = {
        difficulty: interviewConfig.difficulty || 'Intermediate',
        durationMinutes: Number(interviewConfig.durationMinutes) || 15,
        interviewType: interviewConfig.interviewType || 'Mixed',
        language: interviewConfig.language || 'English',
        mode: interviewConfig.mode || 'video',
      };
    }

    await resume.save();

    const previewQuestions = generatePreviewQuestions(
      resume.confirmedData.categorizedSkills,
      resume.confirmedData.projects,
      resume.confirmedData.interviewConfig.difficulty,
      resume.confirmedData.interviewConfig.interviewType
    );

    return res.status(200).json({
      success: true,
      message: 'AI profile updated and verified successfully.',
      data: {
        resume,
        previewQuestions,
      },
    });
  } catch (error) {
    console.error('[Update Profile Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update profile.',
    });
  }
};

// @desc    Generate preview questions dynamically
// @route   POST /api/resume/:id/preview-questions
// @access  Private
const getPreviewQuestions = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const { categorizedSkills, projects, difficulty, interviewType } = req.body || {};
    const questions = generatePreviewQuestions(categorizedSkills, projects, difficulty, interviewType);

    return res.status(200).json({
      success: true,
      data: {
        previewQuestions: questions,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error generating preview questions.',
    });
  }
};

// @desc    Confirm profile & start personalized AI Interview
// @route   POST /api/resume/:id/confirm-and-start
// @access  Private
const confirmAndStartInterview = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const { id } = req.params;
    const resume = await Resume.findOne({ _id: id, userId: req.user._id });
    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume record not found.',
      });
    }

    // Apply any final confirmations submitted in request body
    if (req.body && req.body.confirmedData) {
      const incoming = { ...req.body.confirmedData };
      if (incoming.education !== undefined && typeof incoming.education !== 'string') {
        incoming.education = formatEducationToString(incoming.education);
      }
      resume.confirmedData = {
        ...resume.confirmedData,
        ...incoming,
      };
    }

    resume.status = 'confirmed';
    await resume.save();

    const conf = resume.confirmedData || resume.parsedData;
    const config = conf.interviewConfig || {
      difficulty: 'Intermediate',
      durationMinutes: 15,
      interviewType: 'Mixed',
      mode: 'video',
    };

    const duration = Number(config.durationMinutes) || 15;
    const qCount = duration === 45 ? 15 : duration === 30 ? 10 : 5;

    // Collect all confirmed technical skills
    const allSkills = [
      ...(conf.categorizedSkills?.frontend || []),
      ...(conf.categorizedSkills?.backend || []),
      ...(conf.categorizedSkills?.database || []),
      ...(conf.categorizedSkills?.languages || []),
    ];

    // Pick top skills & primary project
    const primarySkill = allSkills[0] || 'JavaScript';
    const primaryProject = conf.projects?.[0] || null;

    // Formulate Question #1 tailored to candidate's verified resume
    let firstQuestionText = '';
    let essentialConcepts = [];

    if (config.interviewType !== 'Technical' && primaryProject) {
      firstQuestionText = `In your project "${primaryProject.title}", you leveraged ${
        primaryProject.technologies?.slice(0, 3).join(', ') || 'modern web technologies'
      }. Could you walk me through the system architecture, how data flows through the application, and the most challenging technical hurdle you personally solved?`;
      essentialConcepts = [
        'Architecture Overview',
        'Data Flow & State Management',
        'Technical Tradeoffs',
        'Problem Solving / Debugging',
      ];
    } else {
      firstQuestionText = `Based on your profile with ${primarySkill}, explain how you manage state, asynchronous concurrency, and performance optimization in production environments.`;
      essentialConcepts = [primarySkill, 'Concurrency & Async Flow', 'Performance Optimization'];
    }

    // Create Interview document in MongoDB
    const newInterview = await Interview.create({
      userId: req.user._id,
      interviewType: 'resume',
      resumeId: resume._id,
      resumeSnapshot: {
        technicalSkills: allSkills,
        projects: conf.projects?.map((p) => ({
          title: p.title,
          technologies: p.technologies,
          description: p.description,
        })),
        estimatedExperienceLevel: conf.estimatedExperienceLevel || 'Junior',
      },
      mode: ['exam', 'voice', 'video'].includes(config.mode) ? config.mode : 'video',
      category: 'Resume-Based Interview',
      difficulty: config.difficulty || 'Intermediate',
      experienceLevel: conf.estimatedExperienceLevel || 'Junior (1–2 years)',
      totalQuestions: qCount,
      durationMinutes: duration,
      status: 'in_progress',
      currentQuestionIndex: 0,
      questions: [
        {
          questionId: 1,
          question: firstQuestionText,
          category: primaryProject ? `Project: ${primaryProject.title}` : primarySkill,
          difficulty: config.difficulty || 'Intermediate',
          type: 'descriptive',
          expectedAnswer:
            'A thorough architectural breakdown detailing the frontend/backend layers, state propagation, data persistence, specific technology choices, and concrete resolution of production challenges.',
          essentialConcepts,
          misconceptions: ['Surface-level answer without concrete implementation details', 'Vague technologies not in resume'],
          userAnswer: '',
          evaluation: null,
        },
      ],
      voiceSession: {
        durationSeconds: 0,
        transcripts: [
          {
            speaker: 'ai',
            text: `Hello ${conf.candidateName || req.user.name || 'Candidate'}, welcome to your INTERVIX AI Personalized Interview based on your verified resume. Let's begin: ${firstQuestionText}`,
            timestamp: new Date(),
          },
        ],
      },
    });

    // Link interview ID into resume
    resume.associatedInterviews.push(newInterview._id);
    await resume.save();

    return res.status(201).json({
      success: true,
      message: 'Interview session created successfully from verified resume profile.',
      data: {
        interviewId: newInterview._id,
        mode: newInterview.mode,
        category: newInterview.category,
        totalQuestions: newInterview.totalQuestions,
        currentQuestion: newInterview.questions[0],
      },
    });
  } catch (error) {
    console.error('[Confirm & Start Interview Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to initialize interview from confirmed resume.',
    });
  }
};

module.exports = {
  uploadResume,
  getLatestResume,
  getResumeById,
  updateConfirmedProfile,
  getPreviewQuestions,
  confirmAndStartInterview,
};
