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
      {
        question: 'What role does Mongoose play in a MERN stack application compared to using the native MongoDB driver?',
        essentialConcepts: ['schema validation', 'odm object data modeling', 'middleware hooks', 'type casting', 'population'],
        misconceptions: ['mongoose is a separate database', 'mongodb enforces schema by default without odm'],
        expectedAnswer: 'Mongoose is an Object Data Modeling (ODM) library for MongoDB and Node.js. It provides rigorous schema validation, type casting, pre/post middleware hooks, and business logic methods on documents, providing structural guarantees over the schemaless nature of MongoDB.',
        type: 'descriptive',
      },
      {
        question: 'How do you securely manage environment variables across React client and Node.js Express server in MERN?',
        essentialConcepts: ['dotenv', 'process.env', 'vite env prefixes VITE_', 'secret leakage prevention'],
        misconceptions: ['client-side env variables are secret and secure', 'putting db connection strings in react .env is safe'],
        expectedAnswer: 'Server secrets (database URIs, JWT private keys, API secrets) must remain strictly on the backend managed via dotenv. Client-side variables in React/Vite must use specific prefixes (VITE_) and only expose non-sensitive public constants like base API URLs, because all client bundles are publicly inspectable in the browser.',
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
      {
        question: 'How do you implement pagination, search filtering, and sorting efficiently in a MERN stack REST API?',
        essentialConcepts: ['limit and skip', 'cursor based pagination', 'regex text indexing', 'sort index alignment'],
        misconceptions: ['skip and limit scale well to millions of records', 'filtering with regex without index is fast'],
        expectedAnswer: 'For large datasets, use cursor-based (keyset) pagination using indexed fields like _id or timestamps rather than offset skip(), which degrades to O(N). Ensure query filter and sort fields are covered by compound indexes following the Equality-Sort-Range rule.',
        type: 'descriptive',
      },
      {
        question: 'How do you handle file uploads in MERN using Multer in Express and display them in React?',
        essentialConcepts: ['multipart/form-data', 'multer memory or disk storage', 'file type and size validation', 'cloud storage/static serving'],
        misconceptions: ['sending base64 JSON is better than multipart for large files', 'multer handles file validation automatically without config'],
        expectedAnswer: 'React packages files into FormData with multipart/form-data encoding without manually setting Content-Type so the browser sets the boundary. Express uses Multer middleware with storage engine, validating file mimetype and max size before saving to storage (S3/disk) and returning a persistent URL.',
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
      {
        question: 'How would you architect a real-time collaborative feature (such as live chat or document editing) across a clustered MERN deployment?',
        essentialConcepts: ['socket.io / websockets', 'redis adapter / pub-sub', 'sticky sessions', 'state synchronization'],
        misconceptions: ['single socket.io instance scales across multiple servers automatically', 'websockets require polling on every message'],
        expectedAnswer: 'Use WebSockets (Socket.io) with the Redis Pub/Sub adapter to broadcast messages across multiple Node.js server instances behind an NGINX load balancer configured with sticky sessions or WebSocket upgrade headers. Persist message history in MongoDB with compound indexing on conversationId and timestamp.',
        type: 'descriptive',
      },
      {
        question: 'Describe how you diagnose and fix an Event Loop lag and memory leak in a production Node.js/Express service.',
        essentialConcepts: ['heap snapshot', 'clinic.js / v8 inspector', 'event loop latency', 'closure retention', 'unhandled streams'],
        misconceptions: ['node.js cluster mode eliminates all memory leaks', 'restarting the server with pm2 is a permanent solution'],
        expectedAnswer: 'Monitor Event Loop Utilization and lag with perf_hooks. Take memory heap snapshots via node --inspect or Clinic.js at intervals and diff retainers to isolate objects kept alive by uncollected closures, lingering event listeners, or global caches. Ensure streams are piped with backpressure and closed cleanly.',
        type: 'descriptive',
      },
    ],
  },
  Java: {
    Beginner: [
      {
        question: 'Explain the four core principles of Object-Oriented Programming (OOP) in Java with examples.',
        essentialConcepts: ['encapsulation', 'inheritance', 'polymorphism', 'abstraction'],
        misconceptions: ['interfaces cannot have default methods in modern java', 'private variables can be inherited directly by subclasses'],
        expectedAnswer: 'Encapsulation bundles data and methods, restricting direct access via access modifiers and getters/setters. Inheritance allows a child class to inherit fields and methods from a parent class. Polymorphism allows methods to perform different tasks based on object invocation (method overloading and overriding). Abstraction hides complex internal implementation details using abstract classes and interfaces.',
        type: 'descriptive',
      },
      {
        question: 'What is the difference between ArrayList and LinkedList in Java regarding performance and internal memory structure?',
        essentialConcepts: ['dynamic array', 'doubly linked list', 'random access O(1)', 'insertion deletion O(1)'],
        misconceptions: ['linkedlist is always faster than arraylist for all operations', 'arraylist has fixed capacity that cannot grow'],
        expectedAnswer: 'ArrayList is backed by a contiguous resizable array providing fast O(1) random access by index, but costly O(N) shifts on arbitrary insertions. LinkedList is backed by doubly linked nodes providing O(1) insertion/deletion once the position is located, but O(N) sequential traversal with higher per-node pointer memory overhead.',
        type: 'descriptive',
      },
    ],
    Intermediate: [
      {
        question: 'How does the Java Memory Model divide Heap and Stack, and how does Garbage Collection (GC) manage object lifecycles?',
        essentialConcepts: ['heap space', 'stack memory', 'young and old generation', 'minor vs major gc', 'mark and sweep'],
        misconceptions: ['primitive variables in methods are stored on the heap', 'calling System.gc() guarantees immediate full garbage collection'],
        expectedAnswer: 'Stack memory stores method call frames and local primitive variables/object references with strict thread-isolation and automatic cleanup on method exit. Heap memory stores all object instances and class metadata shared across threads. Modern GCs (G1, ZGC) partition the heap into Eden, Survivor, and Tenured generations, moving surviving objects after generational mark-and-sweep cycles.',
        type: 'descriptive',
      },
      {
        question: 'Explain multithreading and synchronization in Java: What is the difference between synchronized blocks, ReentrantLock, and volatile?',
        essentialConcepts: ['thread safety', 'synchronized monitor lock', 'reentrantlock fairness', 'volatile memory visibility', 'happens-before'],
        misconceptions: ['volatile guarantees atomic increments like count++', 'synchronized blocks block all methods of a class globally'],
        expectedAnswer: 'synchronized locks an object monitor implicitly, releasing on block exit. ReentrantLock provides explicit locking with tryLock timeout, interruptible lock acquisition, and fairness options. volatile guarantees memory visibility across threads (reading directly from main memory without CPU cache caching) and prevents instruction reordering, but does not provide mutual exclusion or compound atomicity.',
        type: 'descriptive',
      },
    ],
    Advanced: [
      {
        question: 'How do Java 21 Virtual Threads (Project Loom) differ from platform OS threads, and how do they achieve high concurrency?',
        essentialConcepts: ['virtual threads', 'carrier threads', 'continuation', 'unmounting on blocking i/o', 'forkjoinpool'],
        misconceptions: ['virtual threads make cpu-heavy tasks faster', 'virtual threads should be pooled like thread pools'],
        expectedAnswer: 'Platform threads are 1:1 wrappers around OS kernel threads with heavy ~1MB stack allocation, limiting scalability to thousands. Virtual threads are lightweight, user-mode threads managed by the JVM. When a virtual thread encounters blocking I/O, its continuation is unmounted from the underlying carrier thread in ForkJoinPool and stored in heap memory, allowing the carrier thread to execute other work.',
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
  Java: 'Java',
  HTML: 'React.js',
  CSS: 'React.js',
  'HR Interview': 'HR & Behavioral',
  'Behavioral Interview': 'HR & Behavioral',
  'HR & Behavioral': 'HR & Behavioral',
  'Resume-Based Interview': 'MERN Stack',
};

// Dynamic Scenario Synthesizer when static questions in category are exhausted
function synthesizeDynamicQuestion({
  category = 'MERN Stack',
  difficulty = 'Intermediate',
  questionIndex = 0,
  allBlacklisted = [],
}) {
  const dynamicScenarios = [
    {
      topic: 'High Traffic & Database Sharding',
      question: `In a high-throughput ${category} environment, how would you design schema partitioning, horizontal read scaling with replica sets, and query routing to prevent saturation under sudden spikes?`,
      concepts: ['replica sets', 'read preference secondary', 'sharding key selection', 'connection pooling'],
      expected: 'Configure MongoDB replica sets with readPreference nearest or secondaryPreferred for read-heavy operations. Choose a high-cardinality shard key to prevent jumbo chunks and ensure even distribution across mongos routers. Size Mongoose connection pool appropriately.',
    },
    {
      topic: 'Real-Time Event Processing & WebSockets',
      question: `How would you architect a fault-tolerant real-time collaborative system in ${category} using WebSockets or Server-Sent Events, ensuring reconnection resilience and horizontal scaling across multiple Node.js instances?`,
      concepts: ['websocket handshake', 'redis pub/sub adapter', 'socket reconnection state', 'heartbeat ping pong'],
      expected: 'Deploy multiple Node/Express instances behind a load balancer with sticky sessions or Redis Pub/Sub adapter to broadcast messages across instances. Implement client heartbeat intervals and idempotent event queue replay upon reconnection.',
    },
    {
      topic: 'Security, XSS, and NoSQL Injection',
      question: `Explain how you defend a production ${category} service against NoSQL injection, Cross-Site Scripting (XSS), and prototype pollution attacks. What specific sanitization layers do you implement?`,
      concepts: ['nosql query sanitization', 'express-mongo-sanitize', 'content security policy', 'object freeze prototype'],
      expected: 'Use express-mongo-sanitize to strip $ and . operators from user input to block NoSQL injection. Enforce strict Content Security Policy (CSP) headers, sanitize rendered HTML with DOMPurify, and validate schemas strictly with Joi or Zod before DB ingestion.',
    },
    {
      topic: 'Microservices & Distributed Transactions',
      question: `When decomposing a monolithic ${category} application into microservices, how do you handle distributed transactions and eventual consistency between independent service databases?`,
      concepts: ['saga pattern', 'two-phase commit', 'outbox pattern', 'idempotent consumer'],
      expected: 'Implement the Saga pattern with choreography or orchestration using a message broker (RabbitMQ/Kafka). Use the transactional outbox pattern to guarantee event publication from local MongoDB writes, and ensure consuming handlers are idempotent with deduplication keys.',
    },
    {
      topic: 'Memory Profiling & Event Loop Monitoring',
      question: `A production ${category} service experiences rising CPU and memory consumption over 48 hours until crashing with Out-of-Memory (OOM). What exact diagnostic steps and tools do you use to locate the leak?`,
      concepts: ['heap snapshot', 'v8 inspector', 'event loop lag', 'retainer tree analysis'],
      expected: 'Connect Chrome DevTools or Clinic.js via node --inspect. Take heap snapshots at 1-hour intervals and compare delta retainers to find accumulating closures, uncollected event listeners, or global caches. Monitor Event Loop Utilization (ELU) via perf_hooks.',
    },
    {
      topic: 'Optimistic Locking & Versioning',
      question: `In an enterprise ${category} application with concurrent editors modifying the same document, how do you design optimistic concurrency control and resolve conflicting updates cleanly for the user?`,
      concepts: ['optimistic concurrency', 'version key __v', 'conflict resolution', '3-way merge'],
      expected: 'Utilize Mongoose __v version keys or timestamp versioning. When saving, check that the persisted version matches the loaded version; if a conflict (409) occurs, provide a 3-way merge UI or prompt the user to refresh and reapply differences.',
    },
    {
      topic: 'Caching & Cache Invalidation',
      question: `Explain your cache invalidation strategy in ${category} when using Redis alongside MongoDB. How do you mitigate the cache stampede (thundering herd) and stale read problems?`,
      concepts: ['cache aside pattern', 'write-through cache', 'cache stampede mutex', 'probabilistic early expiration'],
      expected: 'Adopt the Cache-Aside pattern with TTL. For cache stampede mitigation, use distributed mutex locks (e.g. Redlock) or probabilistic early expiration (XFetch) so only one worker queries the primary DB to populate cache while others wait or receive slightly stale data temporarily.',
    },
    {
      topic: 'Zero-Downtime Deployment & Database Migration',
      question: `How do you execute zero-downtime database schema migrations in ${category} when moving from embedded documents to normalized referenced models while handling live traffic?`,
      concepts: ['expand and contract pattern', 'dual writing', 'backfill migration script', 'feature flags'],
      expected: 'Use the Expand and Contract pattern: 1) Expand schema with new field and write to both formats simultaneously, 2) Run asynchronous idempotent backfill script for historical data, 3) Switch reads to new format via feature flag, 4) Contract and remove deprecated embedded fields.',
    },
  ];

  for (let offset = 0; offset < dynamicScenarios.length; offset++) {
    const idx = (questionIndex + offset) % dynamicScenarios.length;
    const scen = dynamicScenarios[idx];
    if (!allBlacklisted.some((prev) => calculateSimilarity(prev, scen.question) > 0.35)) {
      return {
        question: scen.question,
        category: `${category} - ${scen.topic}`,
        difficulty,
        type: 'descriptive',
        expectedAnswer: scen.expected,
        essentialConcepts: scen.concepts,
        supportingConcepts: ['Production Architecture', 'Fault Tolerance'],
        misconceptions: ['Ignoring edge cases', 'Relying solely on in-memory single-node primitives'],
      };
    }
  }

  // Fallback parametric generation
  const hash = Math.floor(Math.random() * 9000 + 1000);
  const synthesizedText = `Practical Scenario [Ref-${hash}]: How would you optimize query indexing, API latency, and state caching in a production ${category} deployment serving 100,000 daily active users?`;
  return {
    question: synthesizedText,
    category,
    difficulty,
    type: 'descriptive',
    expectedAnswer: `A comprehensive architectural plan for ${category} covering CDN asset caching, Redis query caching, compound MongoDB indexes, and Node.js clustering.`,
    essentialConcepts: ['CDN caching', 'Redis', 'Compound Indexes', 'Cluster Mode'],
    supportingConcepts: ['Scalability', 'Observability'],
    misconceptions: ['Premature microservices without profiling'],
  };
}

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
      // Dynamically synthesize a fresh, non-repeating scenario question
      return synthesizeDynamicQuestion({
        category: mappedCat,
        difficulty: diffKey,
        questionIndex,
        allBlacklisted,
      });
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

// Hinglish and Hindi common conversational phrase normalizer
function normalizeHinglish(text) {
  if (!text) return '';
  let str = text.toLowerCase();

  const phraseMap = [
    { regex: /\bstate maintain karne ke liye\b|\bstate maintain karne\b/g, rep: 'manages state' },
    { regex: /\bcomponent re-render karta hai\b|\bre-render karta hai\b|\bre-render karti hai\b/g, rep: 'triggers component re-rendering' },
    { regex: /\bhota hai\b|\bhoti hai\b|\bhote hain\b|\bhota\b|\bhoti\b/g, rep: 'is' },
    { regex: /\bkarta hai\b|\bkarti hai\b|\bkarte hain\b|\bkarta\b/g, rep: 'executes' },
    { regex: /\bnahi\b|\bnahin\b|\bna\b/g, rep: 'not' },
    { regex: /\bkyunki\b|\bkyuki\b|\bkyoki\b/g, rep: 'because' },
    { regex: /\bmatlab\b|\bka matlab\b/g, rep: 'meaning' },
    { regex: /\buse karte hain\b|\buse karte\b|\buse hota hai\b/g, rep: 'uses' },
    { regex: /\byeh\b|\bye\b/g, rep: 'this' },
    { regex: /\bwoh\b|\bwo\b/g, rep: 'that' },
    { regex: /\bkaise\b/g, rep: 'how' },
    { regex: /\bkaha\b|\bkahan\b/g, rep: 'where' },
    { regex: /\baur\b/g, rep: 'and' },
    { regex: /\blekin\b|\bpar\b/g, rep: 'but' },
    { regex: /\bchange nahi hota\b|\bchange nahi ho sakta\b/g, rep: 'immutable cannot be reassigned' },
    { regex: /\bchange ho sakta hai\b/g, rep: 'can be reassigned mutable' },
    { regex: /\btop pe chala jata hai\b|\btop par jata hai\b/g, rep: 'hoisted to top' },
    { regex: /\bmemory me\b/g, rep: 'in memory' },
    { regex: /\bfunction ke andar\b/g, rep: 'inside function scope' },
    { regex: /\bblock ke andar\b/g, rep: 'inside block scope' },
  ];

  for (const item of phraseMap) {
    str = str.replace(item.regex, item.rep);
  }
  return str;
}

/**
 * Technical Semantic Concept Dictionary
 * Maps technical keywords and phrases to their conceptual intent across core subjects
 */
const SEMANTIC_TOPIC_SYNONYMS = {
  scope: ['scope', 'lexical', 'visibility', 'accessible', 'lifetime', 'where it can be accessed', 'block', 'function level', 'curly braces'],
  hoisting: ['hoist', 'hoisted', 'lifted', 'top of the scope', 'temporal dead zone', 'tdz', 'initialization', 'declaration', 'before definition'],
  reassignment: ['reassign', 'reassigned', 'reassignment', 'change value', 'redeclared', 're-declaration', 'immutable', 'const', 'cannot be changed'],
  coercion: ['coercion', 'type conversion', 'converted', 'implicit', 'automatic conversion', 'typecast', 'coerced'],
  strict_equality: ['strict', 'both type and value', 'type and value', 'without conversion', 'triple equals', 'identical type'],
  closure: ['closure', 'lexical scope', 'outer function', 'inner function', 'retains access', 'persists', 'data privacy', 'encapsulation', 'variable retention'],
  this_binding: ['this', 'invocation', 'invoked', 'invoke', 'call', 'apply', 'bind', 'lexical', 'enclosing', 'arrow function', 'execution context', 'caller'],
  event_loop: ['event loop', 'call stack', 'microtask', 'macrotask', 'task queue', 'callback queue', 'non-blocking', 'single thread', 'asynchronous'],
  virtual_dom: ['virtual dom', 'vdom', 'in-memory', 'tree', 'reconciliation', 'diff', 'diffing', 'minimal dom updates', 'batching'],
  react_hooks: ['hooks', 'top level', 'state', 'useeffect', 'usestate', 'fiber', 'call order', 'lifecycle', 're-render'],
  keys: ['key', 'keys', 'identity', 'reconciliation', 'reordering', 'performance', 'unique', 'unmount', 'preserve state'],
  indexing: ['index', 'indexing', 'b-tree', 'lookup', 'fast search', 'compound index', 'scan', 'performance', 'query optimization'],
  middleware: ['middleware', 'request', 'response', 'next', 'pipeline', 'interceptor', 'auth', 'cors', 'error handler'],
  clustering: ['cluster', 'child process', 'cores', 'fork', 'load balance', 'cpu bound', 'worker'],
  rest: ['rest', 'http', 'stateless', 'crud', 'get', 'post', 'put', 'delete', 'status code', 'idempotent'],
};

/**
 * Intelligent Semantic Answer Evaluation Engine
 * Evaluates conceptual understanding, handles English, Hindi & Hinglish,
 * detects misconceptions, and generates structured feedback + Elena's spoken response.
 */
function evaluateAnswerStrictly({
  category = 'General',
  difficulty = 'Intermediate',
  question = '',
  userAnswer = '',
  expectedAnswer = '',
  essentialConcepts = [],
  supportingConcepts = [],
  misconceptions = [],
  candidateName = 'Candidate',
}) {
  const cleanAnswer = (userAnswer || '').trim();
  const wordCount = cleanAnswer.split(/\s+/).filter(Boolean).length;

  // 1. Check for empty or trivial input (< 3 words)
  if (!cleanAnswer || wordCount < 3) {
    const feedback = 'No substantive technical answer was detected from your speech. Please articulate your technical reasoning clearly.';
    const spokenResponse = `I wasn't able to catch your technical answer, ${candidateName}. Could you please speak into the microphone or type out your explanation?`;

    return {
      result: 'needs_clarification',
      status: 'needs_clarification',
      score: 0,
      maxScore: 100,
      accuracy: 'Needs Improvement',
      technicalKnowledge: 'Basic',
      feedback,
      strengths: [],
      mistakes: ['No audible or written answer submitted.'],
      correctExplanation: expectedAnswer || 'Refer to official technical documentation.',
      improvementTips: ['Speak clearly and outline the primary definition followed by internal mechanics.'],
      suggestedAnswer: expectedAnswer || 'A professional interview answer explains definition, mechanics, and tradeoffs.',
      spokenResponse,
      spokenScript: spokenResponse,
    };
  }

  // 2. Normalize text and handle Hinglish conversion
  const hinglishNormalized = normalizeHinglish(cleanAnswer);
  const lowerAnswer = hinglishNormalized.toLowerCase();

  // 3. Concept understanding evaluation using semantic synonyms
  let matchedConcepts = 0;
  const missingList = [];
  const identifiedStrengths = [];

  const conceptsToTest = essentialConcepts && essentialConcepts.length > 0
    ? essentialConcepts
    : ['core concept', 'mechanism', 'tradeoff'];

  conceptsToTest.forEach((concept) => {
    const conceptLower = concept.toLowerCase();
    const conceptTokens = conceptLower.split(/\s+/).filter((w) => w.length > 2);

    // Direct token match and stem matching
    let hasMatch = conceptTokens.some((token) => {
      if (lowerAnswer.includes(token)) return true;
      if (token.length > 5) {
        const stem = token.slice(0, token.length - 2);
        return lowerAnswer.includes(stem);
      }
      return false;
    });

    // Synonym cluster match
    if (!hasMatch) {
      for (const [key, synonyms] of Object.entries(SEMANTIC_TOPIC_SYNONYMS)) {
        if (conceptLower.includes(key) || synonyms.some((s) => conceptLower.includes(s))) {
          if (synonyms.some((syn) => lowerAnswer.includes(syn))) {
            hasMatch = true;
            break;
          }
        }
      }
    }

    if (hasMatch) {
      matchedConcepts++;
      identifiedStrengths.push(concept);
    } else {
      missingList.push(concept);
    }
  });

  const conceptRatio = conceptsToTest.length > 0 ? matchedConcepts / conceptsToTest.length : 0.5;

  // 4. Misconception analysis
  let misconceptionPenalties = 0;
  const detectedMistakes = [];

  if (Array.isArray(misconceptions)) {
    misconceptions.forEach((misc) => {
      const tokens = misc.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const matchCount = tokens.filter((t) => lowerAnswer.includes(t)).length;
      if (matchCount >= 2) {
        misconceptionPenalties++;
        detectedMistakes.push(misc);
      }
    });
  }

  // 5. Semantic depth and quality scoring (0 to 100)
  // Accuracy & Core Understanding: 50%
  let accuracyPoints = Math.round(conceptRatio * 50);
  if (misconceptionPenalties > 0) {
    accuracyPoints = Math.max(0, accuracyPoints - misconceptionPenalties * 15);
  }

  // Completeness & Nuance: 25%
  let completenessPoints = Math.round(conceptRatio * 25);
  if (wordCount >= 25 && conceptRatio > 0.4) {
    completenessPoints = Math.min(25, completenessPoints + 5);
  } else if (wordCount < 10) {
    completenessPoints = Math.min(completenessPoints, 5);
  }

  // Technical terminology & clarity: 15%
  let clarityPoints = wordCount >= 12 ? 15 : wordCount >= 6 ? 8 : 4;

  // Relevance: 10%
  let relevancePoints = conceptRatio > 0.2 ? 10 : 3;

  const totalScore = Math.min(100, Math.max(0, accuracyPoints + completenessPoints + clarityPoints + relevancePoints));

  // 6. Determine Result Category & Qualitative Ratings
  let result = 'incorrect';
  let accuracyRating = 'Needs Improvement';
  let technicalKnowledgeRating = 'Basic';

  if (wordCount < 6 && conceptRatio < 0.3) {
    result = 'needs_clarification';
    accuracyRating = 'Needs Improvement';
    technicalKnowledgeRating = 'Needs Clarification';
  } else if (totalScore >= 75) {
    result = 'correct';
    accuracyRating = totalScore >= 90 ? 'High' : 'Good';
    technicalKnowledgeRating = totalScore >= 80 ? 'Strong' : 'Good';
  } else if (totalScore >= 45) {
    result = 'partially_correct';
    accuracyRating = 'Moderate';
    technicalKnowledgeRating = 'Developing';
  } else {
    result = 'incorrect';
    accuracyRating = 'Low';
    technicalKnowledgeRating = 'Developing';
  }

  // 7. Compose Elena's conversational spoken feedback based on behavioral rules
  let feedback = '';
  let spokenResponse = '';

  const primaryStrength = identifiedStrengths[0] || 'the core question topic';
  const primaryMissing = missingList[0] || 'in-depth implementation details';

  if (result === 'correct') {
    feedback = `Excellent technical explanation! You accurately explained ${identifiedStrengths.slice(0, 3).join(', ')} with solid conceptual reasoning.`;
    spokenResponse = `Spot on, ${candidateName}! That was a very clear and accurate explanation of ${primaryStrength}. You demonstrated strong technical grasp of how it works in production.`;
  } else if (result === 'partially_correct') {
    feedback = `Good conceptual start. You properly mentioned ${identifiedStrengths.slice(0, 2).join(', ') || 'the main concept'}, but missed critical nuances regarding: ${missingList.slice(0, 2).join(', ')}.`;
    spokenResponse = `Good effort, ${candidateName}. You caught some solid points about ${primaryStrength}, but remember that you also need to account for ${primaryMissing}. Keeping that distinction in mind is key in technical interviews.`;
  } else if (result === 'needs_clarification') {
    feedback = `Your answer was brief and did not fully elaborate on the core technical mechanisms of ${category}.`;
    spokenResponse = `I heard what you started to say, ${candidateName}, but could you elaborate a bit more on how ${conceptsToTest[0] || 'the system'} behaves in this scenario?`;
  } else {
    feedback = `The answer did not accurately cover the required principles of ${category}. Key omitted points: ${missingList.slice(0, 3).join(', ')}.`;
    spokenResponse = `Thank you for sharing your perspective, ${candidateName}. That isn't quite the standard behavior—in production, ${conceptsToTest[0] || 'this mechanism'} handles it differently. Let's move ahead to see how you tackle the next problem.`;
  }

  const strengths = identifiedStrengths.length > 0
    ? identifiedStrengths.map((s) => `Demonstrated understanding of: ${s}`)
    : ['Attempted to structure an answer under interview conditions'];

  const mistakes = detectedMistakes.length > 0
    ? detectedMistakes.map((m) => `Contained technical misconception: ${m}`)
    : missingList.length > 0
    ? [`Omitted key technical concept: ${missingList.slice(0, 2).join(' and ')}`]
    : [];

  const improvementTips = [
    `Deepen conceptual clarity on ${missingList.slice(0, 2).join(', ') || category + ' core mechanisms'}.`,
    'Follow the 3-step interview formula: 1) Definition, 2) Internal Mechanism, 3) Real-world Example.',
  ];

  const suggestedAnswer = expectedAnswer || `A comprehensive answer covers ${conceptsToTest.join(', ')} with precise technical terminology and consideration of runtime tradeoffs.`;

  return {
    result,
    status: result, // backward compatibility
    score: totalScore,
    maxScore: 100,
    accuracy: accuracyRating,
    technicalKnowledge: technicalKnowledgeRating,
    feedback,
    strengths,
    mistakes,
    incorrectStatements: detectedMistakes,
    correctExplanation: expectedAnswer || `In ${category}, ${conceptsToTest.join(', ')} are fundamental to ensuring reliability and performance.`,
    improvementTips,
    suggestedAnswer,
    referenceAnswer: suggestedAnswer,
    spokenResponse,
    spokenScript: spokenResponse,
    missingConcepts: missingList,
    weaknesses: mistakes,
  };
}

module.exports = {
  QUESTION_BANK,
  evaluateAnswerStrictly,
  getDynamicQuestion,
  normalizeText,
  calculateSimilarity,
  normalizeHinglish,
};
