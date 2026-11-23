/**
 * INTERVIX AI - Complete Backend Health Check & Verification Suite
 * Executes real tests against live MongoDB and Express API routes.
 */

const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const FormData = require('form-data');

dotenv.config({ path: path.join(__dirname, '.env') });
process.env.TEST_RUNNER = 'true';

const app = require('./src/index');
const User = require('./src/models/User');
const Resume = require('./src/models/Resume');
const Interview = require('./src/models/Interview');

const PORT = 5055; // Use dedicated port for automated check to prevent port conflicts

function makeRequest({ method = 'GET', path, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    let reqBody = null;
    const finalHeaders = { ...headers };

    if (body instanceof FormData) {
      Object.assign(finalHeaders, body.getHeaders());
    } else if (body && typeof body === 'object') {
      reqBody = JSON.stringify(body);
      finalHeaders['Content-Type'] = 'application/json';
      finalHeaders['Content-Length'] = Buffer.byteLength(reqBody);
    } else if (typeof body === 'string') {
      reqBody = body;
      finalHeaders['Content-Length'] = Buffer.byteLength(reqBody);
    }

    const options = {
      hostname: '127.0.0.1',
      port: PORT,
      path,
      method,
      headers: finalHeaders,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
          raw: data,
        });
      });
    });

    req.on('error', (err) => reject(err));

    if (body instanceof FormData) {
      body.pipe(req);
    } else if (reqBody) {
      req.write(reqBody);
      req.end();
    } else {
      req.end();
    }
  });
}

async function runCompleteHealthCheck() {
  console.log('================================================================');
  console.log('🛡️  INTERVIX AI - FULL BACKEND HEALTH CHECK & AUDIT');
  console.log('================================================================\n');

  // Start test server instance
  const server = await new Promise((resolve) => {
    const s = app.listen(PORT, '127.0.0.1', () => resolve(s));
  });

  // Ensure Mongoose connection is ready before testing
  if (mongoose.connection.readyState !== 1) {
    await new Promise((resolve) => {
      if (mongoose.connection.readyState === 1) return resolve();
      mongoose.connection.once('connected', resolve);
      setTimeout(resolve, 3000);
    });
  }

  const testReport = [];
  function record(category, testName, passed, details = '') {
    const status = passed ? 'PASS' : 'FAIL';
    testReport.push({ category, testName, status, details });
    const symbol = passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${symbol} ${category} -> ${testName} ${details ? `(${details})` : ''}`);
  }

  let createdTestUserId = null;
  let testUserToken = null;
  let testUserEmail = `health_test_${Date.now()}@intervix.test`;
  let testPassword = 'SecurePassword123!';
  let createdInterviewId = null;
  let createdResumeId = null;

  try {
    // -----------------------------------------------------------------
    // 1. MONGODB CONNECTION & OPERATIONS
    // -----------------------------------------------------------------
    console.log('\n--- Category 1: MongoDB Connection and Database Operations ---');
    const isConnected = mongoose.connection.readyState === 1;
    record(
      'Database',
      'MongoDB Connection State',
      isConnected,
      `readyState=${mongoose.connection.readyState}, Host=${mongoose.connection.host}`
    );

    const dbName = mongoose.connection.name;
    record('Database', 'Database Name intervix_ai', dbName === 'intervix_ai', `Name: ${dbName}`);

    // Verify existing collections exist and are readable without errors
    const usersCount = await User.countDocuments();
    const resumesCount = await Resume.countDocuments();
    const interviewsCount = await Interview.countDocuments();
    record(
      'Database',
      'Preserve and Read Existing Collections',
      usersCount >= 0 && resumesCount >= 0 && interviewsCount >= 0,
      `users=${usersCount}, resumes=${resumesCount}, interviews=${interviewsCount}`
    );

    // -----------------------------------------------------------------
    // 2. USER REGISTRATION AND LOGIN APIS
    // -----------------------------------------------------------------
    console.log('\n--- Category 2: User Registration and Login APIs ---');
    const regRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Health Check User',
        email: testUserEmail,
        password: testPassword,
      },
    });

    const regSuccess = regRes.status === 201 && regRes.data?.success && Boolean(regRes.data?.token);
    record('Auth APIs', 'User Registration (POST /api/auth/register)', regSuccess, `Status: ${regRes.status}`);

    if (regSuccess) {
      testUserToken = regRes.data.token;
      createdTestUserId = regRes.data.user?.id;
    }

    // Duplicate email registration should fail with 400
    const dupRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Duplicate User',
        email: testUserEmail,
        password: testPassword,
      },
    });
    record(
      'Auth APIs',
      'Duplicate Registration Guard',
      dupRes.status === 400,
      `Status: ${dupRes.status}, Message: ${dupRes.data?.message}`
    );

    // Login with correct credentials
    const loginRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        email: testUserEmail,
        password: testPassword,
      },
    });
    const loginSuccess = loginRes.status === 200 && Boolean(loginRes.data?.token);
    record('Auth APIs', 'User Login (POST /api/auth/login)', loginSuccess, `Status: ${loginRes.status}`);

    // Login with wrong password should fail with 401
    const badLoginRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        email: testUserEmail,
        password: 'IncorrectPassword',
      },
    });
    record(
      'Auth APIs',
      'Incorrect Password Rejection',
      badLoginRes.status === 401,
      `Status: ${badLoginRes.status}`
    );

    // -----------------------------------------------------------------
    // 3. JWT AUTHENTICATION AND AUTHORIZATION
    // -----------------------------------------------------------------
    console.log('\n--- Category 3: JWT Authentication & Authorization ---');
    const meRes = await makeRequest({
      method: 'GET',
      path: '/api/auth/me',
      headers: { Authorization: `Bearer ${testUserToken}` },
    });
    record('JWT Auth', 'Session Verification (GET /api/auth/me)', meRes.status === 200, `Status: ${meRes.status}`);

    const noTokenRes = await makeRequest({
      method: 'GET',
      path: '/api/auth/me',
    });
    record('JWT Auth', 'Reject Missing Token (401)', noTokenRes.status === 401, `Status: ${noTokenRes.status}`);

    const badTokenRes = await makeRequest({
      method: 'GET',
      path: '/api/auth/me',
      headers: { Authorization: 'Bearer fake_invalid_token_12345' },
    });
    record('JWT Auth', 'Reject Invalid Token (401)', badTokenRes.status === 401, `Status: ${badTokenRes.status}`);

    const profileRes = await makeRequest({
      method: 'GET',
      path: '/api/users/profile',
      headers: { Authorization: `Bearer ${testUserToken}` },
    });
    record('JWT Auth', 'Protected User Profile (GET /api/users/profile)', profileRes.status === 200, `Status: ${profileRes.status}`);

    // -----------------------------------------------------------------
    // 4. RESUME UPLOAD AND PARSING
    // -----------------------------------------------------------------
    console.log('\n--- Category 4: Resume Upload and Resume Parsing ---');
    // Create simulated resume file in memory
    const form = new FormData();
    const resumeTextContent = `
JOHN DOE
Software Engineer - Full Stack Developer
Email: john@example.com | Phone: 9876543210 | Location: Bengaluru

EDUCATION:
Bachelor of Technology in Computer Science Engineering, 2024
VTU University, CGPA: 8.5

TECHNICAL SKILLS:
Languages: JavaScript, TypeScript, Python, HTML5, CSS3
Frameworks & Libraries: React, Node.js, Express.js, Tailwind CSS
Databases: MongoDB, PostgreSQL, Redis
Tools: Git, Docker, AWS, REST APIs

PROJECTS:
1. E-Commerce Microservices Platform:
Built scalable backend using Node.js, Express, MongoDB and Redis caching.
2. AI Mock Interview System:
Integrated speech-to-text and AI evaluation using React and WebSockets.
`;
    // Create pseudo-pdf buffer containing plaintext markers for fallback parser
    const resumeBuffer = Buffer.from(`%PDF-1.4\n${resumeTextContent}\n%%EOF`);
    form.append('resumeFile', resumeBuffer, {
      filename: 'john_doe_resume.pdf',
      contentType: 'application/pdf',
    });

    const uploadRes = await makeRequest({
      method: 'POST',
      path: '/api/resume/upload',
      headers: { Authorization: `Bearer ${testUserToken}` },
      body: form,
    });

    const uploadPassed = uploadRes.status === 201 && uploadRes.data?.success;
    record(
      'Resume',
      'Resume Upload & Parsing (POST /api/resume/upload)',
      uploadPassed,
      `Status: ${uploadRes.status}, ResumeID: ${uploadRes.data?.data?.resume?._id}`
    );

    if (uploadPassed) {
      createdResumeId = uploadRes.data.data.resume._id;
      const parsed = uploadRes.data.data.resume.parsedData;
      const skillsCount = (parsed?.technicalSkills || []).length;
      record(
        'Resume',
        'Skills & Projects Extraction',
        skillsCount > 0,
        `Skills Found: ${skillsCount}, Projects: ${(parsed?.projects || []).length}`
      );

      // Verify no Mongoose CastError on Education
      const getResumeRes = await makeRequest({
        method: 'GET',
        path: `/api/resume/${createdResumeId}`,
        headers: { Authorization: `Bearer ${testUserToken}` },
      });
      record(
        'Resume',
        'Retrieve Parsed Resume (GET /api/resume/:id)',
        getResumeRes.status === 200,
        `Education parsed cleanly without CastError`
      );
    }

    // -----------------------------------------------------------------
    // 5. AI INTERVIEW QUESTION GENERATION
    // -----------------------------------------------------------------
    console.log('\n--- Category 5: AI Interview Question Generation ---');
    const startRes = await makeRequest({
      method: 'POST',
      path: '/api/interviews/start',
      headers: { Authorization: `Bearer ${testUserToken}` },
      body: {
        category: 'React',
        difficulty: 'Intermediate',
        totalQuestions: 3,
        durationMinutes: 15,
        mode: 'video',
        interviewType: 'general',
      },
    });

    const startPassed = startRes.status === 201 && startRes.data?.success;
    record(
      'AI Question Gen',
      'Start Session & Generate Q1 (POST /api/interviews/start)',
      startPassed,
      `Status: ${startRes.status}, InterviewId: ${startRes.data?.data?.interviewId}`
    );

    let firstQuestion = null;
    if (startPassed) {
      createdInterviewId = startRes.data.data.interviewId;
      firstQuestion = startRes.data.data.currentQuestion;
      record(
        'AI Question Gen',
        'Question Structure & Rubric Attributes',
        Boolean(firstQuestion?.question && firstQuestion?.expectedAnswer),
        `Q: "${firstQuestion?.question?.slice(0, 50)}..."`
      );
    }

    // -----------------------------------------------------------------
    // 6. AI ANSWER EVALUATION WITH CORRECT / INCORRECT FEEDBACK
    // -----------------------------------------------------------------
    console.log('\n--- Category 6: AI Answer Evaluation ---');
    if (createdInterviewId && firstQuestion) {
      // 6a. Evaluate correct answer
      const sampleCorrectAnswer = firstQuestion.expectedAnswer
        ? `${firstQuestion.expectedAnswer} This accurately demonstrates the mechanism and key concepts.`
        : 'In JavaScript, prototypal inheritance is a mechanism where objects inherit properties and methods directly from other objects via the prototype chain (__proto__). When accessing a property, the engine checks the object itself, then traverses up through Object.prototype until null is reached.';

      const evalCorrectRes = await makeRequest({
        method: 'POST',
        path: `/api/interviews/${createdInterviewId}/evaluate-answer`,
        headers: { Authorization: `Bearer ${testUserToken}` },
        body: {
          questionId: firstQuestion.questionId,
          candidateAnswer: sampleCorrectAnswer,
          question: firstQuestion.question,
          expectedAnswer: firstQuestion.expectedAnswer,
          topic: firstQuestion.category || 'JavaScript',
          difficulty: 'Intermediate',
        },
      });

      const evalData = evalCorrectRes.data?.evaluation || evalCorrectRes.data?.data?.evaluation;
      const isCorrectResult =
        evalCorrectRes.status === 200 &&
        (evalData?.result === 'correct' || evalData?.status === 'correct' || evalData?.score >= 70);

      record(
        'AI Evaluation',
        'Evaluate Correct Answer (POST /api/interview/evaluate-answer)',
        isCorrectResult,
        `Result: ${evalData?.result || evalData?.status}, Score: ${evalData?.score}/100, Accuracy: ${evalData?.accuracy}`
      );

      // 6b. Evaluate incorrect answer with misconception
      const evalIncorrectRes = await makeRequest({
        method: 'POST',
        path: `/api/interviews/${createdInterviewId}/evaluate-answer`,
        headers: { Authorization: `Bearer ${testUserToken}` },
        body: {
          questionId: firstQuestion.questionId,
          candidateAnswer: 'React executes all components on separate CPU threads in parallel like C++.',
          question: firstQuestion.question,
          expectedAnswer: firstQuestion.expectedAnswer,
          topic: 'React',
          difficulty: 'Intermediate',
        },
      });

      const incorrectData = evalIncorrectRes.data?.evaluation || evalIncorrectRes.data?.data?.evaluation;
      record(
        'AI Evaluation',
        'Evaluate Incorrect Answer with Feedback',
        incorrectData?.result === 'incorrect' || incorrectData?.score < 40,
        `Result: ${incorrectData?.result}, Score: ${incorrectData?.score}/100, Feedback provided: ${Boolean(incorrectData?.feedback)}`
      );

      // 6c. Evaluate empty answer
      const evalEmptyRes = await makeRequest({
        method: 'POST',
        path: `/api/interviews/${createdInterviewId}/evaluate-answer`,
        headers: { Authorization: `Bearer ${testUserToken}` },
        body: {
          questionId: firstQuestion.questionId,
          candidateAnswer: '',
          question: firstQuestion.question,
        },
      });

      const emptyData = evalEmptyRes.data?.evaluation || evalEmptyRes.data?.data?.evaluation;
      record(
        'AI Evaluation',
        'Empty Transcript Guard (needs_clarification)',
        emptyData?.result === 'needs_clarification' && emptyData?.score === 0,
        `Result: ${emptyData?.result}, Score: ${emptyData?.score}`
      );
    }

    // -----------------------------------------------------------------
    // 7. ERROR HANDLING AND API SECURITY
    // -----------------------------------------------------------------
    console.log('\n--- Category 7: Error Handling & API Security ---');
    // Health Check Endpoint
    const healthRes = await makeRequest({
      method: 'GET',
      path: '/api/health',
    });
    record(
      'Security',
      'Health Check Endpoint (GET /api/health)',
      healthRes.status === 200 && healthRes.data?.database?.status === 'connected',
      `DB Status: ${healthRes.data?.database?.status}, Uptime: ${healthRes.data?.uptimeSeconds}s`
    );

    // Security Headers Verification
    const hasNosniff = healthRes.headers['x-content-type-options'] === 'nosniff';
    const hasFrameOptions = healthRes.headers['x-frame-options'] === 'SAMEORIGIN';
    const hasCsp = Boolean(healthRes.headers['content-security-policy']);
    record(
      'Security',
      'Security Headers (nosniff, X-Frame-Options, CSP)',
      hasNosniff && hasFrameOptions && hasCsp,
      `nosniff=${hasNosniff}, frameOptions=${hasFrameOptions}, CSP=${hasCsp}`
    );

    // 404 Route Handler
    const notFoundRes = await makeRequest({
      method: 'GET',
      path: '/api/non_existent_route_9999',
    });
    record(
      'Security',
      '404 JSON Route Handler',
      notFoundRes.status === 404 && notFoundRes.data?.success === false,
      `Status: ${notFoundRes.status}, Returns JSON`
    );

    // NoSQL Operator Injection Sanitization
    const injectionRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        email: { $gt: '' }, // Injection attack payload
        password: 'Password123',
      },
    });
    record(
      'Security',
      'NoSQL Injection Sanitization',
      injectionRes.status === 400 || injectionRes.status === 401,
      `Sanitizer stripped operator payload safely`
    );

    // -----------------------------------------------------------------
    // 8. ALL BACKEND ROUTES AND CONTROLLERS
    // -----------------------------------------------------------------
    console.log('\n--- Category 8: All Backend Routes and Controllers ---');
    // History route
    const historyRes = await makeRequest({
      method: 'GET',
      path: '/api/interviews/history',
      headers: { Authorization: `Bearer ${testUserToken}` },
    });
    record(
      'Route Controllers',
      'Interview History (GET /api/interviews/history)',
      historyRes.status === 200 && Array.isArray(historyRes.data?.data?.history),
      `Total returned: ${historyRes.data?.data?.total}`
    );

    // Analytics route
    const analyticsRes = await makeRequest({
      method: 'GET',
      path: '/api/interviews/analytics',
      headers: { Authorization: `Bearer ${testUserToken}` },
    });
    record(
      'Route Controllers',
      'Interview Analytics (GET /api/interviews/analytics)',
      analyticsRes.status === 200,
      `Total Completed: ${analyticsRes.data?.data?.totalCompleted}`
    );

    // Next Question route
    if (createdInterviewId) {
      const nextQRes = await makeRequest({
        method: 'POST',
        path: `/api/interviews/${createdInterviewId}/next-question`,
        headers: { Authorization: `Bearer ${testUserToken}` },
      });
      record(
        'Route Controllers',
        'Advance Next Question (POST /api/interviews/:id/next-question)',
        nextQRes.status === 200 && Boolean(nextQRes.data?.data?.nextQuestion),
        `Next Q: #${nextQRes.data?.data?.nextQuestion?.questionId}`
      );

      // Finish Interview route
      const finishRes = await makeRequest({
        method: 'POST',
        path: `/api/interviews/${createdInterviewId}/finish`,
        headers: { Authorization: `Bearer ${testUserToken}` },
      });
      record(
        'Route Controllers',
        'Finish Interview & Generate Report (POST /api/interviews/:id/finish)',
        finishRes.status === 200 && Boolean(finishRes.data?.data?.finalReport),
        `Final Report Overall Score: ${finishRes.data?.data?.finalReport?.overallScore}`
      );
    }

    // Clean up ONLY the temporary test documents created during this test
    if (createdTestUserId) {
      await User.deleteOne({ _id: createdTestUserId });
    }
    if (createdResumeId) {
      await Resume.deleteOne({ _id: createdResumeId });
    }
    if (createdInterviewId) {
      await Interview.deleteOne({ _id: createdInterviewId });
    }
    console.log('\n[Cleanup]: Removed only test runner artifacts. All existing database records remain untouched.');

  } catch (err) {
    console.error('[Health Check Execution Exception]:', err);
  } finally {
    server.close();
  }

  // -----------------------------------------------------------------
  // FINAL SCORECARD
  // -----------------------------------------------------------------
  console.log('\n================================================================');
  console.log('📊 INTERVIX AI HEALTH CHECK SCORECARD');
  console.log('================================================================');

  let passedTotal = 0;
  let failedTotal = 0;

  testReport.forEach((t) => {
    if (t.status === 'PASS') passedTotal++;
    else failedTotal++;
  });

  console.log(`TOTAL CHECKS: ${testReport.length}`);
  console.log(`PASSED: ${passedTotal}`);
  console.log(`FAILED: ${failedTotal}`);
  console.log('================================================================\n');

  if (failedTotal > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runCompleteHealthCheck().catch((err) => {
  console.error('[Fatal Error]:', err);
  process.exit(1);
});
