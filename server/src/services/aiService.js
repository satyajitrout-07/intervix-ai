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

Resume Context:
${
  resumeSnapshot
    ? `Skills: ${(resumeSnapshot.technicalSkills || []).slice(0, 10).join(', ')}. Projects: ${(resumeSnapshot.projects || [])
        .map((p) => p.name)
        .join(', ')}`
    : 'No candidate resume uploaded.'
}

Respond ONLY with valid JSON in this schema:
{
  "question": "Clear, technically deep question",
  "category": "${category}",
  "difficulty": "${difficulty}",
  "type": "descriptive",
  "expectedAnswer": "Comprehensive reference answer covering core technical mechanisms",
  "essentialConcepts": ["concept1", "concept2", "concept3"],
  "misconceptions": ["common fallacy 1", "common fallacy 2"]
}
`;

      const aiGenerated = await callLLM(prompt);
      if (
        aiGenerated &&
        aiGenerated.question &&
        !allBlacklisted.some((b) => b.toLowerCase() === aiGenerated.question.toLowerCase())
      ) {
        return {
          questionId: questionNumber,
          ...aiGenerated,
          isLiveAi: true,
        };
      }
    } catch (err) {
      console.warn('[LLM Question Gen Fallback]:', err.message);
    }
  }

  return {
    questionId: questionNumber,
    ...questionMeta,
    isLiveAi: false,
  };
}

/**
 * Evaluates candidate answer with deep semantic understanding, Hinglish tolerance,
 * and maintains interview memory/context across questions.
 */
async function evaluateCandidateAnswer({
  category = 'General Software Engineering',
  difficulty = 'Intermediate',
  question = '',
  candidateAnswer = '',
  userAnswer = '',
  expectedAnswer = '',
  essentialConcepts = [],
  misconceptions = [],
  candidateName = 'Candidate',
  sessionHistory = [],
  topic = '',
  resumeContext = null,
}) {
  const answer = (candidateAnswer || userAnswer || '').trim();
  const activeTopic = topic || category;

  // 1. Trivial or empty answer guard
  if (!answer || answer.split(/\s+/).filter(Boolean).length < 2) {
    return {
      result: 'needs_clarification',
      status: 'needs_clarification',
      score: 0,
      accuracy: 'Needs Improvement',
      technicalKnowledge: 'Needs Clarification',
      feedback:
        "No audible or written answer was captured. Please speak clearly into your microphone or use the Type Answer feature to explain your technical solution.",
      strengths: [],
      mistakes: ['No explanation provided.'],
      correctExplanation: expectedAnswer || `A comprehensive answer for this topic should explain the underlying mechanism, syntax, and performance implications.`,
      improvementTips: [
        'Speak directly into your microphone in a quiet environment.',
        'Structure your answer starting with definition, working mechanism, and practical example.',
      ],
      suggestedAnswer: expectedAnswer || 'Please provide a clear conceptual explanation.',
      spokenResponse: `I didn't quite catch your answer to this question, ${candidateName}. Let's make sure your microphone is active, or feel free to type your response.`,
      missingConcepts: essentialConcepts || [],
      incorrectStatements: [],
      isLiveAi: false,
    };
  }

  // 2. Check if live LLM API is configured
  const hasLLMKey = Boolean(
    (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) ||
    (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim())
  );

  if (hasLLMKey) {
    try {
      // Build interview context memory summary
      const pastSummary = Array.isArray(sessionHistory) && sessionHistory.length > 0
        ? sessionHistory
            .map(
              (item, idx) =>
                `Q${idx + 1}: "${item.question}" -> Score: ${item.evaluation?.score ?? 'N/A'}/100, Result: ${
                  item.evaluation?.result || item.evaluation?.status || 'N/A'
                }`
            )
            .join('\n')
        : 'First question of the session.';

      const prompt = `
You are Elena, a Staff Technical Interviewer evaluating a candidate's verbal response in a real technical mock interview.

Interview Context:
- Topic / Track: ${activeTopic}
- Difficulty: ${difficulty}
- Candidate Name: ${candidateName}
- Session History / Memory:
${pastSummary}

Question:
"${question}"

Reference Expected Answer:
"${expectedAnswer}"

Essential Concepts to Look For:
${JSON.stringify(essentialConcepts)}

Common Misconceptions to Penalize:
${JSON.stringify(misconceptions)}

Candidate's Spoken Answer:
"${answer}"

Evaluation Guidelines:
1. SEMANTIC UNDERSTANDING: Understand the core meaning of the answer. Do NOT penalize the candidate for using different synonyms, conversational phrasing, or natural speech patterns.
2. HINDI / HINGLISH TOLERANCE: Candidates may mix conversational Hindi/Hinglish (e.g., "state maintain karne ke liye use karte hain", "asynchronous function wait karta hai", "ye memory me store hota hai"). Evaluate the technical substance accurately.
3. SCORING & RESULTS:
   - "correct": score 75-100. Accurate technical understanding, core mechanisms addressed.
   - "partially_correct": score 40-74. Shows valid concepts but missed nuances, edge cases, or gave an incomplete explanation.
   - "incorrect": score 0-39. Factual errors, major misconceptions, or completely irrelevant.
   - "needs_clarification": score 10-30. Answer is vague, off-topic, or asks for clarification.
4. ACCURACY: One of ["High", "Good", "Moderate", "Low", "Needs Improvement"].
5. TECHNICAL KNOWLEDGE: One of ["Strong", "Good", "Fair", "Developing", "Needs Clarification"].
6. SPOKEN RESPONSE: Craft a warm, conversational spoken response (2-3 sentences) from Elena that acknowledges what they said, gives specific feedback, and encourages them. Address them by name.

Return valid JSON with EXACT schema:
{
  "result": "correct" | "partially_correct" | "incorrect" | "needs_clarification",
  "score": (number 0-100),
  "accuracy": "High" | "Good" | "Moderate" | "Low" | "Needs Improvement",
  "technicalKnowledge": "Strong" | "Good" | "Fair" | "Developing" | "Needs Clarification",
  "feedback": "Concise, professional evaluation feedback explaining what was correct and what was missing.",
  "strengths": ["Clear strength 1", "Clear strength 2"],
  "mistakes": ["Specific mistake or misconception identified"],
  "correctExplanation": "Detailed, technically precise reference explanation.",
  "improvementTips": ["Concrete actionable improvement tip 1", "Tip 2"],
  "suggestedAnswer": "Exemplary model answer suitable for a senior engineer.",
  "spokenResponse": "Elena's direct conversational feedback addressing candidate by name."
}
`;

      const aiEval = await callLLM(prompt);
      if (
        aiEval &&
        ['correct', 'partially_correct', 'incorrect', 'needs_clarification'].includes(aiEval.result) &&
        typeof aiEval.score === 'number'
      ) {
        const normalizedScore = Math.min(100, Math.max(0, Math.round(aiEval.score)));
        return {
          result: aiEval.result,
          status: aiEval.result, // backward compatibility
          score: normalizedScore,
          accuracy: aiEval.accuracy || (normalizedScore >= 75 ? 'Good' : normalizedScore >= 40 ? 'Moderate' : 'Low'),
          technicalKnowledge: aiEval.technicalKnowledge || (normalizedScore >= 75 ? 'Strong' : normalizedScore >= 40 ? 'Fair' : 'Developing'),
          feedback: aiEval.feedback || 'Answer evaluated.',
          strengths: Array.isArray(aiEval.strengths) ? aiEval.strengths : [],
          mistakes: Array.isArray(aiEval.mistakes) ? aiEval.mistakes : [],
          correctExplanation: aiEval.correctExplanation || expectedAnswer,
          improvementTips: Array.isArray(aiEval.improvementTips) ? aiEval.improvementTips : [],
          suggestedAnswer: aiEval.suggestedAnswer || expectedAnswer,
          spokenResponse: aiEval.spokenResponse || `Thank you, ${candidateName}. Your response has been evaluated.`,
          isLiveAi: true,
        };
      }
    } catch (err) {
      console.warn('[LLM Candidate Answer Evaluation Fallback]:', err.message);
    }
  }

  // 3. Deterministic semantic rubric evaluator with Hinglish normalization
  return evaluateAnswerStrictly({
    category: activeTopic,
    difficulty,
    question,
    userAnswer: answer,
    expectedAnswer,
    essentialConcepts,
    misconceptions,
    candidateName,
  });
}

/**
 * Backward compatibility wrapper around evaluateCandidateAnswer
 */
async function evaluateAnswer(params) {
  return evaluateCandidateAnswer(params);
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
  const resultStatus = evaluation.result || evaluation.status || 'partially_correct';

  let conversationalFeedback = '';
  if (resultStatus === 'correct') {
    conversationalFeedback = evaluation.spokenResponse || `Excellent explanation, ${candidateName}! You covered the key technical mechanisms accurately.`;
  } else if (resultStatus === 'partially_correct') {
    conversationalFeedback = evaluation.spokenResponse || `Good attempt, ${candidateName}. You understood the main concept, though a few technical nuances were missing.`;
  } else if (resultStatus === 'needs_clarification') {
    conversationalFeedback = evaluation.spokenResponse || `I didn't quite capture a full answer there, ${candidateName}. Remember you can always elaborate or use the text answer feature.`;
  } else {
    conversationalFeedback = evaluation.spokenResponse || `Thank you for sharing your thoughts, ${candidateName}. The core concept here differs slightly from your explanation.`;
  }

  let spokenScript = '';
  if (isFinalQuestion) {
    spokenScript = `${conversationalFeedback} That concludes our technical round for today. You can now click Finish Interview to view your comprehensive performance report. Outstanding work!`;
  } else if (nextQuestion && nextQuestion.question) {
    spokenScript = `${conversationalFeedback} Now, let's move on to our next question: ${nextQuestion.question}`;
  } else {
    spokenScript = `${conversationalFeedback} Whenever you are ready, please click Next Question to continue.`;
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
      summary: 'No questions answered.',
    };
  }

  let totalScore = 0;
  let correctCount = 0;
  let partiallyCorrectCount = 0;
  let incorrectCount = 0;
  let totalAccuracy = 0;
  let totalClarity = 0;
  const allMissing = [];

  questionsWithEvaluations.forEach((q) => {
    const evalData = q.evaluation || {};
    const score = Number(evalData.score) || 0;
    totalScore += score;

    const res = evalData.result || evalData.status;
    if (res === 'correct' || score >= 75) {
      correctCount++;
    } else if (res === 'partially_correct' || score >= 40) {
      partiallyCorrectCount++;
    } else {
      incorrectCount++;
    }

    totalAccuracy += typeof evalData.accuracy === 'number' ? evalData.accuracy : score >= 75 ? 85 : score >= 40 ? 60 : 30;
    totalClarity += Number(evalData.clarity) || (score >= 60 ? 80 : 50);

    if (Array.isArray(evalData.missingConcepts)) {
      evalData.missingConcepts.forEach((c) => allMissing.push(c));
    }
  });

  const overallScore = Math.round(totalScore / total);
  const avgAccuracy = Math.round(totalAccuracy / total);
  const avgClarity = Math.round(totalClarity / total);

  const uniqueMissing = [...new Set(allMissing)].slice(0, 6);

  // Collect strong and weak topics
  const strongAreas = [];
  const weakAreas = [];

  questionsWithEvaluations.forEach((q) => {
    const topic = q.topic || q.category || category;
    const res = q.evaluation?.result || q.evaluation?.status;
    if (res === 'correct' || (q.evaluation?.score || 0) >= 75) {
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
  evaluateCandidateAnswer,
  generateConversationalVoiceTurn,
  generateFinalReport,
};
