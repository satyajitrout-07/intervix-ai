const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: { type: String, default: 'Project' },
  description: { type: String, default: '' },
  technologies: [{ type: String }],
  role: { type: String, default: 'Developer' },
  duration: { type: String, default: '' },
  suggestedTopics: [{ type: String }],
});

const experienceSchema = new mongoose.Schema({
  role: { type: String, default: '' },
  company: { type: String, default: '' },
  duration: { type: String, default: '' },
  responsibilities: [{ type: String }],
});

const educationSchema = new mongoose.Schema({
  degree: { type: String, default: '' },
  branch: { type: String, default: '' },
  institution: { type: String, default: '' },
  year: { type: String, default: '' },
  gpa: { type: String, default: '' },
});

const categorizedSkillsSchema = new mongoose.Schema(
  {
    frontend: [{ type: String }],
    backend: [{ type: String }],
    database: [{ type: String }],
    languages: [{ type: String }],
    tools: [{ type: String }],
  },
  { _id: false }
);

const interviewConfigSchema = new mongoose.Schema(
  {
    difficulty: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Intermediate',
    },
    durationMinutes: {
      type: Number,
      enum: [15, 30, 45],
      default: 15,
    },
    interviewType: {
      type: String,
      enum: ['Technical', 'Project-Based', 'Mixed'],
      default: 'Mixed',
    },
    language: {
      type: String,
      enum: ['English', 'Hindi'],
      default: 'English',
    },
    mode: {
      type: String,
      enum: ['video', 'exam'],
      default: 'video',
    },
  },
  { _id: false }
);

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      enum: ['pdf', 'docx'],
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    rawText: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['uploaded', 'analyzed', 'confirmed'],
      default: 'analyzed',
    },
    parsedData: {
      candidateName: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      summary: { type: String, default: '' },
      estimatedExperienceLevel: {
        type: String,
        enum: ['Fresher', 'Junior', 'Intermediate', 'Advanced'],
        default: 'Junior',
      },
      yearsOfExperience: {
        type: Number,
        default: 1,
      },
      categorizedSkills: {
        type: categorizedSkillsSchema,
        default: () => ({ frontend: [], backend: [], database: [], languages: [], tools: [] }),
      },
      technicalSkills: [{ type: String }],
      softSkills: [{ type: String }],
      projects: [projectSchema],
      experience: [experienceSchema],
      education: [educationSchema],
      certifications: [{ type: String }],
    },
    confirmedData: {
      candidateName: { type: String },
      education: { type: String },
      estimatedExperienceLevel: {
        type: String,
        enum: ['Fresher', 'Junior', 'Intermediate', 'Advanced'],
      },
      summary: { type: String },
      categorizedSkills: {
        type: categorizedSkillsSchema,
        default: () => ({ frontend: [], backend: [], database: [], languages: [], tools: [] }),
      },
      projects: [projectSchema],
      interviewConfig: {
        type: interviewConfigSchema,
        default: () => ({
          difficulty: 'Intermediate',
          durationMinutes: 15,
          interviewType: 'Mixed',
          language: 'English',
          mode: 'video',
        }),
      },
    },
    associatedInterviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Interview',
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Resume = mongoose.model('Resume', resumeSchema);
module.exports = Resume;
