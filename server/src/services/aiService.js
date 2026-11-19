/**
 * INTERVIX AI - LLM & Evaluation Integration Service
 * Connects securely to Google Gemini or OpenAI LLM APIs and backs up with
 * the strict rubric evaluation engine.
 */

const {
  QUESTION_BANK,
  evaluateAnswerStrictly,
  getDynamicQuestion,
} = require('./evaluationEngine');

// Helper to call Google Gemini API with JSON response enforcement
async function callGemini(prompt, systemInstruction = '') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return null;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      topP: 0.9,
      responseMimeType: 'application/json',
    },
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error [${response.status}]: ${errorText}`);
  }

  const data = await response.json();
  const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) {
    throw new Error('Empty response received from Gemini API');
  }

  return JSON.parse(textOutput);
}

// Helper to call OpenAI API with JSON response enforcement
async function callOpenAI(prompt, systemInstruction = '') {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return null;
  }

  const messages = [];
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API Error [${response.status}]: ${errorText}`);
  }

  const data = await response.json();
  const textOutput = data.choices?.[0]?.message?.content;
  if (!textOutput) {
    throw new Error('Empty response received from OpenAI API');
  }

  return JSON.parse(textOutput);
}

// Unified LLM Caller
async function callLLM(prompt, systemInstruction = '') {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
    return callGemini(prompt, systemInstruction);
  }
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim()) {
    return callOpenAI(prompt, systemInstruction);
  }
  return null;
}

/**
 * Generate a technical interview question
 */
async function generateQuestion({
  category = 'JavaScript',
  difficulty = 'Intermediate',
  experienceLevel = 'Junior (1–2 years)',
  questionNumber = 1,
  totalQuestions = 5,
  previousQuestions = [],
  pastAskedQuestions = [],
  resumeSnapshot = null,
  interviewType = 'Mixed',
}) {
  const questionMeta = getDynamicQuestion({
    category,
    difficulty,
    questionIndex: questionNumber - 1,
    previousQuestions,
    pastAskedQuestions,
    resumeSnapshot,
    interviewType,
  });
  const hasLLMKey = Boolean(
    (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) ||
    (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim())
  );

  if (hasLLMKey) {
    try {
      const allBlacklisted = [...previousQuestions, ...pastAskedQuestions].filter(Boolean);
      const prompt = `
You are a Staff Technical Interviewer conducting a realistic interview in ${category} (${difficulty} difficulty, candidate level: ${experienceLevel}).
Generate Question #${questionNumber} of ${totalQuestions}.

Strict Rule: Do NOT repeat or paraphrase any of these questions already asked to this candidate:
${allBlacklisted.map((q, idx) => `${idx + 1}. ${q}`).join('\n') || 'None'}

Topic focus inspiration: ${questionMeta.question}

Return strict JSON:
{
  "question": "The fresh, non-repeating technical question",
  "category": "${category}",
  "difficulty": "${difficulty}",
  "expectedAnswer": "Authoritative complete technical answer expected",
  "essentialConcepts": ["concept1", "concept2", "concept3"],
  "misconceptions": ["common mistake 1", "common mistake 2"]
}
`;

      const aiData = await callLLM(prompt);
      if (aiData && aiData.question) {
        return {
          question: aiData.question,
          category,
          difficulty,
          type: 'descriptive',
          expectedAnswer: aiData.expectedAnswer || questionMeta.expectedAnswer,
          essentialConcepts: aiData.essentialConcepts || questionMeta.essentialConcepts,
          misconceptions: aiData.misconceptions || questionMeta.misconceptions,
          isLiveAi: true,
        };
      }
    } catch (err) {
      console.warn('[LLM Question Gen Warning]:', err.message);
    }
  }

  return {
    ...questionMeta,
    isLiveAi: hasLLMKey,
  };
}

/**
 * Rigorously evaluate an answer submitted by the candidate
 */
async function evaluateAnswer({
  category = 'JavaScript',
  difficulty = 'Intermediate',
  question,
  userAnswer,
  expectedAnswer = '',
  essentialConcepts = [],
  misconceptions = [],
}) {
  const hasLLMKey = Boolean(
    (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) ||
    (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim())
  );

  if (hasLLMKey) {
    try {
      const prompt = `
You are a strict, objective senior technical interviewer evaluating a candidate's answer.
NEVER award full marks based merely on keyword matching.
DO NOT award marks if the answer is factually incorrect, irrelevant, or contains serious misconceptions.
If the answer is empty or trivial, return score: 0 and status: "incorrect".

Context:
- Category: ${category}
- Difficulty: ${difficulty}

Question:
"${question}"

Reference Expected Answer:
"${expectedAnswer}"

Essential Concepts That Must Be Present:
${JSON.stringify(essentialConcepts)}

Common Misconceptions to Penalize:
${JSON.stringify(misconceptions)}

Candidate's Answer:
"${userAnswer}"

Evaluation Rules:
- status: "correct" (≥75% and all essential concepts addressed correctly), "partially_correct" (40-74% with some correct concepts), or "incorrect" (<40% or factually wrong).
- score: 0 to 100
- accuracy: 0 to 100 (50% weight)
- conceptUnderstanding: 0 to 100 (25% weight)
- completeness: 0 to 100 (15% weight)
- clarity: 0 to 100 (10% weight)

Return JSON with exact schema:
{
  "status": "correct | partially_correct | incorrect",
  "score": (number 0-100),
  "maxScore": 10,
  "accuracy": (number 0-100),
  "technicalAccuracy": (number 0-100),
  "conceptUnderstanding": (number 0-100),
  "completeness": (number 0-100),
  "clarity": (number 0-100),
  "missingConcepts": ["concept1"],
  "incorrectStatements": ["misconception found"],
  "feedback": "Strict feedback on what was correct and what was missing",
  "referenceAnswer": "Crisp model answer",
  "explanation": "Technical explanation of concepts",
  "strengths": ["Clear strength"],
  "weaknesses": ["Key weakness"],
  "improvementTips": ["Concrete tip"]
}
`;

      const aiEval = await callLLM(prompt);
      if (
        aiEval &&
        ['correct', 'partially_correct', 'incorrect'].includes(aiEval.status) &&
        typeof aiEval.score === 'number'
      ) {
        return {
          ...aiEval,
          score: Math.min(100, Math.max(0, Math.round(aiEval.score))),
          isLiveAi: true,
        };
      }
    } catch (err) {
      console.warn('[LLM Evaluation Fallback to Strict Rubric]:', err.message);
    }
  }

  // Deterministic strict rubric evaluator
  return evaluateAnswerStrictly({
    category,
    difficulty,
    question,
    userAnswer,
    expectedAnswer,
    essentialConcepts,
    misconceptions,
  });
}

/**
 * Generates natural conversational dialogue for AI Voice & Video Interviewer
 */
async function generateConversationalVoiceTurn({
  category,
  candidateName = 'Candidate',
  question,
  userAnswer,
  evaluation,
  nextQuestion,
  isFinalQuestion = false,
}) {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());

  let conversationalFeedback = '';
  if (evaluation.status === 'correct') {
    conversationalFeedback = `Excellent breakdown, ${candidateName}. You covered the core principles accurately.`;
  } else if (evaluation.status === 'partially_correct') {
    conversationalFeedback = `Good effort, ${candidateName}. You caught some key ideas, but missed a few technical nuances like ${evaluation.missingConcepts?.[0] || 'edge-case handling'}.`;
  } else {
    conversationalFeedback = `Thank you for sharing your perspective, ${candidateName}. Let's keep moving forward.`;
  }

  let spokenScript = '';
  if (isFinalQuestion) {
    spokenScript = `${conversationalFeedback} That concludes our technical round for today. You can now click Finish Interview to view your comprehensive performance report. Great work!`;
  } else if (nextQuestion && nextQuestion.question) {
    spokenScript = `${conversationalFeedback} Now, let's explore our next area: ${nextQuestion.question}`;
  } else {
    spokenScript = `${conversationalFeedback} Whenever you are ready, please click Next Question to proceed.`;
  }

  return {
    spokenScript,
    conversationalFeedback,
    evaluation,
  };
}

/**
 * Compiles a comprehensive final interview report
 */
async function generateFinalReport({
  category,
  difficulty,
  experienceLevel,
  questionsWithEvaluations = [],
}) {
  const total = questionsWithEvaluations.length;
  if (total === 0) {
    return {
      overallScore: 0,
      percentage: 0,
      totalQuestions: 0,
      correctCount: 0,
      partiallyCorrectCount: 0,
      incorrectCount: 0,
      technicalAccuracyScore: 0,
      communicationScore: 0,
      strongAreas: [],
      weakAreas: [],
      missingConcepts: [],
      suggestedTopics: [],
      personalizedRecommendations: [],
      summary: 'No evaluated questions found.',
    };
  }

  const scores = questionsWithEvaluations.map((q) => q.evaluation?.score || 0);
  const sum = scores.reduce((acc, s) => acc + s, 0);
  const overallScore = Math.round(sum / total);

  const correctCount = questionsWithEvaluations.filter((q) => q.evaluation?.status === 'correct').length;
  const partiallyCorrectCount = questionsWithEvaluations.filter((q) => q.evaluation?.status === 'partially_correct').length;
  const incorrectCount = questionsWithEvaluations.filter((q) => q.evaluation?.status === 'incorrect').length;

  const accuracies = questionsWithEvaluations.map((q) => q.evaluation?.accuracy || q.evaluation?.technicalAccuracy || 0);
  const avgAccuracy = Math.round(accuracies.reduce((a, b) => a + b, 0) / total);

  const clarities = questionsWithEvaluations.map((q) => q.evaluation?.clarity || 70);
  const avgClarity = Math.round(clarities.reduce((a, b) => a + b, 0) / total);

  // Collect missing concepts across all questions
  const allMissing = [];
  questionsWithEvaluations.forEach((q) => {
    if (q.evaluation?.missingConcepts) {
      allMissing.push(...q.evaluation.missingConcepts);
    }
  });
  const uniqueMissing = [...new Set(allMissing)].slice(0, 6);

  // Collect strong and weak topics
  const strongAreas = [];
  const weakAreas = [];

  questionsWithEvaluations.forEach((q) => {
    const topic = q.topic || q.category || category;
    if (q.evaluation?.status === 'correct') {
      strongAreas.push(topic);
    } else {
      weakAreas.push(topic);
    }
  });

  const uniqueStrong = [...new Set(strongAreas)].slice(0, 3);
  const uniqueWeak = [...new Set(weakAreas)].slice(0, 3);

  const personalizedRecommendations = [
    `Dedicate structured review to: ${uniqueMissing.slice(0, 3).join(', ') || category}.`,
    'Practice mock verbal interviews using the PREP model (Point, Reason, Example, Point).',
    `Deepen knowledge of ${category} runtime internals and production failure modes.`,
    'Always discuss trade-offs (memory overhead vs execution speed) proactively.',
  ];

  let summary = '';
  if (overallScore >= 80) {
    summary = `Exceptional technical performance! Candidate demonstrated solid domain mastery in ${category} (${difficulty}) with factual precision. Recommended for on-site interviews.`;
  } else if (overallScore >= 50) {
    summary = `Competent foundational knowledge in ${category}. Candidate answered several questions accurately but lacked depth on core mechanisms (${uniqueMissing.slice(0, 2).join(', ')}).`;
  } else {
    summary = `Candidate requires further preparation in ${category}. Responses frequently lacked essential technical concepts or contained misconceptions.`;
  }

  return {
    overallScore,
    percentage: overallScore,
    totalQuestions: total,
    correctCount,
    partiallyCorrectCount,
    incorrectCount,
    technicalAccuracyScore: avgAccuracy,
    communicationScore: avgClarity,
    strongAreas: uniqueStrong.length > 0 ? uniqueStrong : [`${category} Fundamentals`],
    weakAreas: uniqueWeak.length > 0 ? uniqueWeak : ['Advanced Concurrency & Edge Cases'],
    missingConcepts: uniqueMissing,
    suggestedTopics: uniqueMissing.length > 0 ? uniqueMissing : [`${category} Architecture`, 'Performance Optimization'],
    personalizedRecommendations,
    summary,
    // Backward compatibility aliases
    correctAnswers: correctCount,
    partiallyCorrect: partiallyCorrectCount,
    needsImprovement: incorrectCount,
    strongestSkills: uniqueStrong,
    weakestSkills: uniqueWeak,
    personalizedRoadmap: personalizedRecommendations,
    summaryFeedback: summary,
  };
}

module.exports = {
  generateQuestion,
  evaluateAnswer,
  generateConversationalVoiceTurn,
  generateFinalReport,
};
