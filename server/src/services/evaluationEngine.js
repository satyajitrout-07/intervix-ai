/**
 * INTERVIX AI - Strict Rubric-Based Answer Evaluation Engine
 * Evaluates technical correctness, concept understanding, completeness, and clarity.
 * Ensures incorrect, irrelevant, or empty answers receive zero marks.
 */

// Comprehensive question bank with ground-truth reference answers and essential concepts
const QUESTION_BANK = {
  'JavaScript': {
    Beginner: [
      {
        question: 'Explain the difference between var, let, and const in JavaScript regarding scope and hoisting.',
        essentialConcepts: ['block scope', 'function scope', 'hoisting', 'temporal dead zone', 'reassignment'],
        misconceptions: ['let and const are function scoped', 'var is block scoped', 'const values are completely immutable in objects'],
        expectedAnswer: 'var is function-scoped and hoisted with undefined initialization. let and const are block-scoped and hoisted into the Temporal Dead Zone (TDZ) without initialization. const cannot be reassigned, while let can be reassigned.',
        type: 'descriptive',
      },
      {
        question: 'What is the difference between == and === in JavaScript? Give an example.',
        essentialConcepts: ['loose equality', 'strict equality', 'type coercion'],
        misconceptions: ['== and === are identical', '=== checks memory address for primitives'],
        expectedAnswer: '== performs type coercion before comparison, so 5 == "5" evaluates to true. === performs strict comparison without coercion, checking both value and type, so 5 === "5" evaluates to false.',
        type: 'descriptive',
      },
      {
        question: 'What is a JavaScript closure and why is it useful?',
        essentialConcepts: ['lexical scope', 'inner function', 'outer function', 'data privacy', 'variable retention'],
        misconceptions: ['closures only exist in object methods', 'closures reset outer variables every call'],
        expectedAnswer: 'A closure is a function that retains access to its lexical scope even when the function is executed outside that scope. It is useful for data privacy, state encapsulation, and function factories.',
        type: 'descriptive',
      },
    ],
    Intermediate: [
      {
        question: 'Explain how the JavaScript Event Loop coordinates the Call Stack, Microtask Queue, and Macrotask Queue.',
        essentialConcepts: ['call stack', 'microtask queue', 'macrotask queue', 'promises', 'event loop order'],
        misconceptions: ['setTimeout runs inside the call stack', 'macrotasks run before microtasks', 'promises are macrotasks'],
        expectedAnswer: 'Synchronous code runs on the Call Stack. When it empties, the Event Loop processes the entire Microtask Queue (Promises, queueMicrotask) before picking one task from the Macrotask Queue (setTimeout, setInterval). This cycle repeats before rendering.',
        type: 'descriptive',
      },
      {
        question: 'How does the "this" keyword bind in regular functions versus arrow functions?',
        essentialConcepts: ['execution context', 'lexical this', 'call apply bind', 'invocation site'],
        misconceptions: ['arrow functions have their own this', 'this in regular functions is determined at definition time'],
        expectedAnswer: 'In regular functions, "this" is determined dynamically by how the function is invoked (or explicitly set via call/apply/bind). In arrow functions, "this" is lexically inherited from the enclosing scope and cannot be rebound.',
        type: 'descriptive',
      },
      {
        question: 'Compare Promise.all, Promise.allSettled, and Promise.race.',
        essentialConcepts: ['parallel execution', 'fail-fast', 'all settled', 'first settled'],
        misconceptions: ['Promise.all continues if one rejects', 'Promise.allSettled rejects on error'],
        expectedAnswer: 'Promise.all fails fast and rejects immediately if any promise rejects. Promise.allSettled waits for all promises to settle regardless of outcome and returns their statuses. Promise.race settles as soon as the first promise resolves or rejects.',
        type: 'descriptive',
      },
    ],
    Advanced: [
      {
        question: 'How do V8 engine hidden classes and inline caches optimize JavaScript object property access?',
        essentialConcepts: ['hidden classes', 'shape', 'inline cache', 'deoptimization', 'offset'],
        misconceptions: ['objects are simple hash maps in V8', 'property order has no impact on performance'],
        expectedAnswer: 'V8 assigns hidden classes (Shapes/Maps) to objects sharing the same property layout. Inline caches remember the memory offset of property lookups for that shape. Modifying properties in different orders causes shape transitions, leading to monomorphic deoptimization into polymorphic or megamorphic lookups.',
        type: 'descriptive',
      },
      {
        question: 'Explain memory leak detection in Node.js and how weak references (WeakMap/WeakSet) prevent garbage collection retainers.',
        essentialConcepts: ['mark and sweep', 'retained size', 'weak reference', 'garbage collection', 'heap snapshot'],
        misconceptions: ['WeakMap keys can be primitives', 'nulling an object inside an array removes it from heap immediately'],
        expectedAnswer: 'Node.js uses mark-and-sweep GC. Leaks occur when unused objects remain reachable from root retainers (closures, global caches, event listeners). WeakMap and WeakSet hold weak references to object keys; if no other references exist, the object and its associated data are eligible for garbage collection.',
        type: 'descriptive',
      },
    ],
  },
  'React.js': {
    Beginner: [
      {
        question: 'What is the Virtual DOM in React and how does reconciliation work?',
        essentialConcepts: ['in-memory representation', 'diffing algorithm', 'batching', 'real dom manipulation'],
        misconceptions: ['virtual dom is faster than direct optimized assembly', 'react replaces the entire dom tree on every render'],
        expectedAnswer: 'The Virtual DOM is an in-memory lightweight representation of the real DOM. When state changes, React creates a new virtual tree, diffs it with the previous tree using its reconciliation algorithm, and calculates the minimal set of real DOM mutations to apply.',
        type: 'descriptive',
      },
      {
        question: 'What are the rules of React Hooks and why do they exist?',
        essentialConcepts: ['top level only', 'react functions only', 'call order', 'fiber linked list'],
        misconceptions: ['hooks can be called in if statements if the condition never changes', 'hooks are stored in global variables by name'],
        expectedAnswer: 'Hooks must only be called at the top level of React function components or custom hooks, never inside loops, conditions, or nested functions. This ensures React can reliably preserve hook state across renders using an internal linked list indexed by call order.',
        type: 'descriptive',
      },
    ],
    Intermediate: [
      {
        question: 'When should you use useMemo and useCallback, and when does memoization hurt performance?',
        essentialConcepts: ['referential equality', 'computational cost', 'memory overhead', 'dependency array'],
        misconceptions: ['wrapping every component in React.memo is best practice', 'useCallback prevents the function from running'],
        expectedAnswer: 'useMemo caches computed values; useCallback caches function references to prevent child re-renders relying on referential equality. Premature memoization adds memory overhead and dependency comparison cost that often exceeds the cost of re-rendering lightweight components.',
        type: 'descriptive',
      },
      {
        question: 'How does React Context trigger re-renders, and how do you prevent unnecessary child re-renders?',
        essentialConcepts: ['context provider', 'consumer re-render', 'state splitting', 'memoization'],
        misconceptions: ['context only re-renders consumers if they use the specific changed key', 'context replaces redux completely for all use cases'],
        expectedAnswer: 'When a Context Provider value changes, all consuming components re-render regardless of whether they use the specific updated slice. To prevent unnecessary renders, split context into independent focused providers or memoize consumer children with React.memo.',
        type: 'descriptive',
      },
    ],
    Advanced: [
      {
        question: 'Explain React 18 Concurrent Features: How do useTransition, useDeferredValue, and Suspense with selective hydration work?',
        essentialConcepts: ['interruptible rendering', 'transitions', 'fiber priority', 'selective hydration', 'streaming ssr'],
        misconceptions: ['transitions make code run in Web Workers', 'useDeferredValue debounces updates with setTimeout'],
        expectedAnswer: 'React 18 Concurrent Mode allows renders to be interruptible. useTransition marks state updates as non-urgent transitions, yielding the main thread to high-priority events like typing. useDeferredValue defers recalculation of derived values. Selective hydration hydrates interactive islands on the page independently before the full HTML stream finishes.',
        type: 'descriptive',
      },
    ],
  },
  'Node.js': {
    Beginner: [
      {
        question: 'Is Node.js single-threaded? How does it handle concurrent I/O operations?',
        essentialConcepts: ['single-threaded event loop', 'libuv', 'thread pool', 'non-blocking i/o', 'asynchronous'],
        misconceptions: ['node.js creates an OS thread for every HTTP request', 'all node code runs on multiple CPU cores automatically'],
        expectedAnswer: 'JavaScript execution in Node.js runs on a single main event loop thread. However, asynchronous I/O operations (file system, crypto, DNS) are delegated to the underlying libuv thread pool and OS kernel asynchronous primitives (epoll/kqueue), allowing high concurrent throughput without blocking the main thread.',
        type: 'descriptive',
      },
    ],
    Intermediate: [
      {
        question: 'Explain Node.js Streams and how backpressure is handled.',
        essentialConcepts: ['readable', 'writable', 'transform', 'highWaterMark', 'backpressure', 'drain event'],
        misconceptions: ['streams load the entire file into buffer first', 'backpressure crashes the server'],
        expectedAnswer: 'Streams process data piece-by-piece in chunks rather than buffering entire payloads in memory. Backpressure occurs when the consumer reads data slower than the producer writes. When the internal buffer exceeds highWaterMark, stream.write() returns false, pausing the producer until the consumer emits the "drain" event.',
        type: 'descriptive',
      },
    ],
    Advanced: [
      {
        question: 'How do you diagnose and mitigate Node.js event loop lag and heap memory leaks in production?',
        essentialConcepts: ['event loop lag', 'heap snapshot', 'v8 profiler', 'memory leak', 'clinic.js', 'retainer tree'],
        misconceptions: ['restarting the server resolves memory leaks permanently', 'event loop lag is fixed by increasing memory'],
        expectedAnswer: 'Diagnose event loop lag using perf_hooks monitorEventLoopDelay and APMs. For memory leaks, capture heap snapshots via v8.getHeapSnapshot() or Chrome DevTools inspect flag, comparing heap dumps to identify growing constructor retainers. Mitigate by removing uncleaned event listeners, bounding in-memory caches, and using clustering.',
        type: 'descriptive',
      },
    ],
  },
  'Express.js': {
    Beginner: [
      {
        question: 'What is Express.js middleware and how does the next() function operate?',
        essentialConcepts: ['request response cycle', 'middleware chain', 'next function', 'error handling middleware'],
        misconceptions: ['middleware can only run before route handlers', 'next() is called automatically'],
        expectedAnswer: 'Express middleware are functions with access to req, res, and the next middleware function. Calling next() passes execution to the next handler in the pipeline. If next(err) is called with an argument, Express skips remaining handlers and jumps straight to registered error-handling middleware.',
        type: 'descriptive',
      },
    ],
    Intermediate: [
      {
        question: 'How do you implement robust centralized error handling and async error propagation in Express?',
        essentialConcepts: ['four-parameter error middleware', 'async error propagation', 'next(err)', 'unhandled rejections'],
        misconceptions: ['try/catch inside every route is enough without global error middleware', 'express 4 automatically catches async errors without next()'],
        expectedAnswer: 'In Express 4, asynchronous errors must be caught and forwarded via next(err) or wrapped with an async handler wrapper. Centralized error middleware with four arguments (err, req, res, next) handles logging, sets appropriate HTTP status codes, and returns sanitized JSON error responses without leaking internal stack traces.',
        type: 'descriptive',
      },
    ],
  },
  'MongoDB': {
    Beginner: [
      {
        question: 'What is the difference between embedding documents and referencing documents in MongoDB? When should you use each?',
        essentialConcepts: ['embedding', 'referencing', '1-to-few', '1-to-many', 'document size limit', 'atomicity'],
        misconceptions: ['referencing is always better like SQL foreign keys', 'embedded documents have no size limit'],
        expectedAnswer: 'Embedding places child data inside the parent document, ideal for 1-to-few relationships, fast read performance, and atomic updates. Referencing stores ObjectIds pointing to another collection, required for unbounded 1-to-many or many-to-many relationships to avoid the 16MB document size limit.',
        type: 'descriptive',
      },
    ],
    Intermediate: [
      {
        question: 'How do compound indexes work in MongoDB, and what is the Equality, Sort, Range (ESR) rule?',
        essentialConcepts: ['compound index', 'prefix rule', 'esr rule', 'sort order', 'collscan vs ixscan'],
        misconceptions: ['index on {a:1, b:1} optimizes query on {b:1} alone', 'range filters should go before equality'],
        expectedAnswer: 'Compound indexes index multiple fields. Under the ESR rule, equality filter fields should come first in the index key order, followed by sort fields, and range fields last. This enables MongoDB to perform an IXSCAN and satisfy sorting directly from index order without in-memory sorting.',
        type: 'descriptive',
      },
    ],
  },
  'MERN Stack': {
    Intermediate: [
      {
        question: 'Explain how JWT authentication and secure session management should be structured across React, Node.js, and MongoDB.',
        essentialConcepts: ['access token', 'refresh token', 'httponly cookie', 'authorization header', 'csrf protection'],
        misconceptions: ['storing access tokens in localStorage is completely secure against xss', 'jwt secrets should be committed to git'],
        expectedAnswer: 'Short-lived access tokens should be passed via Authorization: Bearer headers for API requests. Long-lived refresh tokens should be stored in HttpOnly, Secure, SameSite cookies to protect against XSS. The backend validates token signatures, checks token revocation in MongoDB/Redis, and issues new access tokens on rotation.',
        type: 'descriptive',
      },
    ],
    Advanced: [
      {
        question: 'How do you handle optimistic UI updates and distributed concurrency in a MERN stack application?',
        essentialConcepts: ['optimistic ui', 'concurrency control', 'version keys', 'rollback on failure', 'idempotency'],
        misconceptions: ['optimistic ui waits for database response before showing update', 'mongodb version keys prevent race conditions automatically without check'],
        expectedAnswer: 'Optimistic updates update client UI instantly while dispatching the API mutation. Concurrency is guarded in MongoDB using version keys (__v) or atomic operators (findOneAndUpdate with filter on version). If the backend returns a conflict or error, the client rolls back the optimistic state and alerts the user.',
        type: 'descriptive',
      },
    ],
  },
  'Java': {
    Beginner: [
      {
        question: 'Explain the four core principles of Object-Oriented Programming (OOP) in Java.',
        essentialConcepts: ['encapsulation', 'inheritance', 'polymorphism', 'abstraction'],
        misconceptions: ['polymorphism is only method overloading', 'encapsulation is just making all variables public'],
        expectedAnswer: 'Encapsulation bundles data and methods while restricting direct field access via access modifiers. Inheritance allows subclasses to inherit state and behavior from a superclass. Polymorphism allows objects to take multiple forms through overriding and overloading. Abstraction hides implementation details exposing only essential interfaces.',
        type: 'descriptive',
      },
    ],
    Intermediate: [
      {
        question: 'What are Java Virtual Threads (Project Loom) in Java 21 and how do they differ from platform threads?',
        essentialConcepts: ['virtual threads', 'carrier threads', 'm to n scheduling', 'stack memory', 'blocking i/o'],
        misconceptions: ['virtual threads make CPU-heavy code run faster', 'virtual threads replace the OS thread pool entirely for all tasks'],
        expectedAnswer: 'Platform threads are 1:1 mapped to OS threads, consuming ~1MB memory and expensive context switching. Virtual threads are lightweight user-mode threads managed by the JVM, multiplexing thousands of virtual threads onto a small pool of carrier OS threads. When a virtual thread performs blocking I/O, the JVM unmounts it, freeing the carrier thread for other work.',
        type: 'descriptive',
      },
    ],
  },
  'HTML': {
    Beginner: [
      {
        question: 'What is semantic HTML and why is it important for accessibility (a11y) and SEO?',
        essentialConcepts: ['semantic tags', 'screen readers', 'accessibility', 'seo structure', 'dom tree'],
        misconceptions: ['div and span are semantic elements', 'semantic tags are only for styling'],
        expectedAnswer: 'Semantic HTML uses meaningful tags like <header>, <nav>, <main>, <article>, and <footer> to describe the role of content. It enables screen readers to navigate page landmarks, improves search engine crawler indexing, and provides clearer document architecture.',
        type: 'descriptive',
      },
    ],
  },
  'CSS': {
    Beginner: [
      {
        question: 'Explain the CSS Box Model and the difference between content-box and border-box.',
        essentialConcepts: ['content', 'padding', 'border', 'margin', 'box-sizing', 'border-box'],
        misconceptions: ['margin is included inside the border-box width', 'padding does not add to total width in content-box'],
        expectedAnswer: 'The CSS Box Model consists of content, padding, border, and margin. In standard content-box, width applies only to content, so padding and border add extra width to the element. In border-box, the declared width includes content, padding, and border, making sizing predictable.',
        type: 'descriptive',
      },
    ],
  },
  'HR Interview': {
    Beginner: [
      {
        question: 'Tell me about yourself, your technical background, and what drives you as a software engineer.',
        essentialConcepts: ['career narrative', 'technical skills', 'project impact', 'passion', 'relevance to role'],
        misconceptions: ['reciting personal life history from childhood', 'speaking without structure'],
        expectedAnswer: 'A strong response outlines your technical focus, highlights significant projects with measurable impact, shares what drives you to solve hard problems, and connects your goals to the company vision.',
        type: 'descriptive',
      },
    ],
    Intermediate: [
      {
        question: 'Describe a situation where you had a technical disagreement with a team member. How did you resolve it?',
        essentialConcepts: ['star method', 'active listening', 'data-driven decision', 'collaboration', 'positive outcome'],
        misconceptions: ['saying you never disagree', 'blaming the other engineer', 'forcing your way without data'],
        expectedAnswer: 'Use the STAR format (Situation, Task, Action, Result). Focus on objective data, benchmarking, listening to trade-offs, testing hypotheses together, and committing to team alignment without personal bias.',
        type: 'descriptive',
      },
    ],
  },
  'Behavioral Interview': {
    Intermediate: [
      {
        question: 'Describe a challenging project deadline that was at risk of failing. What actions did you take to deliver successfully?',
        essentialConcepts: ['star method', 'prioritization', 'communication', 'scope management', 'stakeholder alignment'],
        misconceptions: ['working 48 hours without communicating delay', 'cutting code quality recklessly'],
        expectedAnswer: 'Detail how you identified critical path blockers early, communicated transparently with stakeholders, negotiated non-critical scope deferrals, focused on high-impact deliverables, and ensured regression testing was preserved.',
        type: 'descriptive',
      },
    ],
  },
};

/**
 * Strict evaluation of user answer against reference concepts and misconceptions.
 * Implements the 50/25/15/10 rubric:
 * - Technical accuracy: 50%
 * - Conceptual understanding: 25%
 * - Completeness: 15%
 * - Clarity: 10%
 */
function evaluateAnswerStrictly({
  category,
  difficulty,
  question,
  userAnswer,
  expectedAnswer,
  essentialConcepts = [],
  misconceptions = [],
}) {
  const trimmed = (userAnswer || '').trim();

  // Rule D: EMPTY ANSWER -> ZERO MARKS
  if (!trimmed || trimmed.length < 8) {
    return {
      status: 'incorrect',
      score: 0,
      maxScore: 10,
      accuracy: 0,
      technicalAccuracy: 0,
      conceptUnderstanding: 0,
      completeness: 0,
      clarity: 0,
      missingConcepts: essentialConcepts.length > 0 ? essentialConcepts : ['Basic answer missing'],
      incorrectStatements: ['No substantive answer was provided.'],
      feedback: 'No answer submitted or response was too brief to evaluate. An answer must be provided to receive credit.',
      referenceAnswer: expectedAnswer || 'A technically sound explanation of the concept.',
      explanation: 'Empty or trivial submissions receive zero marks.',
      strengths: [],
      weaknesses: ['Submission was empty or lacked technical content.'],
      improvementTips: ['Always attempt to explain the underlying mechanism, even if you are unsure of minor syntax.'],
    };
  }

  const lowerAnswer = trimmed.toLowerCase();

  // Rule G & Hallucination/Gibberish Check
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 5) {
    return {
      status: 'incorrect',
      score: 1,
      maxScore: 10,
      accuracy: 10,
      technicalAccuracy: 5,
      conceptUnderstanding: 5,
      completeness: 5,
      clarity: 20,
      missingConcepts: essentialConcepts,
      incorrectStatements: ['Answer is too fragmented to evaluate meaningfully.'],
      feedback: 'Your answer is too short to demonstrate technical understanding.',
      referenceAnswer: expectedAnswer,
      explanation: 'Professional technical rounds require complete explanations with context and mechanisms.',
      strengths: [],
      weaknesses: ['Answer lacked depth, technical vocabulary, and structure.'],
      improvementTips: ['Elaborate on why the mechanism behaves this way and give an example.'],
    };
  }

  // Check for presence of essential concepts
  const matchedConcepts = [];
  const missingConcepts = [];

  essentialConcepts.forEach((concept) => {
    const conceptLower = concept.toLowerCase();
    const tokens = conceptLower.split(/\s+/).filter((t) => t.length > 2);
    // If all tokens or key phrase is found in answer
    const isDirectMatch = lowerAnswer.includes(conceptLower);
    const isTokenMatch = tokens.length > 0 && tokens.every((t) => lowerAnswer.includes(t));

    if (isDirectMatch || isTokenMatch) {
      matchedConcepts.push(concept);
    } else {
      missingConcepts.push(concept);
    }
  });

  // Check for misconceptions
  const detectedMisconceptions = [];
  misconceptions.forEach((m) => {
    const mLower = m.toLowerCase();
    const mWords = mLower.split(/\s+/).filter((w) => w.length > 3);
    const matchedCount = mWords.filter((w) => lowerAnswer.includes(w)).length;
    if (matchedCount >= Math.min(3, mWords.length) && mWords.length > 0) {
      detectedMisconceptions.push(m);
    }
  });

  // Calculate dimension scores
  const totalConcepts = Math.max(1, essentialConcepts.length);
  const conceptRatio = matchedConcepts.length / totalConcepts;

  let technicalAccuracy = 0;
  let conceptUnderstanding = 0;
  let completeness = 0;
  let clarity = 0;

  if (conceptRatio === 0) {
    // Zero essential concepts present -> Marked INCORRECT
    technicalAccuracy = 10;
    conceptUnderstanding = 10;
    completeness = 10;
    clarity = Math.min(50, words.length > 20 ? 40 : 20);
  } else if (conceptRatio < 0.5) {
    // Under half the required concepts
    technicalAccuracy = Math.round(conceptRatio * 60);
    conceptUnderstanding = Math.round(conceptRatio * 65);
    completeness = Math.round(conceptRatio * 50);
    clarity = Math.min(80, 50 + words.length);
  } else if (conceptRatio < 0.9) {
    // Partially correct
    technicalAccuracy = Math.round(55 + conceptRatio * 35);
    conceptUnderstanding = Math.round(50 + conceptRatio * 40);
    completeness = Math.round(45 + conceptRatio * 45);
    clarity = Math.min(95, 60 + words.length * 0.5);
  } else {
    // Fully correct
    technicalAccuracy = Math.min(100, Math.round(85 + (words.length > 30 ? 15 : 5)));
    conceptUnderstanding = Math.min(100, Math.round(85 + conceptRatio * 15));
    completeness = Math.min(100, Math.round(80 + conceptRatio * 20));
    clarity = Math.min(100, Math.round(80 + (words.length > 25 ? 15 : 5)));
  }

  // Penalize for detected misconceptions
  if (detectedMisconceptions.length > 0) {
    technicalAccuracy = Math.max(0, technicalAccuracy - 35 * detectedMisconceptions.length);
    conceptUnderstanding = Math.max(0, conceptUnderstanding - 25 * detectedMisconceptions.length);
  }

  // Strict Rubric Weighting:
  // Technical accuracy: 50%
  // Conceptual understanding: 25%
  // Completeness: 15%
  // Clarity: 10%
  const totalPercentage = Math.round(
    technicalAccuracy * 0.5 +
      conceptUnderstanding * 0.25 +
      completeness * 0.15 +
      clarity * 0.1
  );

  const scaledScore = Math.min(10, Math.max(0, Math.round((totalPercentage / 10) * 10) / 10));

  // Determine status strictly
  let status = 'incorrect';
  if (totalPercentage >= 75 && missingConcepts.length <= 1) {
    status = 'correct';
  } else if (totalPercentage >= 40 || matchedConcepts.length >= 1) {
    status = 'partially_correct';
  } else {
    status = 'incorrect';
  }

  const strengths = [];
  if (matchedConcepts.length > 0) {
    strengths.push(`Correctly identified key principles: ${matchedConcepts.slice(0, 2).join(', ')}.`);
  }
  if (words.length > 25 && clarity >= 60) {
    strengths.push('Provided structured communication with technical context.');
  }

  const weaknesses = [];
  if (missingConcepts.length > 0) {
    weaknesses.push(`Missed core concepts: ${missingConcepts.join(', ')}.`);
  }
  if (detectedMisconceptions.length > 0) {
    weaknesses.push(`Clarification needed on: ${detectedMisconceptions.join(', ')}.`);
  }

  let feedback = '';
  if (status === 'correct') {
    feedback = `Solid answer. You demonstrated clear understanding of ${category} mechanics and addressed the core concepts accurately.`;
  } else if (status === 'partially_correct') {
    feedback = `Partially correct. You noted some correct points, but missed vital aspects (${missingConcepts.slice(0, 2).join(', ')}).`;
  } else {
    feedback = `Incorrect or incomplete. The response does not demonstrate the required technical knowledge for this question.`;
  }

  return {
    status,
    score: totalPercentage,
    maxScore: 10,
    accuracy: technicalAccuracy,
    technicalAccuracy,
    conceptUnderstanding,
    completeness,
    clarity,
    missingConcepts,
    incorrectStatements: detectedMisconceptions,
    feedback,
    referenceAnswer: expectedAnswer,
    explanation: `Key points expected by a senior technical interviewer: ${essentialConcepts.join('; ')}.`,
    strengths,
    weaknesses,
    improvementTips: [
      `Review ${category} documentation on: ${missingConcepts.slice(0, 2).join(', ') || 'edge cases'}.`,
      'Structure future answers with: Definition -> Mechanism -> Trade-offs -> Example.',
    ],
  };
}

/**
 * Retrieves question metadata matching category & difficulty
 */
function getQuestionData(category, difficulty, questionIndex = 0, previousQuestions = []) {
  const catBank = QUESTION_BANK[category] || QUESTION_BANK['JavaScript'];
  // Support both 'Beginner'/'Intermediate'/'Advanced' and 'Easy'/'Medium'/'Hard'
  let diffKey = difficulty;
  if (diffKey === 'Easy') diffKey = 'Beginner';
  if (diffKey === 'Medium') diffKey = 'Intermediate';
  if (diffKey === 'Hard') diffKey = 'Advanced';

  const diffBank = catBank[diffKey] || catBank['Intermediate'] || catBank['Beginner'] || Object.values(catBank)[0];

  const available = diffBank.filter((q) => !previousQuestions.includes(q.question));
  const selected = available.length > 0 ? available[0] : diffBank[questionIndex % diffBank.length];

  return {
    question: selected.question,
    category,
    difficulty: diffKey,
    type: selected.type || 'descriptive',
    options: selected.options || [],
    expectedAnswer: selected.expectedAnswer,
    essentialConcepts: selected.essentialConcepts || [],
    supportingConcepts: selected.supportingConcepts || [],
    misconceptions: selected.misconceptions || [],
  };
}

module.exports = {
  QUESTION_BANK,
  evaluateAnswerStrictly,
  getQuestionData,
};
