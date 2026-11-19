/**
 * INTERVIX AI - Strict Rubric-Based Answer Evaluation Engine & Dynamic Question Generator
 * Evaluates technical correctness, concept understanding, completeness, and clarity.
 * Ensures zero repeated questions within and across interview sessions.
 */

// Normalized string comparison for deduplication
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateSimilarity(str1, str2) {
  const words1 = new Set(normalizeText(str1).split(' ').filter((w) => w.length > 2));
  const words2 = new Set(normalizeText(str2).split(' ').filter((w) => w.length > 2));
  if (words1.size === 0 || words2.size === 0) return 0;

  let intersection = 0;
  words1.forEach((w) => {
    if (words2.has(w)) intersection++;
  });

  const union = new Set([...words1, ...words2]).size;
  return intersection / union;
}

// Comprehensive multi-domain question bank
const QUESTION_BANK = {
  JavaScript: {
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
      {
        question: 'Explain how array methods map, filter, and reduce differ in behavior and return values.',
        essentialConcepts: ['immutability', 'map transformation', 'filter predicate', 'reduce accumulator'],
        misconceptions: ['map modifies the original array in place', 'forEach returns a new array'],
        expectedAnswer: 'map transforms each element and returns a new array of the same length. filter returns a new array containing only elements that pass a predicate. reduce iterates through the array accumulating elements into a single value.',
        type: 'descriptive',
      },
      {
        question: 'What is the difference between synchronous and asynchronous execution in JavaScript?',
        essentialConcepts: ['blocking', 'non-blocking', 'call stack', 'callback', 'event driven'],
        misconceptions: ['asynchronous code executes in parallel on another thread in javascript engine', 'setTimeout is part of the ECMAScript core language'],
        expectedAnswer: 'Synchronous code runs sequentially on the single main thread, blocking execution until each operation finishes. Asynchronous code offloads long-running operations (I/O, timers) to browser/environment APIs and handles results via callbacks, promises, or async/await once the stack clears.',
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
        question: 'Compare Promise.all, Promise.allSettled, and Promise.race with real-world scenarios.',
        essentialConcepts: ['parallel execution', 'fail-fast', 'all settled', 'first settled'],
        misconceptions: ['Promise.all continues if one rejects', 'Promise.allSettled rejects on error'],
        expectedAnswer: 'Promise.all fails fast and rejects immediately if any promise rejects. Promise.allSettled waits for all promises to settle regardless of outcome and returns their statuses. Promise.race settles as soon as the first promise resolves or rejects.',
        type: 'descriptive',
      },
      {
        question: 'What is prototypal inheritance in JavaScript and how does prototype chain lookup work?',
        essentialConcepts: ['prototype chain', '__proto__', 'Object.prototype', 'property shadowing'],
        misconceptions: ['classes in javascript are true classical classes', 'subclasses duplicate all methods into their own memory'],
        expectedAnswer: 'In JavaScript, objects inherit directly from other objects via a hidden [[Prototype]] link. When accessing a property, the engine looks at the object; if absent, it traverses up the prototype chain until found or until null is reached on Object.prototype.',
        type: 'descriptive',
      },
      {
        question: 'Explain debouncing versus throttling in JavaScript and when you would use each.',
        essentialConcepts: ['delay timer', 'rate limit', 'scroll resize event', 'search input autocomplete'],
        misconceptions: ['debouncing and throttling are interchangeable', 'throttling postpones execution until events completely stop'],
        expectedAnswer: 'Debouncing delays function execution until a specified quiet period has elapsed with no new triggers (ideal for search inputs). Throttling enforces a maximum execution frequency, running the function at most once per time window (ideal for scroll or resize listeners).',
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
      {
        question: 'How do JavaScript Generators and Async Iterators work internally with state machines?',
        essentialConcepts: ['generator state machine', 'Symbol.asyncIterator', 'yield suspension', 'iterator protocol'],
        misconceptions: ['generators run on separate OS threads', 'yield creates a separate execution context each call'],
        expectedAnswer: 'Generators compile into state machines that maintain their execution context and local variables suspended across yield calls. Calling next() resumes execution until the next yield or return. Async iterators return promises wrapping { value, done }, enabling non-blocking stream processing via for-await-of loops.',
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
      {
        question: 'What is the purpose of the key prop in React lists, and why is using index as key discouraged?',
        essentialConcepts: ['list identity', 'reconciliation stability', 'element reordering', 'state preservation'],
        misconceptions: ['keys are purely for styling or CSS', 'index is safe as key for reordered or filtered lists'],
        expectedAnswer: 'The key prop gives React a persistent identity for each item across renders, allowing it to correctly match elements during reconciliation. Using array index as key breaks when lists are sorted, filtered, or mutated, causing incorrect component state retention and visual bugs.',
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
      {
        question: 'Explain the difference between controlled and uncontrolled components in React.',
        essentialConcepts: ['form state', 'single source of truth', 'useRef', 'onChange handler'],
        misconceptions: ['uncontrolled components cannot be validated', 'controlled components are slower in every scenario'],
        expectedAnswer: 'Controlled components have their form state managed by React state via value and onChange, creating a single source of truth. Uncontrolled components let the DOM handle form state directly, accessed via useRef when needed.',
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
      {
        question: 'How does React Fiber internal linked-list architecture (child, sibling, return) enable interruptible rendering?',
        essentialConcepts: ['fiber node', 'work-in-progress tree', 'current tree', 'commit phase', 'reconciliation phase'],
        misconceptions: ['fiber is just another name for virtual dom', 'reconciliation and commit phases can both be interrupted'],
        expectedAnswer: 'The Fiber architecture replaces the recursive call stack with a singly linked list tree of Fiber nodes (child, sibling, return). This enables React to break reconciliation work into incremental units, pausing work between frames to yield to user inputs. Once the work-in-progress tree is complete, the commit phase executes synchronously to mutate the real DOM.',
        type: 'descriptive',
      },
    ],
  },
  'Node.js': {
    Beginner: [
      {
        question: 'Is Node.js single-threaded? How does it handle concurrent I/O operations without blocking?',
        essentialConcepts: ['single-threaded event loop', 'libuv', 'thread pool', 'non-blocking i/o', 'asynchronous'],
        misconceptions: ['Node.js has only one OS thread for everything', 'Node.js creates a new thread for each incoming request'],
        expectedAnswer: 'Node.js executes user JavaScript on a single-threaded event loop. Non-blocking asynchronous I/O (network requests, filesystem, DNS) is delegated to the operating system kernel via epoll/kqueue or to the Libuv thread pool (default 4 threads), allowing high concurrent connection handling.',
        type: 'descriptive',
      },
      {
        question: 'What is the role of package.json and package-lock.json in Node.js development?',
        essentialConcepts: ['dependencies', 'devDependencies', 'semantic versioning', 'deterministic dependency tree'],
        misconceptions: ['package-lock.json should never be committed to git', 'caret and tilde lock exact versions'],
        expectedAnswer: 'package.json defines project metadata, scripts, and direct dependencies with semantic versioning ranges. package-lock.json locks the exact dependency tree, resolved URLs, and sub-dependency versions to ensure deterministic, reproducible builds across environments.',
        type: 'descriptive',
      },
    ],
    Intermediate: [
      {
        question: 'Explain Streams in Node.js: What are Readable, Writable, Transform streams, and how do you handle backpressure?',
        essentialConcepts: ['readable stream', 'writable stream', 'pipe', 'backpressure', 'buffer limits'],
        misconceptions: ['streams store the entire file in RAM before emitting data', 'pipe ignores highWaterMark'],
        expectedAnswer: 'Streams process data piece-by-piece in chunks rather than buffering entire files in memory. Backpressure occurs when a writable stream cannot consume data as fast as a readable stream emits it. When write() returns false, reading pauses until the drain event fires. pipeline() handles backpressure and error propagation automatically.',
        type: 'descriptive',
      },
      {
        question: 'How do you structure error handling in an Express.js production application?',
        essentialConcepts: ['centralized error middleware', 'operational vs programmer errors', 'async wrapper', 'unhandledRejection'],
        misconceptions: ['try-catch in route handler catches unhandled promise rejections automatically', 'express error middleware takes 3 arguments'],
        expectedAnswer: 'Production Express error handling uses a centralized 4-parameter middleware (err, req, res, next) at the end of the pipeline. Async routes should pass errors to next(err). Distinguish operational errors (bad user input, 404) from programmer bugs (null pointer, 500) and log them with structured context.',
        type: 'descriptive',
      },
    ],
    Advanced: [
      {
        question: 'How does the Node.js Event Loop cycle through its specific phases: Timers, Pending Callbacks, Poll, Check, and Close?',
        essentialConcepts: ['timers phase', 'poll phase', 'check phase setImmediate', 'close callbacks', 'process.nextTick priority'],
        misconceptions: ['process.nextTick is part of the event loop phases', 'setImmediate and setTimeout(0) always execute in deterministic order without I/O context'],
        expectedAnswer: 'The event loop cycles: 1) Timers (expired setTimeout/setInterval), 2) Pending Callbacks (I/O errors), 3) Idle/Prepare, 4) Poll (retrieve new I/O events, execute callbacks), 5) Check (setImmediate), 6) Close Callbacks. Microtasks (process.nextTick, Promise callbacks) run immediately after each phase before transitioning to the next.',
        type: 'descriptive',
      },
    ],
  },
  MongoDB: {
    Beginner: [
      {
        question: 'What is the difference between SQL relational databases and MongoDB document database?',
        essentialConcepts: ['schema flexibility', 'json/bson documents', 'normalization vs embedding', 'horizontal scalability'],
        misconceptions: ['mongodb cannot handle relations', 'mongodb does not support indexes'],
        expectedAnswer: 'SQL databases use rigid tabular schemas with foreign keys and ACID joins. MongoDB stores flexible, semi-structured BSON documents within collections. MongoDB optimizes for high write throughput, denormalized embedded documents, and horizontal sharding.',
        type: 'descriptive',
      },
      {
        question: 'What are MongoDB Indexes and how do they improve query performance?',
        essentialConcepts: ['b-tree index', 'collscan vs ixscan', 'single field index', 'query execution time'],
        misconceptions: ['adding indexes to every field is best practice', 'indexes speed up both reads and writes equally'],
        expectedAnswer: 'Indexes store a small portion of the collection data in an ordered B-tree structure, allowing queries to search through an index (IXSCAN) instead of scanning every document in the collection (COLLSCAN). Indexes dramatically speed up read queries but add write overhead.',
        type: 'descriptive',
      },
    ],
    Intermediate: [
      {
        question: 'Explain MongoDB Aggregation Pipeline: How do $match, $group, $project, and $lookup work together?',
        essentialConcepts: ['aggregation pipeline stages', 'pipeline optimization', 'stage ordering', 'memory limits'],
        misconceptions: ['$lookup performs faster than SQL joins on large tables', '$match order in pipeline has no performance impact'],
        expectedAnswer: 'The aggregation pipeline processes documents through multi-stage sequences. $match filters documents early to leverage indexes; $group aggregates values across documents by key; $project reshapes fields; $lookup performs left-outer equality joins with other collections. Early filtering minimizes working set memory usage.',
        type: 'descriptive',
      },
      {
        question: 'When should you embed documents versus reference documents with ObjectIds in MongoDB schema design?',
        essentialConcepts: ['one-to-few vs one-to-many', 'atomic updates', 'unbounded array growth', '16mb document limit'],
        misconceptions: ['embedding is always better in nosql', 'referencing prevents atomicity completely'],
        expectedAnswer: 'Embed documents for 1-to-few relations where data is read together and updates require single-document atomicity (e.g. order items). Reference documents with ObjectIds for 1-to-many or 1-to-squillions relations to prevent unbounded array growth and hitting MongoDB 16MB document size limit.',
        type: 'descriptive',
      },
    ],
    Advanced: [
      {
        question: 'How do Compound Indexes, the Equality-Sort-Range (ESR) rule, and Partial Indexes optimize query plans in MongoDB?',
        essentialConcepts: ['compound index', 'esr rule', 'index prefix', 'partial index', 'explain plan'],
        misconceptions: ['field order in compound indexes does not matter', 'compound index can be used if query skips leading prefix'],
        expectedAnswer: 'Compound indexes index multiple fields. The ESR rule dictates placing Equality fields first to narrow candidates, Sort fields second to avoid in-memory sorting, and Range fields last. Partial indexes index only documents matching a filter expression, reducing index storage size and write maintenance costs.',
        type: 'descriptive',
      },
    ],
  },
  'MERN Stack': {
    Beginner: [
      {
        question: 'Walk through the complete architectural flow of a request from React frontend to MongoDB database and back.',
        essentialConcepts: ['http fetch/axios', 'express router', 'middleware', 'controller', 'mongoose model', 'json response'],
        misconceptions: ['react talks directly to mongodb in standard mern stack', 'express sends html to react client on every api call'],
        expectedAnswer: 'User interaction triggers an HTTP request via fetch/axios in React. The request hits Express router via reverse proxy/CORS, executes auth/validation middleware, runs controller logic, queries MongoDB through Mongoose models, and returns JSON to React to update state and trigger UI reconciliation.',
        type: 'descriptive',
      },
    ],
    Intermediate: [
      {
        question: 'How do you implement secure JWT authentication with HttpOnly cookies, refresh token rotation, and CSRF protection in MERN?',
        essentialConcepts: ['jwt access token', 'refresh token rotation', 'httponly secure samesite cookies', 'csrf protection', 'token expiration'],
        misconceptions: ['storing jwt tokens in localstorage is completely secure against xss', 'refresh tokens should never expire'],
        expectedAnswer: 'Store short-lived access tokens (15m) in memory and long-lived refresh tokens in HttpOnly, Secure, SameSite cookies to protect against XSS. When the access token expires, the client sends the cookie to a refresh endpoint which verifies the token, invalidates the old one, and issues a rotated pair, mitigating token theft.',
        type: 'descriptive',
      },
      {
        question: 'How do you handle optimistic UI updates in React when saving data to Express backend?',
        essentialConcepts: ['optimistic ui', 'instant user feedback', 'rollback on error', 'server synchronization'],
        misconceptions: ['optimistic ui means ignoring server validation', 'state should never change before server returns 200'],
        expectedAnswer: 'Optimistic UI updates local React state immediately on user action to provide an instant, zero-latency experience. If the background API call succeeds, the state is confirmed; if the call rejects, the application rolls back the local state to previous snapshot and surfaces an error notification.',
        type: 'descriptive',
      },
    ],
    Advanced: [
      {
        question: 'How would you scale a MERN stack application experiencing race conditions during simultaneous inventory purchases?',
        essentialConcepts: ['concurrency control', 'mongodb atomic operators $inc', 'optimistic concurrency version keys', 'redis distributed lock'],
        misconceptions: ['standard javascript async/await prevents database race conditions across server instances', 'transactions eliminate the need for index optimization'],
        expectedAnswer: 'To prevent double-spending or overselling under high concurrency: 1) Use atomic conditional updates in MongoDB (e.g. findOneAndUpdate with { inventory: { $gt: 0 }, $inc: { inventory: -1 } }), 2) Use Mongoose version keys (__v) for optimistic concurrency control, or 3) Acquire a distributed lock via Redis (Redlock) around critical checkout sections.',
        type: 'descriptive',
      },
    ],
  },
  'HR & Behavioral': {
    Beginner: [
      {
        question: 'Tell me about yourself, your technical background, and what drives your passion for software development.',
        essentialConcepts: ['concise narrative', 'technical strengths', 'career trajectory', 'passion for learning'],
        misconceptions: ['reciting personal life history from childhood', 'repeating entire resume word-for-word'],
        expectedAnswer: 'A structured 2-minute narrative highlighting education/background, core technical expertise, recent impactful projects, and enthusiasm for building scalable products and continuous learning.',
        type: 'descriptive',
      },
    ],
    Intermediate: [
      {
        question: 'Describe a situation where you encountered a critical production bug or tight deadline. How did you handle it using the STAR method?',
        essentialConcepts: ['situation', 'task', 'action', 'result', 'ownership', 'calm under pressure'],
        misconceptions: ['blaming team members for bugs', 'focusing only on the problem without measurable resolution'],
        expectedAnswer: 'A STAR structured answer: Situation (outage context), Task (objective to restore service), Action (root cause isolation, rollback, hotfix, monitoring), and Result (downtime minimized, post-mortem created, regression tests added).',
        type: 'descriptive',
      },
      {
        question: 'How do you handle disagreements with a peer or team lead regarding a technical decision or code review?',
        essentialConcepts: ['objective evaluation', 'data-driven discussion', 'active listening', 'disagree and commit'],
        misconceptions: ['insisting on personal preference regardless of team standards', 'passively ignoring review comments'],
        expectedAnswer: 'Focus on technical tradeoffs and objective metrics (performance, maintainability, requirements) rather than ego. Listen actively to their rationale, build small prototypes to benchmark if needed, and commit fully to the team decision once reached.',
        type: 'descriptive',
      },
    ],
    Advanced: [
      {
        question: 'How do you prioritize technical debt versus new product features when communicating with non-technical stakeholders?',
        essentialConcepts: ['business value translation', 'risk mitigation', 'velocity impact', 'incremental refactoring'],
        misconceptions: ['demanding complete codebase rewrites every few months', 'hiding technical debt from product managers'],
        expectedAnswer: 'Translate technical debt into tangible business risks and metrics (system reliability, developer velocity, operational cost, security). Propose incremental refactoring integrated into feature sprints rather than halt all product delivery for multi-month rewrites.',
        type: 'descriptive',
      },
    ],
  },
};

// Aliases for categories
const CATEGORY_MAP = {
  JavaScript: 'JavaScript',
  'React.js': 'React.js',
  'Node.js': 'Node.js',
  'Express.js': 'Node.js',
  MongoDB: 'MongoDB',
  'MERN Stack': 'MERN Stack',
  Java: 'JavaScript', // fallback to general/JS if Java specific not requested
  HTML: 'React.js',
  CSS: 'React.js',
  'HR Interview': 'HR & Behavioral',
  'Behavioral Interview': 'HR & Behavioral',
  'HR & Behavioral': 'HR & Behavioral',
  'Resume-Based Interview': 'MERN Stack',
};

/**
 * Generate a dynamic, non-repeating question
 */
function getDynamicQuestion({
  category = 'JavaScript',
  difficulty = 'Intermediate',
  questionIndex = 0,
  previousQuestions = [],
  pastAskedQuestions = [],
  resumeSnapshot = null,
  interviewType = 'Mixed',
}) {
  const mappedCat = CATEGORY_MAP[category] || 'JavaScript';
  const catBank = QUESTION_BANK[mappedCat] || QUESTION_BANK['JavaScript'];

  let diffKey = difficulty;
  if (diffKey === 'Easy') diffKey = 'Beginner';
  if (diffKey === 'Medium') diffKey = 'Intermediate';
  if (diffKey === 'Hard') diffKey = 'Advanced';

  const diffBank = catBank[diffKey] || catBank['Intermediate'] || catBank['Beginner'] || Object.values(catBank)[0];

  // Combine current session questions and user past interview questions
  const allBlacklisted = [...previousQuestions, ...pastAskedQuestions].filter(Boolean);

  // Filter pool of questions that have NOT been asked
  const candidates = diffBank.filter((q) => {
    return !allBlacklisted.some((prev) => calculateSimilarity(prev, q.question) > 0.45);
  });

  // If candidate has verified resume and projects, synthesize a project question
  if (resumeSnapshot && resumeSnapshot.projects && resumeSnapshot.projects.length > 0 && questionIndex % 2 === 1) {
    const projIdx = (questionIndex - 1) % resumeSnapshot.projects.length;
    const project = resumeSnapshot.projects[projIdx];
    const techName = project.technologies?.[0] || 'the core architecture';

    const resumeQuestionText = `In your project "${project.title}", how did you design the state flow, data persistence, and API contracts using ${techName}? What specific production trade-off did you make?`;

    if (!allBlacklisted.some((prev) => calculateSimilarity(prev, resumeQuestionText) > 0.45)) {
      return {
        question: resumeQuestionText,
        category: `Project: ${project.title}`,
        difficulty: diffKey,
        type: 'descriptive',
        expectedAnswer: `A detailed architectural breakdown of ${project.title} covering state management, network calls, database design, and real engineering decisions made during implementation.`,
        essentialConcepts: [techName, 'Architecture Design', 'State Flow', 'Trade-offs'],
        supportingConcepts: ['API Contracts', 'Error Handling', 'Production Scalability'],
        misconceptions: ['Vague generic answers without specific implementation details', 'Not knowing own project architecture'],
      };
    }
  }

  // Pick the freshest candidate or dynamically rotate with random seed
  let selected = null;
  if (candidates.length > 0) {
    // Pick using pseudo-random offset based on question index + timestamp
    const pickIndex = (questionIndex + Math.floor(Math.random() * candidates.length)) % candidates.length;
    selected = candidates[pickIndex];
  } else {
    // If all in current difficulty exhausted, check other difficulties or rotate
    const allQuestions = Object.values(catBank).flat();
    const secondaryAvailable = allQuestions.filter((q) => {
      return !allBlacklisted.some((prev) => calculateSimilarity(prev, q.question) > 0.5);
    });

    if (secondaryAvailable.length > 0) {
      selected = secondaryAvailable[0];
    } else {
      // Re-seed with variation
      selected = diffBank[questionIndex % diffBank.length];
    }
  }

  return {
    question: selected.question,
    category: mappedCat,
    difficulty: diffKey,
    type: selected.type || 'descriptive',
    options: selected.options || [],
    expectedAnswer: selected.expectedAnswer,
    essentialConcepts: selected.essentialConcepts || [],
    supportingConcepts: selected.supportingConcepts || [],
    misconceptions: selected.misconceptions || [],
  };
}

/**
 * Strict rubric-based answer evaluation
 */
function evaluateAnswerStrictly({
  category = 'General',
  difficulty = 'Intermediate',
  question,
  userAnswer = '',
  expectedAnswer = '',
  essentialConcepts = [],
  supportingConcepts = [],
  misconceptions = [],
}) {
  const cleanAnswer = (userAnswer || '').trim();
  const lowerAnswer = cleanAnswer.toLowerCase();
  const wordCount = cleanAnswer.split(/\s+/).filter(Boolean).length;

  // Empty or non-responsive answer -> Strict 0 marks
  if (!cleanAnswer || wordCount < 3) {
    return {
      status: 'incorrect',
      score: 0,
      maxScore: 100,
      scoreBreakdown: {
        technicalAccuracy: 0,
        conceptUnderstanding: 0,
        completeness: 0,
        clarity: 0,
      },
      feedback: 'No meaningful technical answer provided. An answer must be articulated to receive credit.',
      referenceAnswer: expectedAnswer || 'Refer to standard technical documentation.',
      missingConcepts: essentialConcepts,
      incorrectStatements: ['No substantive answer submitted.'],
      strengths: [],
      weaknesses: ['Zero technical concepts identified.'],
      improvementTips: ['Review core fundamentals and articulate key mechanisms with practical examples.'],
    };
  }

  // Concept coverage evaluation
  let essentialMatches = 0;
  const missingConcepts = [];

  essentialConcepts.forEach((concept) => {
    const tokens = concept.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const hasMatch = tokens.some((token) => lowerAnswer.includes(token));
    if (hasMatch) {
      essentialMatches++;
    } else {
      missingConcepts.push(concept);
    }
  });

  const conceptCoverageRatio = essentialConcepts.length > 0 ? essentialMatches / essentialConcepts.length : 0.5;

  // Misconception penalty
  let misconceptionCount = 0;
  const detectedMisconceptions = [];
  misconceptions.forEach((misc) => {
    const tokens = misc.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const hasMatch = tokens.filter((t) => lowerAnswer.includes(t)).length >= 2;
    if (hasMatch) {
      misconceptionCount++;
      detectedMisconceptions.push(misc);
    }
  });

  // Calculate rubric component scores
  // Technical Accuracy: 50%
  let technicalAccuracy = Math.round(conceptCoverageRatio * 50);
  if (misconceptionCount > 0) technicalAccuracy = Math.max(0, technicalAccuracy - misconceptionCount * 15);

  // Concept Understanding: 25%
  let conceptUnderstanding = Math.round(conceptCoverageRatio * 25);
  if (wordCount > 30 && conceptCoverageRatio > 0.4) conceptUnderstanding = Math.min(25, conceptUnderstanding + 5);

  // Completeness: 15%
  let completeness = Math.round(conceptCoverageRatio * 15);
  if (wordCount < 10) completeness = Math.min(completeness, 3);

  // Clarity: 10%
  let clarity = 8;
  if (wordCount < 6) clarity = 2;

  const totalScore = Math.min(100, Math.max(0, technicalAccuracy + conceptUnderstanding + completeness + clarity));

  let status = 'incorrect';
  if (totalScore >= 70) status = 'correct';
  else if (totalScore >= 35) status = 'partially_correct';

  const strengths = [];
  const weaknesses = [];

  if (essentialMatches > 0) strengths.push(`Identified key concepts: ${essentialConcepts.slice(0, essentialMatches).join(', ')}.`);
  if (missingConcepts.length > 0) weaknesses.push(`Missed vital concepts: ${missingConcepts.join(', ')}.`);
  if (detectedMisconceptions.length > 0) weaknesses.push(`Contains technical misconception: ${detectedMisconceptions.join(', ')}.`);

  let feedback = '';
  if (status === 'correct') {
    feedback = 'Strong technical answer! You clearly demonstrated accurate understanding of the core mechanisms.';
  } else if (status === 'partially_correct') {
    feedback = `Partially correct. You touched on relevant points, but omitted essential details: ${missingConcepts.slice(0, 2).join(', ')}.`;
  } else {
    feedback = `Incorrect or incomplete answer. The response did not explain: ${essentialConcepts.slice(0, 2).join(', ')}.`;
  }

  return {
    status,
    score: totalScore,
    maxScore: 100,
    scoreBreakdown: {
      technicalAccuracy,
      conceptUnderstanding,
      completeness,
      clarity,
    },
    feedback,
    referenceAnswer: expectedAnswer || 'Refer to official documentation for complete implementation details.',
    missingConcepts,
    incorrectStatements: detectedMisconceptions,
    strengths,
    weaknesses,
    improvementTips: [
      `Review ${category} documentation on: ${missingConcepts.slice(0, 2).join(', ') || 'edge cases'}.`,
      'Structure future answers with: Definition -> Internal Mechanism -> Trade-offs -> Concrete Example.',
    ],
  };
}

module.exports = {
  QUESTION_BANK,
  evaluateAnswerStrictly,
  getDynamicQuestion,
  normalizeText,
  calculateSimilarity,
};
