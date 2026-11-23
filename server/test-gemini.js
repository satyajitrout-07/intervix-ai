/**
 * INTERVIX AI - Google Gemini Integration Test Script
 * Verifies live Google Gemini question generation, answer evaluation,
 * error handling, and health endpoint reporting.
 */

const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const aiService = require('./src/services/aiService');

async function testGeminiIntegration() {
  console.log('================================================================');
  console.log('🤖 INTERVIX AI - GOOGLE GEMINI API INTEGRATION TEST');
  console.log('================================================================\n');

  const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';

  if (!apiKey) {
    console.log('ℹ️  GEMINI_API_KEY is currently empty in server/.env.');
    console.log('   Testing graceful fallback to strict semantic rubric evaluator...');
    
    // Verify fallback dynamic question generation
    const fallbackQ = await aiService.generateQuestion({
      category: 'React',
      difficulty: 'Intermediate',
      questionNumber: 1,
      totalQuestions: 5,
    });
    console.log('✅ Fallback Question Generation:', fallbackQ.question?.slice(0, 70) + '...');

    // Verify fallback answer evaluation
    const fallbackEval = await aiService.evaluateCandidateAnswer({
      category: 'React',
      difficulty: 'Intermediate',
      question: fallbackQ.question,
      candidateAnswer: fallbackQ.expectedAnswer,
      expectedAnswer: fallbackQ.expectedAnswer,
      essentialConcepts: fallbackQ.essentialConcepts,
    });
    console.log(`✅ Fallback Answer Evaluation: Score=${fallbackEval.score}/100, Result=${fallbackEval.result}`);
    console.log('\n👉 To activate live Gemini LLM generation:');
    console.log('   Add your key to server/.env: GEMINI_API_KEY=AIzaSy...');
    return;
  }

  // Key is provided: mask key for log security
  const maskedKey = apiKey.slice(0, 6) + '...' + apiKey.slice(-4);
  console.log(`🔑 Testing live Gemini API with key: ${maskedKey}\n`);

  // -----------------------------------------------------------
  // 1. Dynamic Question Generation Test
  // -----------------------------------------------------------
  console.log('1. Testing Live Question Generation...');
  try {
    const questionResult = await aiService.generateQuestion({
      category: 'React',
      difficulty: 'Advanced',
      experienceLevel: 'Senior Engineer',
      questionNumber: 1,
      totalQuestions: 5,
      previousQuestions: [],
      pastAskedQuestions: [],
      resumeSnapshot: {
        technicalSkills: ['React', 'TypeScript', 'Node.js', 'Redux', 'Next.js'],
        projects: [{ name: 'High-Scale Fintech Dashboard' }],
      },
    });

    console.log('   Generated Question:', questionResult.question);
    console.log('   Expected Answer Preview:', questionResult.expectedAnswer?.slice(0, 80) + '...');
    console.log('   Essential Concepts:', questionResult.essentialConcepts);
    console.log('   Is Live AI:', questionResult.isLiveAi);
    console.log('✅ Question generation completed.\n');

    // -----------------------------------------------------------
    // 2. Answer Evaluation Test
    // -----------------------------------------------------------
    console.log('2. Testing AI-Powered Answer Evaluation...');
    const candidateAnswer =
      'React manages updates via the Virtual DOM and reconciliation algorithm (Fiber). When state changes, React constructs a new fiber tree, computes the diff against the current tree during the render phase, and applies minimal DOM mutations during the commit phase.';

    const evalResult = await aiService.evaluateCandidateAnswer({
      category: 'React',
      difficulty: 'Advanced',
      question: questionResult.question,
      candidateAnswer,
      expectedAnswer: questionResult.expectedAnswer,
      essentialConcepts: questionResult.essentialConcepts,
      misconceptions: questionResult.misconceptions,
      candidateName: 'TestCandidate',
    });

    console.log('   Evaluation Result:', evalResult.result);
    console.log(`   Score: ${evalResult.score} / 100`);
    console.log('   Accuracy:', evalResult.accuracy);
    console.log('   Technical Knowledge:', evalResult.technicalKnowledge);
    console.log('   Elena Voice Feedback:', evalResult.spokenResponse);
    console.log('   Strengths:', evalResult.strengths);
    console.log('   Improvement Tips:', evalResult.improvementTips);
    console.log('   Is Live AI:', evalResult.isLiveAi);
    console.log('✅ Answer evaluation completed.\n');

  } catch (err) {
    console.error('❌ Gemini API Error:', err.message);
  }
}

testGeminiIntegration();
