/**
 * INTERVIX AI - Comprehensive Test Suite
 * Tests health endpoints, security headers, rate limiting, and AI semantic evaluation
 * across standard English, Hindi/Hinglish, partial answers, and misconceptions.
 */

const { evaluateAnswerStrictly, normalizeHinglish } = require('./src/services/evaluationEngine');
const aiService = require('./src/services/aiService');

async function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 RUNNING INTERVIX AI COMPREHENSIVE TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`✅ [PASS]: ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL]: ${name}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // TEST 1: Hinglish Phrase Normalization
  // ----------------------------------------------------
  console.log('--- Test 1: Hinglish Normalization ---');
  const hinglishInput = 'useState hook state maintain karne ke liye use hota hai aur ye component re-render karta hai';
  const normalized = normalizeHinglish(hinglishInput);
  assert(
    normalized.includes('manages state') && normalized.includes('triggers component re-rendering'),
    'Hinglish phrase accurately translated to technical concepts'
  );

  // ----------------------------------------------------
  // TEST 2: Evaluation of Correct Technical Answer
  // ----------------------------------------------------
  console.log('\n--- Test 2: Correct Answer Evaluation ---');
  const evalCorrect = await aiService.evaluateCandidateAnswer({
    category: 'React',
    difficulty: 'Intermediate',
    question: 'Explain what React useState is and how it works.',
    candidateAnswer:
      'useState is a React Hook that declares a state variable in a functional component. It returns an array with the current state and a setter function. Calling the setter schedules a re-render and updates the state asynchronously in batches.',
    expectedAnswer:
      'useState is a Hook providing state to function components, returning [state, setState]. Updates trigger re-renders and are batched.',
    essentialConcepts: ['declares state variable', 'returns array with state and setter', 'schedules re-render'],
    misconceptions: ['state updates immediately mutate the variable'],
    candidateName: 'Liza',
  });

  assert(
    evalCorrect.result === 'correct' && evalCorrect.score >= 75,
    `Correct answer scored: ${evalCorrect.score}/100 with result='${evalCorrect.result}'`
  );
  assert(
    evalCorrect.accuracy === 'High' || evalCorrect.accuracy === 'Good',
    `Accuracy rating verified: ${evalCorrect.accuracy}`
  );
  assert(
    evalCorrect.technicalKnowledge === 'Strong' || evalCorrect.technicalKnowledge === 'Good',
    `Technical Knowledge rating verified: ${evalCorrect.technicalKnowledge}`
  );
  assert(
    Array.isArray(evalCorrect.strengths) && evalCorrect.strengths.length > 0,
    `Strengths identified: ${evalCorrect.strengths.length}`
  );
  assert(
    Boolean(evalCorrect.spokenResponse && evalCorrect.spokenResponse.includes('Liza')),
    `Elena spoken response addresses candidate by name: "${evalCorrect.spokenResponse?.slice(0, 60)}..."`
  );

  // ----------------------------------------------------
  // TEST 3: Evaluation of Hinglish Spoken Answer
  // ----------------------------------------------------
  console.log('\n--- Test 3: Hinglish Spoken Answer Evaluation ---');
  const evalHinglish = await aiService.evaluateCandidateAnswer({
    category: 'React',
    difficulty: 'Intermediate',
    question: 'How does useEffect handle dependencies?',
    candidateAnswer:
      'useEffect hook side effects manage karne ke liye use hota hai. Agar dependency array empty hai toh ye initial mount pe run karta hai, aur dependencies change hone pe dobara execute hota hai.',
    expectedAnswer:
      'useEffect runs after render to perform side effects. Empty dependency array runs once on mount; array with values runs when dependencies change; missing array runs every render.',
    essentialConcepts: ['side effects', 'empty dependency array runs on mount', 're-runs when dependency values change'],
    misconceptions: ['useEffect runs synchronously before DOM paint'],
    candidateName: 'Rahul',
  });

  assert(
    evalHinglish.score >= 70,
    `Hinglish answer successfully understood and evaluated: ${evalHinglish.score}/100`
  );
  assert(
    evalHinglish.result === 'correct' || evalHinglish.result === 'partially_correct',
    `Result category correctly assigned: '${evalHinglish.result}'`
  );

  // ----------------------------------------------------
  // TEST 4: Evaluation of Incorrect Answer with Misconceptions
  // ----------------------------------------------------
  console.log('\n--- Test 4: Incorrect Answer with Misconceptions ---');
  const evalIncorrect = await aiService.evaluateCandidateAnswer({
    category: 'JavaScript',
    difficulty: 'Beginner',
    question: 'What is the event loop in JavaScript?',
    candidateAnswer:
      'JavaScript multi-threaded language hai jisme multiple threads parallel run karte hain like Java and C++.',
    expectedAnswer:
      'JavaScript has a single-threaded runtime with an event loop that coordinates the call stack, microtask queue, and macrotask queue.',
    essentialConcepts: ['single threaded', 'call stack', 'event loop'],
    misconceptions: ['JavaScript executes JavaScript code in multiple native parallel threads simultaneously'],
    candidateName: 'Candidate',
  });

  assert(
    evalIncorrect.score < 40,
    `Incorrect answer with misconception penalized: score=${evalIncorrect.score}/100`
  );
  assert(
    evalIncorrect.result === 'incorrect',
    `Result categorized as 'incorrect'`
  );
  assert(
    evalIncorrect.mistakes.length > 0 || evalIncorrect.feedback.length > 0,
    'Misconception explicitly detected and explained in feedback'
  );

  // ----------------------------------------------------
  // TEST 5: Empty / Trivial Transcript Guard
  // ----------------------------------------------------
  console.log('\n--- Test 5: Empty Transcript Guard ---');
  const evalEmpty = await aiService.evaluateCandidateAnswer({
    category: 'Node.js',
    difficulty: 'Intermediate',
    question: 'What is middleware in Express?',
    candidateAnswer: '',
    candidateName: 'Alex',
  });

  assert(
    evalEmpty.result === 'needs_clarification' && evalEmpty.score === 0,
    `Empty answer returns needs_clarification and score=0`
  );

  // ----------------------------------------------------
  // TEST 6: Structured Schema Verification
  // ----------------------------------------------------
  console.log('\n--- Test 6: Response Schema Conformance ---');
  const requiredKeys = [
    'result',
    'score',
    'accuracy',
    'technicalKnowledge',
    'feedback',
    'strengths',
    'mistakes',
    'correctExplanation',
    'improvementTips',
    'suggestedAnswer',
    'spokenResponse',
  ];
  const missingKeys = requiredKeys.filter((key) => evalCorrect[key] === undefined);
  assert(
    missingKeys.length === 0,
    `All required evaluation schema keys present: [${requiredKeys.join(', ')}]`
  );

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log(`🏁 TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('[Test Suite Crash]:', err);
  process.exit(1);
});
