const mongoose = require('mongoose');

const evaluationSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['correct', 'partially_correct', 'incorrect', 'needs_clarification'],
    default: 'incorrect',
  },
  result: {
    type: String,
    enum: ['correct', 'partially_correct', 'incorrect', 'needs_clarification'],
    default: 'incorrect',
  },
  score: { type: Number, required: true, min: 0, max: 100, default: 0 },
  maxScore: { type: Number, default: 100 },
  accuracy: { type: mongoose.Schema.Types.Mixed, default: 'Moderate' },
  technicalAccuracy: { type: Number, min: 0, max: 100, default: 0 },
  technicalKnowledge: { type: String, default: 'Moderate' },
  conceptUnderstanding: { type: Number, min: 0, max: 100, default: 0 },
  completeness: { type: Number, min: 0, max: 100, default: 0 },
  clarity: { type: Number, min: 0, max: 100, default: 0 },
  feedback: { type: String, default: '' },
  strengths: [{ type: String }],
  mistakes: [{ type: String }],
  incorrectStatements: [{ type: String }],
  correctExplanation: { type: String, default: '' },
  explanation: { type: String, default: '' },
  improvementTips: [{ type: String }],
  suggestedAnswer: { type: String, default: '' },
  referenceAnswer: { type: String, default: '' },
  spokenResponse: { type: String, default: '' },
  missingConcepts: [{ type: String }],
  weaknesses: [{ type: String }],
});

const questionItemSchema = new mongoose.Schema({
  questionId: { type: Number, required: true },
  question: { type: String, required: true },
  category: { type: String, default: 'General' },
  difficulty: { type: String, default: 'Intermediate' },
  type: { type: String, enum: ['descriptive', 'mcq'], default: 'descriptive' },
  options: [{ type: String }],
  correctOptionIndex: { type: Number },
  expectedAnswer: { type: String, default: '' },
  essentialConcepts: [{ type: String }],
  supportingConcepts: [{ type: String }],
  misconceptions: [{ type: String }],
  userAnswer: { type: String, default: '' },
  selectedOptionIndex: { type: Number },
  isFollowUp: { type: Boolean, default: false },
  isSkipped: { type: Boolean, default: false },
  status: { type: String, enum: ['unanswered', 'answered', 'skipped'], default: 'unanswered' },
  evaluation: { type: evaluationSchema, default: null },
  answeredAt: { type: Date },
});

const interviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    interviewType: {
      type: String,
      enum: ['general', 'resume'],
      default: 'general',
      index: true,
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      default: null,
    },
    resumeSnapshot: {
      technicalSkills: [{ type: String }],
      projects: [
        {
          title: { type: String },
          technologies: [{ type: String }],
          description: { type: String },
        },
      ],
      estimatedExperienceLevel: { type: String },
    },
    durationMinutes: {
      type: Number,
      enum: [15, 30, 45],
      default: 15,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    deadline: {
      type: Date,
    },
    askedQuestionTexts: [{ type: String }],
    mode: {
      type: String,
      enum: ['exam', 'voice', 'video'],
      default: 'exam',
      required: true,
    },
    category: {
      type: String,
      required: true,
      default: 'JavaScript',
    },
    difficulty: {
      type: String,
      required: true,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Easy', 'Medium', 'Hard'],
      default: 'Intermediate',
    },
    experienceLevel: {
      type: String,
      default: 'Junior (1–2 years)',
    },
    totalQuestions: {
      type: Number,
      required: true,
      min: 1,
      max: 30,
      default: 5,
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'abandoned'],
      default: 'in_progress',
    },
    currentQuestionIndex: {
      type: Number,
      default: 0,
    },
    questions: [questionItemSchema],
    voiceSession: {
      durationSeconds: { type: Number, default: 0 },
      transcripts: [
        {
          speaker: { type: String, enum: ['ai', 'user', 'system'] },
          text: { type: String },
          timestamp: { type: Date, default: Date.now },
        },
      ],
    },
    finalReport: {
      overallScore: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
      totalQuestions: { type: Number, default: 0 },
      correctCount: { type: Number, default: 0 },
      partiallyCorrectCount: { type: Number, default: 0 },
      incorrectCount: { type: Number, default: 0 },
      technicalAccuracyScore: { type: Number, default: 0 },
      communicationScore: { type: Number, default: 0 },
      strongAreas: [{ type: String }],
      weakAreas: [{ type: String }],
      missingConcepts: [{ type: String }],
      suggestedTopics: [{ type: String }],
      personalizedRecommendations: [{ type: String }],
      summary: { type: String, default: '' },
      // Backward compatibility aliases
      correctAnswers: { type: Number, default: 0 },
      partiallyCorrect: { type: Number, default: 0 },
      needsImprovement: { type: Number, default: 0 },
      categoryPerformance: [
        {
          category: { type: String },
          score: { type: Number },
        },
      ],
      strongestSkills: [{ type: String }],
      weakestSkills: [{ type: String }],
      personalizedRoadmap: [{ type: String }],
      summaryFeedback: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

// Helpful virtual to support legacy `track` property seamlessly
interviewSchema.virtual('track').get(function () {
  return this.category;
});
interviewSchema.set('toJSON', { virtuals: true });
interviewSchema.set('toObject', { virtuals: true });

const Interview = mongoose.model('Interview', interviewSchema);
module.exports = Interview;
