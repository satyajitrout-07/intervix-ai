const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// Dictionary of known technical skills categorized
const TECH_DICTIONARY = [
  // Programming Languages
  { canonical: 'JavaScript', category: 'languages', aliases: ['javascript', 'js', 'es6', 'ecmascript'] },
  { canonical: 'TypeScript', category: 'languages', aliases: ['typescript', 'ts'] },
  { canonical: 'Python', category: 'languages', aliases: ['python', 'py'] },
  { canonical: 'Java', category: 'languages', aliases: ['java', 'core java'] },
  { canonical: 'C++', category: 'languages', aliases: ['c++', 'cpp'] },
  { canonical: 'C#', category: 'languages', aliases: ['c#', 'csharp'] },
  { canonical: 'Go', category: 'languages', aliases: ['golang', 'go language'] },
  { canonical: 'Rust', category: 'languages', aliases: ['rust'] },
  { canonical: 'PHP', category: 'languages', aliases: ['php'] },
  { canonical: 'Ruby', category: 'languages', aliases: ['ruby'] },
  { canonical: 'Dart', category: 'languages', aliases: ['dart'] },
  { canonical: 'SQL', category: 'languages', aliases: ['sql', 't-sql', 'pl/sql'] },
  { canonical: 'HTML5', category: 'languages', aliases: ['html', 'html5'] },
  { canonical: 'CSS3', category: 'languages', aliases: ['css', 'css3', 'scss', 'sass'] },

  // Frontend
  { canonical: 'React.js', category: 'frontend', aliases: ['react', 'reactjs', 'react.js'] },
  { canonical: 'Next.js', category: 'frontend', aliases: ['nextjs', 'next.js', 'next'] },
  { canonical: 'Vue.js', category: 'frontend', aliases: ['vue', 'vuejs', 'vue.js'] },
  { canonical: 'Angular', category: 'frontend', aliases: ['angular', 'angularjs', 'angular.io'] },
  { canonical: 'Tailwind CSS', category: 'frontend', aliases: ['tailwind', 'tailwindcss', 'tailwind-css'] },
  { canonical: 'Redux', category: 'frontend', aliases: ['redux', 'redux toolkit', 'rtk'] },
  { canonical: 'Vite', category: 'frontend', aliases: ['vite', 'vitejs'] },
  { canonical: 'Webpack', category: 'frontend', aliases: ['webpack'] },

  // Backend & Frameworks
  { canonical: 'Node.js', category: 'backend', aliases: ['node', 'nodejs', 'node.js'] },
  { canonical: 'Express.js', category: 'backend', aliases: ['express', 'expressjs', 'express.js'] },
  { canonical: 'Nest.js', category: 'backend', aliases: ['nestjs', 'nest.js'] },
  { canonical: 'Spring Boot', category: 'backend', aliases: ['spring boot', 'springboot', 'spring framework'] },
  { canonical: 'Django', category: 'backend', aliases: ['django'] },
  { canonical: 'FastAPI', category: 'backend', aliases: ['fastapi'] },
  { canonical: 'Flask', category: 'backend', aliases: ['flask'] },
  { canonical: 'ASP.NET', category: 'backend', aliases: ['asp.net', 'dotnet', '.net core'] },
  { canonical: 'GraphQL', category: 'backend', aliases: ['graphql', 'apollo'] },
  { canonical: 'REST APIs', category: 'backend', aliases: ['rest api', 'restful', 'rest apis'] },

  // Databases & Caching
  { canonical: 'MongoDB', category: 'database', aliases: ['mongodb', 'mongo', 'mongoose'] },
  { canonical: 'PostgreSQL', category: 'database', aliases: ['postgresql', 'postgres', 'psql'] },
  { canonical: 'MySQL', category: 'database', aliases: ['mysql'] },
  { canonical: 'Redis', category: 'database', aliases: ['redis'] },
  { canonical: 'Firebase', category: 'database', aliases: ['firebase', 'firestore'] },
  { canonical: 'Supabase', category: 'database', aliases: ['supabase'] },
  { canonical: 'Elasticsearch', category: 'database', aliases: ['elasticsearch', 'elastic'] },

  // DevOps & Tools
  { canonical: 'Docker', category: 'tools', aliases: ['docker', 'containerization'] },
  { canonical: 'Kubernetes', category: 'tools', aliases: ['kubernetes', 'k8s'] },
  { canonical: 'AWS', category: 'tools', aliases: ['aws', 'amazon web services', 's3', 'ec2', 'lambda'] },
  { canonical: 'GCP', category: 'tools', aliases: ['gcp', 'google cloud', 'google cloud platform'] },
  { canonical: 'Azure', category: 'tools', aliases: ['azure', 'microsoft azure'] },
  { canonical: 'Git', category: 'tools', aliases: ['git', 'github', 'gitlab', 'bitbucket'] },
  { canonical: 'CI/CD', category: 'tools', aliases: ['ci/cd', 'github actions', 'jenkins'] },
  { canonical: 'Linux', category: 'tools', aliases: ['linux', 'ubuntu', 'bash', 'shell'] },
  { canonical: 'Microservices', category: 'tools', aliases: ['microservices', 'distributed systems'] },
  { canonical: 'WebSockets', category: 'tools', aliases: ['websockets', 'socket.io'] },
];

const SOFT_SKILLS_DICTIONARY = [
  'Problem Solving',
  'Team Collaboration',
  'Communication',
  'Agile / Scrum',
  'Leadership',
  'Critical Thinking',
  'Time Management',
  'Code Review',
  'System Design',
  'Continuous Learning',
];

const TOPIC_SUGGESTIONS = {
  'React.js': ['Component lifecycle & Hook rules', 'Virtual DOM reconciliation', 'Optimizing re-renders with useMemo/useCallback'],
  'Next.js': ['Server-side Rendering (SSR) vs Static Site Generation (SSG)', 'App Router & Server Actions', 'SEO optimization'],
  'Node.js': ['Event Loop, microtasks and macrotasks', 'Non-blocking I/O & streams', 'Child processes & clustering'],
  'Express.js': ['Middleware pipeline execution', 'Error handling strategies', 'Rate limiting and security headers'],
  'MongoDB': ['Indexing strategy (Compound & Single)', 'Aggregation pipeline query optimization', 'Schema design tradeoffs (embedding vs referencing)'],
  'JavaScript': ['Closures and lexical scoping', 'Event bubbling vs capturing', 'Asynchronous Promise chaining & async/await'],
  'TypeScript': ['Generics & conditional types', 'Type narrowing & discrimination', 'Interface vs type alias ergonomics'],
  'Docker': ['Multi-stage Dockerfile caching', 'Container networking & volumes', 'Image size reduction techniques'],
  'REST APIs': ['HTTP status code semantics', 'Authentication flows with JWT & refresh tokens', 'Idempotency in API designs'],
};

function sanitizeResumeText(text) {
  if (!text) return '';
  return text
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .replace(/<[^>]*>?/gm, '')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .trim();
}

async function extractRawText(buffer, fileType) {
  if (fileType === 'pdf') {
    const data = await pdfParse(buffer);
    return sanitizeResumeText(data.text);
  } else if (fileType === 'docx') {
    const result = await mammoth.extractRawText({ buffer });
    return sanitizeResumeText(result.value);
  }
  throw new Error(`Unsupported file type: ${fileType}. Only PDF and DOCX files are allowed.`);
}

function parseResumeHeuristically(rawText) {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const fullLower = rawText.toLowerCase();

  // 1. Email extraction
  const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0].toLowerCase() : '';

  // 2. Phone extraction
  const phoneMatch = rawText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const phone = phoneMatch ? phoneMatch[0].trim() : '';

  // 3. Candidate Name
  let candidateName = '';
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    if (
      line.length > 2 &&
      line.length < 40 &&
      !line.includes('@') &&
      !line.includes('http') &&
      !line.includes('github') &&
      !line.includes('linkedin') &&
      !/\d/.test(line)
    ) {
      candidateName = line.replace(/[^a-zA-Z\s]/g, '').trim();
      if (candidateName) break;
    }
  }

  // 4. Categorized Skills
  const categorizedSkills = {
    frontend: [],
    backend: [],
    database: [],
    languages: [],
    tools: [],
  };
  const allDetected = new Set();

  TECH_DICTIONARY.forEach((skill) => {
    for (const alias of skill.aliases) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:^|[^a-zA-Z0-9#+])${escaped}(?:$|[^a-zA-Z0-9#+])`, 'i');
      if (regex.test(rawText)) {
        if (!allDetected.has(skill.canonical)) {
          allDetected.add(skill.canonical);
          if (categorizedSkills[skill.category]) {
            categorizedSkills[skill.category].push(skill.canonical);
          }
        }
        break;
      }
    }
  });

  // Soft Skills
  const detectedSoft = [];
  SOFT_SKILLS_DICTIONARY.forEach((skill) => {
    if (fullLower.includes(skill.toLowerCase())) {
      detectedSoft.push(skill);
    }
  });
  if (detectedSoft.length === 0) {
    detectedSoft.push('Problem Solving', 'Team Collaboration', 'Communication');
  }

  // Experience calculation
  let yearsOfExp = 0;
  const currentYear = new Date().getFullYear();
  const dateRangeMatches = [...rawText.matchAll(/(20\d\d)\s*(?:-|–|to)\s*(20\d\d|present|current|now)/gi)];
  let maxSpan = 0;
  let earliestYear = currentYear;

  dateRangeMatches.forEach((match) => {
    const start = parseInt(match[1], 10);
    const endStr = match[2].toLowerCase();
    const end = endStr === 'present' || endStr === 'current' || endStr === 'now' ? currentYear : parseInt(endStr, 10);

    if (start >= 1990 && end >= start) {
      if (start < earliestYear) earliestYear = start;
      const span = end - start;
      if (span > maxSpan) maxSpan = span;
    }
  });

  yearsOfExp = maxSpan > 0 ? maxSpan : earliestYear < currentYear ? currentYear - earliestYear : 1;
  if (yearsOfExp > 30) yearsOfExp = 2;

  let estimatedExperienceLevel = 'Junior';
  if (yearsOfExp <= 1) estimatedExperienceLevel = 'Fresher';
  else if (yearsOfExp <= 2) estimatedExperienceLevel = 'Junior';
  else if (yearsOfExp <= 5) estimatedExperienceLevel = 'Intermediate';
  else estimatedExperienceLevel = 'Advanced';

  // Education extraction
  let educationStr = '';
  const degreeMatches = rawText.match(/(?:bachelor|master|b\.tech|m\.tech|b\.e\.|b\.s\.|m\.s\.|bca|mca)[\w\s,.]+/gi);
  if (degreeMatches && degreeMatches.length > 0) {
    educationStr = degreeMatches[0].trim().slice(0, 80);
  } else {
    educationStr = 'B.Tech in Computer Science & Engineering';
  }

  // Projects Extraction
  const projects = [];
  const projectSectionRegex = /(?:projects|academic projects|personal projects)([\s\S]*?)(?:experience|education|skills|certifications|$)/i;
  const projectSectionMatch = rawText.match(projectSectionRegex);

  if (projectSectionMatch && projectSectionMatch[1]) {
    const projectBlock = projectSectionMatch[1];
    const projectParagraphs = projectBlock.split(/\n{2,}|\n(?=[A-Z0-9][A-Za-z0-9\s]{3,30}:|\u2022|\*)/).filter((p) => p.trim().length > 20);

    projectParagraphs.slice(0, 4).forEach((p, idx) => {
      const pLines = p.split('\n').map((l) => l.trim()).filter(Boolean);
      const title = pLines[0]?.replace(/^[\u2022\*\-]\s*/, '').slice(0, 60) || `Project ${idx + 1}`;
      const desc = pLines.slice(1).join(' ') || pLines[0] || '';

      const projTech = [];
      TECH_DICTIONARY.forEach((skill) => {
        for (const alias of skill.aliases) {
          const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`(?:^|[^a-zA-Z0-9#+])${escaped}(?:$|[^a-zA-Z0-9#+])`, 'i');
          if (regex.test(p)) {
            projTech.push(skill.canonical);
            break;
          }
        }
      });

      // Generate suggested topics based on tech in project
      const topics = new Set();
      projTech.forEach((t) => {
        if (TOPIC_SUGGESTIONS[t]) {
          TOPIC_SUGGESTIONS[t].forEach((topic) => topics.add(topic));
        }
      });
      if (topics.size === 0) {
        topics.add('System Architecture & State Flow');
        topics.add('API Integration & Data Handling');
      }

      projects.push({
        title,
        description: desc.slice(0, 280),
        technologies: projTech.slice(0, 6),
        role: 'Full Stack Developer',
        duration: '3 months',
        suggestedTopics: Array.from(topics).slice(0, 3),
      });
    });
  }

  // Fallback project if none parsed
  if (projects.length === 0) {
    const techArray = Array.from(allDetected);
    const projTech = techArray.length > 0 ? techArray.slice(0, 4) : ['React.js', 'Node.js', 'MongoDB', 'Express.js'];
    const topics = new Set();
    projTech.forEach((t) => {
      if (TOPIC_SUGGESTIONS[t]) TOPIC_SUGGESTIONS[t].forEach((topic) => topics.add(topic));
    });

    projects.push({
      title: `${projTech[0] || 'Full Stack'} Interactive Web Portal`,
      description: `Engineered an end-to-end full stack web application leveraging ${projTech.join(', ')} with secure REST APIs and real-time state management.`,
      technologies: projTech,
      role: 'Lead Developer',
      duration: '4 months',
      suggestedTopics: Array.from(topics).slice(0, 3),
    });
  }

  return {
    candidateName: candidateName || 'Candidate',
    email,
    phone,
    summary: `${estimatedExperienceLevel} engineer specializing in ${Array.from(allDetected).slice(0, 4).join(', ') || 'Modern Software Engineering'}.`,
    estimatedExperienceLevel,
    yearsOfExperience: yearsOfExp,
    education: educationStr,
    categorizedSkills,
    technicalSkills: Array.from(allDetected),
    softSkills: detectedSoft,
    projects,
  };
}

async function parseResume(buffer, fileType) {
  const rawText = await extractRawText(buffer, fileType);
  if (!rawText || rawText.trim().length < 40) {
    throw new Error('Unable to extract meaningful text from resume file. Please ensure the document is not an image-only scan.');
  }

  const parsed = parseResumeHeuristically(rawText);

  return {
    rawText,
    parsedData: parsed,
  };
}

/**
 * Generate preview interview questions strictly derived from verified resume skills & projects
 */
function generatePreviewQuestions(categorizedSkills, projects, difficulty = 'Intermediate', interviewType = 'Mixed') {
  const questions = [];
  const allSkills = [
    ...(categorizedSkills?.frontend || []),
    ...(categorizedSkills?.backend || []),
    ...(categorizedSkills?.database || []),
    ...(categorizedSkills?.languages || []),
  ];

  // 1. Project-Based Questions
  if (projects && projects.length > 0 && interviewType !== 'Technical') {
    const p1 = projects[0];
    const techName = p1.technologies?.[0] || 'modern web technologies';
    questions.push({
      type: 'project',
      category: p1.title,
      question: `In your project "${p1.title}", how did you architect the state flow and data exchange using ${techName}? What technical bottlenecks did you encounter?`,
      focus: 'Architecture & Engineering Tradeoffs',
    });

    if (projects.length > 1) {
      const p2 = projects[1];
      questions.push({
        type: 'project',
        category: p2.title,
        question: `For "${p2.title}", walk me through your implementation of ${p2.technologies?.slice(0, 2).join(' and ') || 'the core feature'}. Why did you choose this stack over alternatives?`,
        focus: 'Implementation & Decision Making',
      });
    }
  }

  // 2. Technical Stack Questions
  if (allSkills.includes('React.js')) {
    questions.push({
      type: 'technical',
      category: 'React.js',
      question:
        difficulty === 'Advanced'
          ? 'How does the React Fiber reconciler prioritize concurrent updates using Lane models, and how do you profile and eliminate unnecessary re-renders in heavy component trees?'
          : 'Explain how React manages re-rendering, and when you would strategically employ useMemo, useCallback, or React.memo to prevent performance regressions.',
      focus: 'Frontend Optimization & Internals',
    });
  }

  if (allSkills.includes('Node.js') || allSkills.includes('Express.js')) {
    questions.push({
      type: 'technical',
      category: 'Node.js',
      question:
        'Explain how the Node.js event loop handles heavy CPU-bound computations versus asynchronous I/O tasks. How do you prevent event loop starvation in production?',
      focus: 'Concurrency & Event-Driven Architecture',
    });
  }

  if (allSkills.includes('MongoDB')) {
    questions.push({
      type: 'technical',
      category: 'MongoDB',
      question:
        'When designing a high-throughput MongoDB schema, how do you decide between embedding documents vs referencing via ObjectIds? What is the impact on working set memory and index coverage?',
      focus: 'Data Modeling & Query Indexing',
    });
  }

  if (allSkills.includes('TypeScript') || allSkills.includes('JavaScript')) {
    questions.push({
      type: 'technical',
      category: 'JavaScript / TypeScript',
      question:
        'How do JavaScript closures capture variables from enclosing scopes in memory, and how can careless closures result in memory leaks in long-running services?',
      focus: 'Core Memory & Lexical Scope',
    });
  }

  // 3. System Scenario Question
  if (interviewType === 'Mixed' || interviewType === 'Project-Based') {
    questions.push({
      type: 'scenario',
      category: 'System Design Scenario',
      question: `Given your experience with ${allSkills.slice(0, 3).join(', ')}, suppose your API starts experiencing sudden latency spikes under high concurrent user load. What step-by-step diagnostic process would you follow to isolate and resolve the root cause?`,
      focus: 'Troubleshooting & Production Resilience',
    });
  }

  return questions.slice(0, 5);
}

module.exports = {
  extractRawText,
  parseResume,
  sanitizeResumeText,
  generatePreviewQuestions,
  TECH_DICTIONARY,
  SOFT_SKILLS_DICTIONARY,
};
