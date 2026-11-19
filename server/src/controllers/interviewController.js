const Interview = require('../models/Interview');
const aiService = require('../services/aiService');

// @desc    Start a new interview session (Exam, Voice, or Video Call)
// @route   POST /api/interviews/start
// @access  Private
const startInterview = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const {
      mode = 'exam',
      category,
      track,
      difficulty = 'Intermediate',
      experienceLevel = 'Junior (1–2 years)',
      totalQuestions = 5,
    } = req.body || {};

    // Support both `category` and legacy `track`
    const selectedCategory = category || track || 'JavaScript';

    // Normalize difficulty
    let normDiff = difficulty;
    if (normDiff === 'Easy') normDiff = 'Beginner';
    if (normDiff === 'Medium') normDiff = 'Intermediate';
    if (normDiff === 'Hard') normDiff = 'Advanced';

    const qCount = Number(totalQuestions) || 5;

    // Generate Question #1 using AI Service
    const firstQ = await aiService.generateQuestion({
      category: selectedCategory,
      difficulty: normDiff,
      experienceLevel,
      questionNumber: 1,
      totalQuestions: qCount,
      previousQuestions: [],
    });

    // Create session in MongoDB
    const newInterview = await Interview.create({
      userId: req.user._id,
      mode: ['exam', 'voice', 'video'].includes(mode) ? mode : 'exam',
      category: selectedCategory,
      difficulty: normDiff,
      experienceLevel,
      totalQuestions: qCount,
      status: 'in_progress',
      currentQuestionIndex: 0,
      questions: [
        {
          questionId: 1,
          question: firstQ.question,
          category: selectedCategory,
          difficulty: normDiff,
          type: firstQ.type || 'descriptive',
          options: firstQ.options || [],
          expectedAnswer: firstQ.expectedAnswer || '',
          essentialConcepts: firstQ.essentialConcepts || [],
          misconceptions: firstQ.misconceptions || [],
          userAnswer: '',
          evaluation: null,
        },
      ],
      voiceSession: {
        durationSeconds: 0,
        transcripts: [
          {
            speaker: 'ai',
            text: `Hello ${req.user.name || 'Candidate'}, welcome to your INTERVIX AI technical interview for ${selectedCategory}. Let's begin with our first question: ${firstQ.question}`,
            timestamp: new Date(),
          },
        ],
      },
    });

    const greetingSpeech = `Hello ${req.user.name || 'Candidate'}! Welcome to your INTERVIX AI interview for ${selectedCategory}. I'll be your technical interviewer today. Let's begin with our first question: ${firstQ.question}`;

    return res.status(201).json({
      success: true,
      message: 'Interview session initialized.',
      data: {
        interviewId: newInterview._id,
        mode: newInterview.mode,
        category: newInterview.category,
        track: newInterview.category,
        difficulty: newInterview.difficulty,
        experienceLevel: newInterview.experienceLevel,
        totalQuestions: newInterview.totalQuestions,
        currentQuestionIndex: 0,
        currentQuestion: newInterview.questions[0],
        greetingSpeech,
        isLiveAi: Boolean(firstQ.isLiveAi),
      },
      // Backward compatibility aliases
      interviewId: newInterview._id,
      currentQuestion: newInterview.questions[0],
      greetingSpeech,
    });
  } catch (error) {
    console.error('[Start Interview Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to initialize interview session.',
    });
  }
};

// @desc    Submit answer to a question in Exam or Standard Mode
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
        message: 'Interview session not found or unauthorized access.',
      });
    }

    if (interview.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'This interview session has already been completed.',
        data: { finalReport: interview.finalReport },
      });
    }

    const currentQuestion = interview.questions.find((q) => q.questionId === Number(questionId));
    if (!currentQuestion) {
      return res.status(404).json({
        success: false,
        message: `Question #${questionId} not found in this interview session.`,
      });
    }

    // Evaluate answer with strict rubric evaluation engine
    const evaluation = await aiService.evaluateAnswer({
      category: interview.category,
      difficulty: interview.difficulty,
      question: currentQuestion.question,
      userAnswer: userAnswer || '',
      expectedAnswer: currentQuestion.expectedAnswer,
      essentialConcepts: currentQuestion.essentialConcepts,
      misconceptions: currentQuestion.misconceptions,
    });

    // Save answer and evaluation into MongoDB
    currentQuestion.userAnswer = (userAnswer || '').trim();
    currentQuestion.evaluation = evaluation;
    currentQuestion.answeredAt = new Date();

    const answeredCount = interview.questions.filter((q) => q.userAnswer && q.evaluation).length;

    // Check if more questions remain
    if (answeredCount < interview.totalQuestions) {
      const prevQuestions = interview.questions.map((q) => q.question);
      const nextQNum = answeredCount + 1;

      const nextQ = await aiService.generateQuestion({
        category: interview.category,
        difficulty: interview.difficulty,
        experienceLevel: interview.experienceLevel,
        questionNumber: nextQNum,
        totalQuestions: interview.totalQuestions,
        previousQuestions: prevQuestions,
      });

      interview.questions.push({
        questionId: nextQNum,
        question: nextQ.question,
        category: interview.category,
        difficulty: interview.difficulty,
        type: nextQ.type || 'descriptive',
        options: nextQ.options || [],
        expectedAnswer: nextQ.expectedAnswer || '',
        essentialConcepts: nextQ.essentialConcepts || [],
        misconceptions: nextQ.misconceptions || [],
        userAnswer: '',
        evaluation: null,
      });

      interview.currentQuestionIndex = nextQNum - 1;
      await interview.save();

      return res.status(200).json({
        success: true,
        message: 'Answer evaluated.',
        data: {
          isCompleted: false,
          evaluation,
          nextQuestion: interview.questions[interview.questions.length - 1],
          progress: {
            current: nextQNum,
            total: interview.totalQuestions,
            percent: Math.round(((nextQNum - 1) / interview.totalQuestions) * 100),
          },
        },
        // Backward compatibility
        isCompleted: false,
        evaluation,
        nextQuestion: interview.questions[interview.questions.length - 1],
        progress: {
          current: nextQNum,
          total: interview.totalQuestions,
          percent: Math.round(((nextQNum - 1) / interview.totalQuestions) * 100),
        },
      });
    } else {
      // All questions answered -> compile report
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
        message: 'Interview completed successfully.',
        data: {
          isCompleted: true,
          evaluation,
          finalReport,
          interviewId: interview._id,
        },
        // Backward compatibility
        isCompleted: true,
        evaluation,
        finalReport,
        interviewId: interview._id,
      });
    }
  } catch (error) {
    console.error('[Submit Answer Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to evaluate answer.',
    });
  }
};

// @desc    Process a turn in AI Voice / Video Call Interview
// @route   POST /api/interviews/:id/video-turn
// @access  Private
const processVideoTurn = async (req, res) => {
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

    const currentQuestion = interview.questions.find((q) => q.questionId === Number(questionId));
    if (!currentQuestion) {
      return res.status(404).json({
        success: false,
        message: `Question #${questionId} not found in this session.`,
      });
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
    currentQuestion.answeredAt = new Date();

    // Add user answer to voice transcript
    interview.voiceSession.transcripts.push({
      speaker: 'user',
      text: (userAnswer || '').trim() || '(No response audible)',
      timestamp: new Date(),
    });

    const answeredCount = interview.questions.filter((q) => q.userAnswer && q.evaluation).length;
    const isFinal = answeredCount >= interview.totalQuestions;

    let nextQ = null;
    if (!isFinal) {
      const prevQuestions = interview.questions.map((q) => q.question);
      const nextQNum = answeredCount + 1;

      nextQ = await aiService.generateQuestion({
        category: interview.category,
        difficulty: interview.difficulty,
        experienceLevel: interview.experienceLevel,
        questionNumber: nextQNum,
        totalQuestions: interview.totalQuestions,
        previousQuestions: prevQuestions,
      });

      interview.questions.push({
        questionId: nextQNum,
        question: nextQ.question,
        category: interview.category,
        difficulty: interview.difficulty,
        type: nextQ.type || 'descriptive',
        options: nextQ.options || [],
        expectedAnswer: nextQ.expectedAnswer || '',
        essentialConcepts: nextQ.essentialConcepts || [],
        misconceptions: nextQ.misconceptions || [],
        userAnswer: '',
        evaluation: null,
      });

      interview.currentQuestionIndex = nextQNum - 1;
    }

    // Generate natural spoken conversation feedback from AI interviewer
    const voiceTurn = await aiService.generateConversationalVoiceTurn({
      category: interview.category,
      candidateName: req.user.name || 'Candidate',
      question: currentQuestion.question,
      userAnswer: userAnswer || '',
      evaluation,
      nextQuestion: nextQ,
      isFinalQuestion: isFinal,
    });

    // Add AI spoken response to voice transcript
    interview.voiceSession.transcripts.push({
      speaker: 'ai',
      text: voiceTurn.spokenScript,
      timestamp: new Date(),
    });

    let finalReport = null;
    if (isFinal) {
      finalReport = await aiService.generateFinalReport({
        category: interview.category,
        difficulty: interview.difficulty,
        experienceLevel: interview.experienceLevel,
        questionsWithEvaluations: interview.questions,
      });
      interview.status = 'completed';
      interview.finalReport = finalReport;
    }

    await interview.save();

    return res.status(200).json({
      success: true,
      message: 'Video turn processed.',
      data: {
        isCompleted: isFinal,
        evaluation,
        spokenScript: voiceTurn.spokenScript,
        conversationalFeedback: voiceTurn.conversationalFeedback,
        nextQuestion: nextQ ? interview.questions[interview.questions.length - 1] : null,
        finalReport,
        interviewId: interview._id,
      },
    });
  } catch (error) {
    console.error('[Video Turn Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to process video interview turn.',
    });
  }
};

// @desc    Get detailed report of a specific interview
// @route   GET /api/interviews/:id
// @access  Private
const getInterviewById = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const interview = await Interview.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview record not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: { interview },
      interview,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch interview details.',
    });
  }
};

// @desc    Get all interview history for the authenticated user
// @route   GET /api/interviews/history
// @access  Private
const getUserInterviews = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const history = await Interview.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select('-questions.evaluation.correctExplanation -questions.evaluation.suggestedAnswer');

    return res.status(200).json({
      success: true,
      data: { history, count: history.length },
      count: history.length,
      history,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch interview history.',
    });
  }
};

// @desc    Get performance analytics across all interviews
// @route   GET /api/interviews/analytics
// @access  Private
const getInterviewAnalytics = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const interviews = await Interview.find({
      userId: req.user._id,
      status: 'completed',
    });

    if (interviews.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          totalCompleted: 0,
          averageScore: 0,
          highestScore: 0,
          trackBreakdown: {},
          recentTrend: [],
        },
      });
    }

    const scores = interviews.map((i) => i.finalReport?.overallScore || 0);
    const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const highestScore = Math.max(...scores);

    const trackBreakdown = {};
    interviews.forEach((i) => {
      const cat = i.category || i.track || 'General';
      if (!trackBreakdown[cat]) {
        trackBreakdown[cat] = { count: 0, scores: [] };
      }
      trackBreakdown[cat].count += 1;
      trackBreakdown[cat].scores.push(i.finalReport?.overallScore || 0);
    });

    const recentTrend = interviews.slice(-5).map((i) => ({
      date: i.createdAt,
      category: i.category,
      score: i.finalReport?.overallScore || 0,
    }));

    return res.status(200).json({
      success: true,
      data: {
        totalCompleted: interviews.length,
        averageScore,
        highestScore,
        trackBreakdown,
        recentTrend,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch analytics.',
    });
  }
};

module.exports = {
  startInterview,
  submitAnswer,
  processVideoTurn,
  getInterviewById,
  getUserInterviews,
  getInterviewAnalytics,
};
