const Interview = require('../models/Interview');
const Resume = require('../models/Resume');
const aiService = require('../services/aiService');
const { transcribeAudioBuffer } = require('../services/transcriptionService');

/**
 * Collect all previously asked question texts for this user across all past interviews
 */
async function getUserPastQuestions(userId) {
  try {
    const pastInterviews = await Interview.find({ userId }).select('questions.question askedQuestionTexts');
    const pastSet = new Set();
    pastInterviews.forEach((doc) => {
      if (Array.isArray(doc.askedQuestionTexts)) {
        doc.askedQuestionTexts.forEach((q) => pastSet.add(q));
      }
      if (Array.isArray(doc.questions)) {
        doc.questions.forEach((item) => {
          if (item.question) pastSet.add(item.question);
        });
      }
    });
    return Array.from(pastSet);
  } catch (err) {
    console.warn('[Get Past Questions Warning]:', err.message);
    return [];
  }
}

// @desc    Start a new interview session (Exam, Voice, or Video Call)
// @route   POST /api/interviews/start
// @access  Private
const startInterview = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const {
      mode = 'video',
      interviewType = 'general',
      category,
      track,
      difficulty = 'Intermediate',
      experienceLevel = 'Junior (1–2 years)',
      totalQuestions = 5,
      durationMinutes = 15,
      resumeId = null,
    } = req.body || {};

    const selectedCategory = category || track || 'JavaScript';

    let normDiff = difficulty;
    if (normDiff === 'Easy') normDiff = 'Beginner';
    if (normDiff === 'Medium') normDiff = 'Intermediate';
    if (normDiff === 'Hard') normDiff = 'Advanced';

    const duration = [15, 30, 45].includes(Number(durationMinutes)) ? Number(durationMinutes) : 15;
    const qCount = duration === 45 ? 15 : duration === 30 ? 10 : Number(totalQuestions) || 5;

    // Fetch past asked questions to prevent repetitions across interviews
    const pastQuestions = await getUserPastQuestions(req.user._id);

    // If linked to a resume, pull snapshot
    let resumeSnapshot = null;
    if (resumeId) {
      const resumeDoc = await Resume.findById(resumeId);
      if (resumeDoc) {
        resumeSnapshot = {
          technicalSkills: resumeDoc.confirmedData?.technicalSkills || resumeDoc.parsedData?.technicalSkills || [],
          projects: resumeDoc.confirmedData?.projects || resumeDoc.parsedData?.projects || [],
          estimatedExperienceLevel: resumeDoc.confirmedData?.estimatedExperienceLevel || 'Junior',
        };
      }
    }

    // Generate Question #1 using deduplication
    const firstQ = await aiService.generateQuestion({
      category: selectedCategory,
      difficulty: normDiff,
      experienceLevel,
      questionNumber: 1,
      totalQuestions: qCount,
      previousQuestions: [],
      pastAskedQuestions: pastQuestions,
      resumeSnapshot,
      interviewType,
    });

    const now = new Date();
    const deadline = new Date(now.getTime() + duration * 60 * 1000);

    // Create session in MongoDB
    const newInterview = await Interview.create({
      userId: req.user._id,
      interviewType: ['general', 'resume'].includes(interviewType) ? interviewType : 'general',
      resumeId: resumeId || null,
      resumeSnapshot,
      mode: ['exam', 'voice', 'video'].includes(mode) ? mode : 'video',
      category: selectedCategory,
      difficulty: normDiff,
      experienceLevel,
      totalQuestions: qCount,
      durationMinutes: duration,
      startTime: now,
      deadline,
      status: 'in_progress',
      currentQuestionIndex: 0,
      askedQuestionTexts: [firstQ.question],
      questions: [
        {
          questionId: 1,
          question: firstQ.question,
          category: firstQ.category || selectedCategory,
          difficulty: normDiff,
          type: firstQ.type || 'descriptive',
          options: firstQ.options || [],
          expectedAnswer: firstQ.expectedAnswer || '',
          essentialConcepts: firstQ.essentialConcepts || [],
          misconceptions: firstQ.misconceptions || [],
          userAnswer: '',
          evaluation: null,
          status: 'unanswered',
        },
      ],
      voiceSession: {
        durationSeconds: 0,
        transcripts: [
          {
            speaker: 'ai',
            text: `Hello ${req.user.name || 'Candidate'}, welcome to your INTERVIX AI technical interview. Let's begin: ${firstQ.question}`,
            timestamp: now,
          },
        ],
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Interview session initialized.',
      data: {
        interviewId: newInterview._id,
        mode: newInterview.mode,
        category: newInterview.category,
        difficulty: newInterview.difficulty,
        totalQuestions: newInterview.totalQuestions,
        durationMinutes: newInterview.durationMinutes,
        startTime: newInterview.startTime,
        deadline: newInterview.deadline,
        remainingSeconds: duration * 60,
        currentQuestionIndex: 0,
        currentQuestion: newInterview.questions[0],
      },
    });
  } catch (error) {
    console.error('[Start Interview Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to initialize interview session.',
    });
  }
};

// @desc    Get interview session by ID (Restores state on browser refresh)
// @route   GET /api/interviews/:id
// @access  Private
const getInterviewById = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const { id } = req.params;
    const interview = await Interview.findOne({ _id: id, userId: req.user._id });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview session not found.',
      });
    }

    // Calculate real remaining time based on persisted deadline
    let remainingSeconds = 0;
    if (interview.deadline) {
      const diffMs = new Date(interview.deadline).getTime() - Date.now();
      remainingSeconds = Math.max(0, Math.floor(diffMs / 1000));
    }

    // If deadline has expired and interview is still in_progress, automatically complete it
    if (remainingSeconds === 0 && interview.status === 'in_progress' && interview.deadline) {
      const finalReport = await aiService.generateFinalReport({
        category: interview.category,
        difficulty: interview.difficulty,
        experienceLevel: interview.experienceLevel,
        questionsWithEvaluations: interview.questions,
      });
      interview.status = 'completed';
      interview.finalReport = finalReport;
      await interview.save();
    }

    const currentIdx = interview.currentQuestionIndex || 0;
    const currentQ = interview.questions[currentIdx] || interview.questions[interview.questions.length - 1];

    return res.status(200).json({
      success: true,
      data: {
        interview,
        currentQuestion: currentQ,
        currentQuestionIndex: currentIdx,
        remainingSeconds,
        isCompleted: interview.status === 'completed',
      },
      // Backward compatibility fields
      interview,
    });
  } catch (error) {
    console.error('[Get Interview Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching interview details.',
    });
  }
};

// @desc    Submit candidate answer to current question
// @route   POST /api/interviews/:id/answer
// @access  Private
const submitAnswer = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const { id } = req.params;
    const { questionId, userAnswer } = req.body || {};

    const interview = await Interview.findOne({ _id: id, userId: req.user._id });
    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview session not found.',
      });
    }

    if (interview.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'This interview session has already ended.',
        data: { finalReport: interview.finalReport },
      });
    }

    const currentQuestion = interview.questions.find((q) => q.questionId === Number(questionId));
    if (!currentQuestion) {
      return res.status(404).json({
        success: false,
        message: `Question #${questionId} not found.`,
      });
    }

    // Evaluate answer with strict rubric
    const evaluation = await aiService.evaluateAnswer({
      category: interview.category,
      difficulty: interview.difficulty,
      question: currentQuestion.question,
      userAnswer: userAnswer || '',
      expectedAnswer: currentQuestion.expectedAnswer,
      essentialConcepts: currentQuestion.essentialConcepts,
      misconceptions: currentQuestion.misconceptions,
    });

    currentQuestion.userAnswer = (userAnswer || '').trim();
    currentQuestion.evaluation = evaluation;
    currentQuestion.status = 'answered';
    currentQuestion.answeredAt = new Date();

    // Record in voice transcripts
    interview.voiceSession.transcripts.push({
      speaker: 'user',
      text: (userAnswer || '').trim() || '(No audible answer)',
      timestamp: new Date(),
    });

    const isFinal = currentQuestion.questionId >= interview.totalQuestions;

    await interview.save();

    return res.status(200).json({
      success: true,
      message: 'Answer evaluated successfully.',
      data: {
        evaluation,
        isCompleted: isFinal,
        canProceed: true,
        currentQuestion,
      },
    });
  } catch (error) {
    console.error('[Submit Answer Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to evaluate answer.',
    });
  }
};

// @desc    Process a turn in video interview mode
// @route   POST /api/interviews/:id/video-turn
// @access  Private
const processVideoTurn = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const { id } = req.params;
    const { questionId, userAnswer } = req.body || {};

    const interview = await Interview.findOne({ _id: id, userId: req.user._id });
    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview session not found.' });
    }

    const currentQuestion = interview.questions.find((q) => q.questionId === Number(questionId));
    if (!currentQuestion) {
      return res.status(404).json({ success: false, message: `Question #${questionId} not found.` });
    }

    // Evaluate candidate spoken answer strictly
    const evaluation = await aiService.evaluateAnswer({
      category: interview.category,
      difficulty: interview.difficulty,
      question: currentQuestion.question,
      userAnswer: userAnswer || '',
      expectedAnswer: currentQuestion.expectedAnswer,
      essentialConcepts: currentQuestion.essentialConcepts,
      misconceptions: currentQuestion.misconceptions,
    });

    currentQuestion.userAnswer = (userAnswer || '').trim();
    currentQuestion.evaluation = evaluation;
    currentQuestion.status = 'answered';
    currentQuestion.answeredAt = new Date();

    interview.voiceSession.transcripts.push({
      speaker: 'user',
      text: (userAnswer || '').trim() || '(No audible answer)',
      timestamp: new Date(),
    });

    const isFinal = currentQuestion.questionId >= interview.totalQuestions;

    // Generate conversational spoken feedback from AI Elena
    const voiceTurn = await aiService.generateConversationalVoiceTurn({
      category: interview.category,
      candidateName: req.user.name || 'Candidate',
      question: currentQuestion.question,
      userAnswer: userAnswer || '',
      evaluation,
      nextQuestion: null,
      isFinalQuestion: isFinal,
    });

    interview.voiceSession.transcripts.push({
      speaker: 'ai',
      text: voiceTurn.spokenScript,
      timestamp: new Date(),
    });

    await interview.save();

    return res.status(200).json({
      success: true,
      message: 'Video turn processed.',
      data: {
        isCompleted: isFinal,
        evaluation,
        spokenScript: voiceTurn.spokenScript,
        conversationalFeedback: voiceTurn.conversationalFeedback,
        canProceed: true,
        currentQuestion,
      },
    });
  } catch (error) {
    console.error('[Process Video Turn Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to process turn.',
    });
  }
};

// @desc    Advance to the next question (Button triggered)
// @route   POST /api/interviews/:id/next-question
// @access  Private
const nextQuestion = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const { id } = req.params;
    const interview = await Interview.findOne({ _id: id, userId: req.user._id });

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview session not found.' });
    }

    const currentIdx = interview.currentQuestionIndex || 0;
    const nextIdx = currentIdx + 1;

    // If final question reached, complete the interview
    if (nextIdx >= interview.totalQuestions) {
      const finalReport = await aiService.generateFinalReport({
        category: interview.category,
        difficulty: interview.difficulty,
        experienceLevel: interview.experienceLevel,
        questionsWithEvaluations: interview.questions,
      });

      interview.status = 'completed';
      interview.finalReport = finalReport;
      await interview.save();

      return res.status(200).json({
        success: true,
        message: 'Interview completed.',
        data: {
          isCompleted: true,
          finalReport,
        },
      });
    }

    // Check if next question already exists in array
    let nextQ = interview.questions[nextIdx];

    if (!nextQ) {
      const pastQuestions = await getUserPastQuestions(req.user._id);
      const currentSessionQuestions = interview.questions.map((q) => q.question);

      const generated = await aiService.generateQuestion({
        category: interview.category,
        difficulty: interview.difficulty,
        experienceLevel: interview.experienceLevel,
        questionNumber: nextIdx + 1,
        totalQuestions: interview.totalQuestions,
        previousQuestions: currentSessionQuestions,
        pastAskedQuestions: pastQuestions,
        resumeSnapshot: interview.resumeSnapshot,
        interviewType: interview.interviewType,
      });

      interview.questions.push({
        questionId: nextIdx + 1,
        question: generated.question,
        category: generated.category || interview.category,
        difficulty: interview.difficulty,
        type: generated.type || 'descriptive',
        options: generated.options || [],
        expectedAnswer: generated.expectedAnswer || '',
        essentialConcepts: generated.essentialConcepts || [],
        misconceptions: generated.misconceptions || [],
        userAnswer: '',
        evaluation: null,
        status: 'unanswered',
      });

      interview.askedQuestionTexts.push(generated.question);
      nextQ = interview.questions[interview.questions.length - 1];
    }

    interview.currentQuestionIndex = nextIdx;
    await interview.save();

    return res.status(200).json({
      success: true,
      data: {
        isCompleted: false,
        currentQuestionIndex: nextIdx,
        nextQuestion: nextQ,
        isFinal: nextIdx + 1 >= interview.totalQuestions,
      },
    });
  } catch (error) {
    console.error('[Next Question Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error loading next question.',
    });
  }
};

// @desc    Skip the current question (Candidate requested)
// @route   POST /api/interviews/:id/skip-question
// @access  Private
const skipQuestion = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const { id } = req.params;
    const interview = await Interview.findOne({ _id: id, userId: req.user._id });

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview session not found.' });
    }

    const currentIdx = interview.currentQuestionIndex || 0;
    const currentQ = interview.questions[currentIdx];

    if (currentQ) {
      currentQ.userAnswer = '[Skipped by candidate]';
      currentQ.isSkipped = true;
      currentQ.status = 'skipped';
      currentQ.evaluation = {
        status: 'incorrect',
        score: 0,
        maxScore: 100,
        scoreBreakdown: { technicalAccuracy: 0, conceptUnderstanding: 0, completeness: 0, clarity: 0 },
        feedback: 'Question was skipped by candidate.',
        referenceAnswer: currentQ.expectedAnswer || '',
        missingConcepts: currentQ.essentialConcepts || [],
        incorrectStatements: [],
        strengths: [],
        weaknesses: ['Question skipped without answer.'],
        improvementTips: ['Attempt all questions; partial credit is given for outlining concepts.'],
      };
      currentQ.answeredAt = new Date();
    }

    interview.voiceSession.transcripts.push({
      speaker: 'user',
      text: `[Skipped Question #${currentQ ? currentQ.questionId : currentIdx + 1}]`,
      timestamp: new Date(),
    });

    await interview.save();

    // Advance to next
    return nextQuestion(req, res);
  } catch (error) {
    console.error('[Skip Question Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error skipping question.',
    });
  }
};

// @desc    Transcribe candidate audio file fallback
// @route   POST /api/interviews/transcribe & POST /api/interviews/:id/transcribe
// @access  Private
const transcribeAudio = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No audio file provided in request field "audioFile".',
      });
    }

    const { buffer, mimetype, size } = req.file;

    if (!buffer || buffer.length === 0 || size === 0) {
      return res.status(400).json({
        success: false,
        message: 'Empty audio buffer received. Please verify microphone recording.',
      });
    }

    const result = await transcribeAudioBuffer(buffer, mimetype);

    return res.status(200).json({
      success: true,
      data: {
        transcript: result.transcript || '',
        provider: result.provider,
        sttSuccess: result.success,
        message: result.message || (result.transcript ? 'Transcription complete.' : 'No speech detected.'),
      },
    });
  } catch (error) {
    console.error('[Transcription Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Audio transcription failed.',
    });
  }
};

// @desc    Manually or automatically finish interview and compile final report
// @route   POST /api/interviews/:id/finish
// @access  Private
const finishInterview = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const { id } = req.params;
    const interview = await Interview.findOne({ _id: id, userId: req.user._id });

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview session not found.' });
    }

    const finalReport = await aiService.generateFinalReport({
      category: interview.category,
      difficulty: interview.difficulty,
      experienceLevel: interview.experienceLevel,
      questionsWithEvaluations: interview.questions,
    });

    interview.status = 'completed';
    interview.finalReport = finalReport;
    await interview.save();

    return res.status(200).json({
      success: true,
      message: 'Interview concluded successfully.',
      data: {
        finalReport,
        interviewId: interview._id,
      },
    });
  } catch (error) {
    console.error('[Finish Interview Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to compile final report.',
    });
  }
};

// @desc    Get all interviews for current logged in candidate
// @route   GET /api/interviews/history
// @access  Private
const getUserInterviews = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const interviews = await Interview.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select('-voiceSession.transcripts');

    return res.status(200).json({
      success: true,
      data: {
        history: interviews,
        total: interviews.length,
      },
    });
  } catch (error) {
    console.error('[Get User Interviews Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve past interview sessions.',
    });
  }
};

// @desc    Get aggregate analytics
// @route   GET /api/interviews/analytics
// @access  Private
const getInterviewAnalytics = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const interviews = await Interview.find({ userId: req.user._id, status: 'completed' });
    const scores = interviews.map((i) => i.finalReport?.overallScore || 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalCompleted: interviews.length,
        averageScore: avgScore,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching analytics.',
    });
  }
};

module.exports = {
  startInterview,
  getInterviewById,
  submitAnswer,
  processVideoTurn,
  nextQuestion,
  skipQuestion,
  finishInterview,
  transcribeAudio,
  getUserInterviews,
  getInterviewAnalytics,
};
