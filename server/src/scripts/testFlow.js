// Comprehensive End-to-End Workflow Test
const fetch = globalThis.fetch;

async function runTest() {
  console.log('--- Step 1: Health Check ---');
  const healthRes = await fetch('http://localhost:5000/api/health');
  const healthData = await healthRes.json();
  console.log('Health:', healthData.status, '| DB:', healthData.database.status);

  console.log('\n--- Step 2: Login as Satyajit Rout ---');
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'satyajit.rout@intervix.ai',
      password: 'Password@123',
    }),
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok) {
    throw new Error('Login failed: ' + loginData.message);
  }
  const token = loginData.token;
  console.log('Login OK. User:', loginData.user.name, '| Token length:', token.length);

  console.log('\n--- Step 3: Start Practice Round (MERN Stack, Medium, Junior) ---');
  const startRes = await fetch('http://localhost:5000/api/interviews/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      track: 'MERN Stack',
      difficulty: 'Medium',
      experienceLevel: 'Junior (1–2 years)',
      totalQuestions: 5,
    }),
  });
  const startData = await startRes.json();
  if (!startRes.ok) {
    throw new Error('Start failed: ' + startData.message);
  }
  const interviewId = startData.interviewId;
  console.log('Interview Created ID:', interviewId);
  console.log('Generated Question #1:', startData.currentQuestion.question);
  console.log('Topic:', startData.currentQuestion.topic);

  console.log('\n--- Step 4: Submit Answer to Question 1 ---');
  const sampleAnswer =
    'In a high-scale React and MongoDB architecture, race conditions are managed by implementing optimistic concurrency control using MongoDB document version keys (__v) alongside findOneAndUpdate atomic operators. In React, TanStack Query provides optimistic state updates with rollback on server failure, while distributed Redis locks prevent duplicate event execution across microservice replicas.';

  const ansRes = await fetch(`http://localhost:5000/api/interviews/${interviewId}/answer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      questionId: 1,
      userAnswer: sampleAnswer,
    }),
  });
  const ansData = await ansRes.json();
  if (!ansRes.ok) {
    throw new Error('Answer submission failed: ' + ansData.message);
  }
  console.log('Evaluation Score:', ansData.evaluation.score, '/ 100');
  console.log('Technical Accuracy:', ansData.evaluation.technicalAccuracy);
  console.log('Concept Understanding:', ansData.evaluation.conceptUnderstanding);
  console.log('Strengths:', ansData.evaluation.strengths);
  console.log('Next Question Generated (#2):', ansData.nextQuestion?.question);

  console.log('\n--- Step 5: Check Interview History from MongoDB ---');
  const histRes = await fetch('http://localhost:5000/api/interviews/history', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const histData = await histRes.json();
  console.log('User History Count:', histData.count);
  console.log('Latest Record Status:', histData.history[0]?.status, '| Track:', histData.history[0]?.track);

  console.log('\n=== ALL END-TO-END WORKFLOW TESTS PASSED SUCCESSFULLY! ===');
}

runTest().catch((err) => {
  console.error('Test FAILED:', err);
  process.exit(1);
});

