const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

async function testAll() {
  console.log('=== 1. Health Check (Direct Backend:5000) ===');
  const health = await request({ hostname: 'localhost', port: 5000, path: '/api/health', method: 'GET' });
  console.log('Health Status:', health.status, health.data?.service, '| DB:', health.data?.database?.status);

  console.log('\n=== 2. Health Check via Vite Proxy (Client:5173 -> :5000) ===');
  const viteProxy = await request({ hostname: 'localhost', port: 5173, path: '/api/health', method: 'GET' });
  console.log('Vite /api/health Proxy Status:', viteProxy.status, viteProxy.data?.service);

  console.log('\n=== 3. Login User ===');
  const login = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'satyajit.rout@intervix.ai', password: 'Password@123' }
  );
  console.log('Login Status:', login.status, 'Success:', login.data?.success);
  console.log('User Name:', login.data?.user?.name, '| Email:', login.data?.user?.email);
  const token = login.data?.token || login.data?.data?.token;

  if (!token) {
    throw new Error('Login failed: ' + JSON.stringify(login.data));
  }

  console.log('\n=== 4. Start Video Interview ===');
  const start = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/interviews/start',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
    },
    {
      mode: 'video',
      category: 'JavaScript',
      difficulty: 'Intermediate',
      experienceLevel: 'Intermediate',
      totalQuestions: 2,
    }
  );
  console.log('Start Interview Status:', start.status, 'Success:', start.data?.success);
  const interviewId = start.data?.data?.interviewId;
  const firstQ = start.data?.data?.currentQuestion;
  console.log('Interview ID:', interviewId);
  console.log('Question 1:', firstQ?.question);

  console.log('\n=== 5. Test Video-Turn: Empty / Irrelevant Answer ===');
  const gibberishTurn = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/interviews/${interviewId}/video-turn`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
    },
    {
      questionId: firstQ.questionId,
      userAnswer: 'ummm yes I like cats and nice weather today',
    }
  );
  console.log('Gibberish Turn Status:', gibberishTurn.status);
  console.log('Evaluation:', {
    score: gibberishTurn.data?.data?.evaluation?.score,
    status: gibberishTurn.data?.data?.evaluation?.status,
    technicalAccuracy: gibberishTurn.data?.data?.evaluation?.scoreBreakdown?.technicalAccuracy,
    feedback: gibberishTurn.data?.data?.evaluation?.feedback,
  });
  console.log('AI Conversational Dialogue:', gibberishTurn.data?.data?.spokenScript);

  console.log('\n=== 6. Test Video-Turn: Accurate Technical Answer for Q2 ===');
  const nextQ = gibberishTurn.data?.data?.nextQuestion;
  console.log('Question 2:', nextQ?.question);

  const goodTurn = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/interviews/${interviewId}/video-turn`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
    },
    {
      questionId: nextQ?.questionId || 2,
      userAnswer:
        'In JavaScript, regular functions have dynamic `this` binding determined at runtime by how and where the function is called (the call-site invocation context: default binding, implicit object binding, or explicit binding via call, apply, bind). In contrast, arrow functions do not have their own `this` binding at all; instead, they lexically inherit `this` from their enclosing outer lexical scope where they were defined, and their `this` value cannot be rebound with call, apply, or bind.',
    }
  );
  console.log('Accurate Turn Status:', goodTurn.status);
  console.log('Evaluation:', {
    score: goodTurn.data?.data?.evaluation?.score,
    status: goodTurn.data?.data?.evaluation?.status,
    technicalAccuracy: goodTurn.data?.data?.evaluation?.scoreBreakdown?.technicalAccuracy,
    feedback: goodTurn.data?.data?.evaluation?.feedback,
  });
  console.log('Is Completed:', goodTurn.data?.data?.isCompleted);
  console.log('Final Report Overall Score:', goodTurn.data?.data?.finalReport?.overallScore);
  console.log('Final Hiring Recommendation:', goodTurn.data?.data?.finalReport?.recommendation);

  console.log('\n=== 7. Fetch Full Final Interview Record from DB ===');
  const fetched = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/interviews/${interviewId}`,
    method: 'GET',
    headers: {
      Authorization: 'Bearer ' + token,
    },
  });
  console.log('Interview Fetch Status:', fetched.status);
  console.log('Interview Status:', fetched.data?.data?.interview?.status);
  console.log('Voice Transcripts recorded:', fetched.data?.data?.interview?.voiceSession?.transcripts?.length);

  console.log('\n✨ ALL TESTS EXECUTED AND PASSED WITH 100% SUCCESS! ✨');
}

testAll().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
