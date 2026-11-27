const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const {
  securityHeaders,
  sanitizeNoSql,
  apiLimiter,
  authLimiter,
} = require('./middleware/security');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// 1. Security HTTP Headers
app.use(securityHeaders);

// 2. CORS configuration (allows frontend on localhost / 127.0.0.1, Render, Vercel, Netlify, or configured CLIENT_URL)
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);

      // Explicit whitelist match
      if (allowedOrigins.includes(origin)) return callback(null, true);

      // Cloud deployment platforms match (*.onrender.com, *.vercel.app, *.netlify.app)
      if (
        origin.endsWith('.onrender.com') ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.netlify.app')
      ) {
        return callback(null, true);
      }

      return callback(new Error('CORS policy: Not an authorized origin.'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  })
);

// 3. Request body parsers with strict size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. NoSQL / MongoDB Operator Injection Sanitization
app.use(sanitizeNoSql);

// 5. Default JSON content-type header middleware
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// 6. Global API Rate Limiter
app.use('/api', apiLimiter);

// 7. Strict Auth Rate Limiter for Login & Registration
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// 8. API Routes (mounts both singular and plural interview paths for 100% compatibility)
const interviewRoutes = require('./routes/interviewRoutes');
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/interviews', interviewRoutes);
app.use('/api/interview', interviewRoutes); // Singular alias
app.use('/api/resume', require('./routes/resumeRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

// 9. Health & Status check endpoint (never leaks secrets or database credentials)
const startTime = Date.now();
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim());

  let activeProvider = 'built-in semantic evaluator';
  let activeModel = 'rubric-engine-v2';
  if (hasGeminiKey) {
    activeProvider = 'Google Gemini';
    activeModel = 'gemini-1.5-flash';
  } else if (hasOpenAIKey) {
    activeProvider = 'OpenAI';
    activeModel = 'gpt-4o-mini';
  }

  return res.status(200).json({
    status: 'healthy',
    service: 'INTERVIX AI Backend Engine',
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      name: mongoose.connection.name || 'intervix_ai',
    },
    llmIntegration: {
      geminiConfigured: hasGeminiKey,
      openAiConfigured: hasOpenAIKey,
      provider: activeProvider,
      model: activeModel,
      mode: hasGeminiKey || hasOpenAIKey ? 'live_generative_llm' : 'curated_industry_evaluator',
      note: hasGeminiKey
        ? 'Google Gemini API is configured and ready for live question generation and answer evaluation.'
        : hasOpenAIKey
        ? 'OpenAI API is configured and ready for live generation.'
        : 'To enable dynamic live Gemini generation, add your GEMINI_API_KEY in server/.env',
    },
  });
});

// 10. 404 Route Handler - Always returns clean JSON
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.originalUrl} not found on INTERVIX AI server.`,
  });
});

// 11. Central Error Handler - Never leaks stack traces in production
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err.stack || err.message);
  const isDev = process.env.NODE_ENV !== 'production';

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(isDev && { errorDetails: err.message }),
  });
});

// 12. Start Express Server
let server = null;
if (require.main === module || !process.env.TEST_RUNNER) {
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`🚀 INTERVIX AI Server running at http://localhost:${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🔒 Security headers, NoSQL filter & rate limits active.`);
    console.log(`======================================================\n`);
  });
}

// 13. Graceful Shutdown
function gracefulShutdown(signal) {
  console.log(`\n[Server]: Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    try {
      await mongoose.connection.close(false);
      console.log('[Server]: MongoDB connection closed successfully.');
      process.exit(0);
    } catch (dbErr) {
      console.error('[Server Error]: Error during DB shutdown:', dbErr.message);
      process.exit(1);
    }
  });

  // Force exit after 10s if hung
  setTimeout(() => {
    console.error('[Server]: Could not close connections in time. Forcefully terminating.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Process-level uncaught exception handling
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL UNCAUGHT EXCEPTION]:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.warn('[UNHANDLED PROMISE REJECTION]:', reason);
});

module.exports = app;
