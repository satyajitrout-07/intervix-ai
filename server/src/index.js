const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Middlewares
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Default JSON content-type header middleware
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/interviews', require('./routes/interviewRoutes'));

// Health & Status check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim());

  return res.status(200).json({
    status: 'healthy',
    service: 'INTERVIX AI Backend Engine',
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      host: mongoose.connection.host || '127.0.0.1',
      name: mongoose.connection.name || 'intervix_ai',
    },
    llmIntegration: {
      geminiConfigured: hasGeminiKey,
      openAiConfigured: hasOpenAIKey,
      mode: hasGeminiKey || hasOpenAIKey ? 'live_generative_llm' : 'curated_industry_evaluator',
      note: hasGeminiKey || hasOpenAIKey
        ? 'Active LLM API ready.'
        : 'To enable dynamic live Gemini generation, add GEMINI_API_KEY to server/.env',
    },
  });
});

// 404 Route Handler - Always returns valid JSON
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.originalUrl} not found on INTERVIX AI server.`,
  });
});

// Central Error Handler - Always returns valid JSON
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start Express Server
const server = app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 INTERVIX AI Server running at http://localhost:${PORT}`);
  console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`======================================================\n`);
});

module.exports = app;
