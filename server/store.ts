import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import type { DatabaseState } from './types.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'edugenius-db.json');

function createInitialState(): DatabaseState {
  const now = new Date().toISOString();
  return {
    users: [],
    sessions: [],
    studyNotes: [],
    quizAttempts: [],
    conversations: [],
    studyTasks: [],
    courses: [
      {
        id: 'course-hsc-physics-1',
        title: 'HSC Physics: Mechanics, Waves & Optics Mastery',
        subject: 'Physics',
        educationLevel: 'Higher Secondary (HSC)',
        description:
          'Concept-first guide covering vectors, Newtonian mechanics, oscillations, and geometric optics aligned with the Bangladesh NCTB HSC syllabus.',
        educatorId: 'system-curriculum',
        educatorName: 'EduGenius Academic Board',
        published: true,
        enrolledUserIds: [],
        materials: [
          {
            id: 'mat-phy-1',
            title: 'Newtonian Dynamics & Conservation Laws',
            type: 'Study Guide',
            content:
              '### Core Principles\n- **First Law (Inertia)**: An object remains at rest or uniform motion unless acted upon by a net external force.\n- **Second Law**: $F = ma$ — rate of change of linear momentum equals net force.\n- **Third Law**: Every action has an equal and opposite reaction acting on distinct bodies.\n\n### Exam Focus (HSC)\n1. Practice free-body diagrams for inclined planes.\n2. Apply conservation of momentum to elastic and inelastic collisions.',
            createdAt: now,
          },
          {
            id: 'mat-phy-2',
            title: 'HSC Physics Chapter-Wise Practice Outline',
            type: 'Syllabus',
            content:
              '- Week 1: Vector Addition, Dot & Cross Product\n- Week 2: Projectile Motion & Circular Dynamics\n- Week 3: Work, Energy & Power Theorems\n- Week 4: Simple Harmonic Motion & Wave Superposition',
            createdAt: now,
          },
        ],
        createdAt: now,
      },
      {
        id: 'course-ssc-math-1',
        title: 'SSC Higher Mathematics & Trigonometry Bootcamp',
        subject: 'Mathematics',
        educationLevel: 'Secondary (SSC)',
        description:
          'Step-by-step problem solving for algebraic expressions, coordinate geometry, and trigonometric identities for Class 9-10 students.',
        educatorId: 'system-curriculum',
        educatorName: 'EduGenius Academic Board',
        published: true,
        enrolledUserIds: [],
        materials: [
          {
            id: 'mat-math-1',
            title: 'Trigonometric Ratios & Identity Proofs',
            type: 'Lesson Plan',
            content:
              '### Key Identities\n- $\\sin^2\\theta + \\cos^2\\theta = 1$\n- $1 + \\tan^2\\theta = \\sec^2\\theta$\n- $1 + \\cot^2\\theta = \\csc^2\\theta$\n\n### Problem Strategy\nConvert all terms to $\\sin\\theta$ and $\\cos\\theta$ first when proving complex identities.',
            createdAt: now,
          },
        ],
        createdAt: now,
      },
      {
        id: 'course-hsc-ict-1',
        title: 'HSC ICT: Number Systems, Logic Gates & C Programming',
        subject: 'ICT',
        educationLevel: 'Higher Secondary (HSC)',
        description:
          'Complete practical coverage of binary arithmetic, Boolean algebra simplification, HTML tables, and C programming loops.',
        educatorId: 'system-curriculum',
        educatorName: 'EduGenius Academic Board',
        published: true,
        enrolledUserIds: [],
        materials: [
          {
            id: 'mat-ict-1',
            title: 'Binary, Octal & Hexadecimal Conversions',
            type: 'Study Guide',
            content:
              '### Quick Conversion Table\n- Group **3 binary bits** from right to left for **Octal**.\n- Group **4 binary bits** from right to left for **Hexadecimal**.\n\n```c\n#include <stdio.h>\nint main() {\n  int n = 10, sum = 0;\n  for (int i = 1; i <= n; i++) sum += i;\n  printf("Sum = %d\\n", sum);\n  return 0;\n}\n```',
            createdAt: now,
          },
        ],
        createdAt: now,
      },
      {
        id: 'course-admission-eng-1',
        title: 'University Admission English & Analytical Writing',
        subject: 'English',
        educationLevel: 'Admission Preparation',
        description:
          'Targeted grammar drills, voice & narration transformations, vocabulary in context, and comprehension strategies for Dhaka University & GST admissions.',
        educatorId: 'system-curriculum',
        educatorName: 'EduGenius Academic Board',
        published: true,
        enrolledUserIds: [],
        materials: [
          {
            id: 'mat-eng-1',
            title: 'High-Frequency Admission Grammar Rules',
            type: 'Study Guide',
            content:
              '### Subject-Verb Agreement & Conditionals\n- Singular collective nouns take singular verbs when acting as a unit.\n- Third Conditional: `If + Subject + had + V3, Subject + would have + V3`.',
            createdAt: now,
          },
        ],
        createdAt: now,
      },
    ],
    questionBank: [
      {
        id: 'qb-1',
        subject: 'Science',
        educationLevel: 'Secondary (SSC)',
        topic: 'Photosynthesis',
        difficulty: 'Easy',
        question: 'Which gas is released as a byproduct during photosynthesis in green plants?',
        options: ['Carbon Dioxide', 'Oxygen', 'Nitrogen', 'Methane'],
        correctIndex: 1,
        explanation: 'During the light-dependent reactions of photosynthesis, water molecules split and release Oxygen (O2).',
        createdById: 'system-curriculum',
        createdAt: now,
      },
      {
        id: 'qb-2',
        subject: 'ICT',
        educationLevel: 'Higher Secondary (HSC)',
        topic: 'Number Systems',
        difficulty: 'Medium',
        question: 'What is the decimal equivalent of the binary number 10110?',
        options: ['18', '20', '22', '24'],
        correctIndex: 2,
        explanation: '1×16 + 0×8 + 1×4 + 1×2 + 0×1 = 16 + 4 + 2 = 22.',
        createdById: 'system-curriculum',
        createdAt: now,
      },
      {
        id: 'qb-3',
        subject: 'English',
        educationLevel: 'Admission Preparation',
        topic: 'Passive Voice',
        difficulty: 'Medium',
        question: 'Choose the correct passive form of: "Who taught you English?"',
        options: [
          'By whom were you taught English?',
          'Who were you taught English by?',
          'By whom was English taught you?',
          'By whom you were taught English?',
        ],
        correctIndex: 0,
        explanation: '"Who" changes to "By whom" at the beginning of a passive interrogative, followed by auxiliary verb "were".',
        createdById: 'system-curriculum',
        createdAt: now,
      },
    ],
    announcements: [
      {
        id: 'ann-1',
        title: 'Bilingual AI Study Hub & HSC/SSC Prep Live',
        body: 'Generate structured explanations in both Bengali and English with instant PDF note export and Smart Quiz feedback.',
        audience: 'ALL',
        active: true,
        createdAt: now,
      },
    ],
    testimonials: [
      {
        id: 'test-1',
        name: 'Tasnim Rahman',
        role: 'HSC Science Candidate',
        institution: 'Gaibandha Govt. College',
        quote:
          'Before using EduGenius AI, I struggled to connect Bengali textbook definitions with numerical physics problems. Asking the AI Study Hub in simple Bengali helped me raise my mock quiz accuracy from 64% to 91% in four weeks.',
        outcome: '+27% Mock Quiz Accuracy in 4 Weeks',
      },
      {
        id: 'test-2',
        name: 'Mahmudul Hasan',
        role: 'ICT Lecturer',
        institution: 'Rangpur Model Academy',
        quote:
          'Creating topic-aligned MCQ sets used to take me three hours every weekend. With the Educator Studio, I draft balanced HSC ICT question banks and lesson plans in minutes and review every answer before publishing.',
        outcome: '3 Hours Saved Weekly per Class Batch',
      },
      {
        id: 'test-3',
        name: 'Nusrat Jahan',
        role: 'University Admission Aspirant',
        institution: 'Dhaka Unit Preparation',
        quote:
          'The 24/7 Live Tutor never just gives away the answer—it walks me through English grammar rules step by step and highlights my weak areas after every 10-question timed quiz.',
        outcome: 'Consistent 88%+ Score Across 18 Timed Quizzes',
      },
    ],
    siteSettings: {
      siteName: 'EduGenius AI',
      tagline: 'Learn Easily, Grow Smartly.',
      address: 'Gaibandha Circular Road, Gaibandha, Bangladesh.',
      promoStats: {
        questionsSolved: '50,000+',
        quizzesCreated: '10,000+',
        studentSatisfaction: '99.8%',
        isSampleNotice: 'Sample promotional figures · Editable in Admin Panel',
      },
      aiConfig: {
        defaultModel: 'gemini-4-hydrogen',
        enabledModels: ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'],
        dailyLimitPerUser: 100,
      },
    },
    activityLogs: [],
    aiUsageLogs: [],
  };
}

let cachedState: DatabaseState | null = null;
let writeQueue: Promise<void> = Promise.resolve();

export async function getDb(): Promise<DatabaseState> {
  if (cachedState) return cachedState;

  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(DB_FILE, 'utf8');
    cachedState = JSON.parse(raw) as DatabaseState;
  } catch {
    cachedState = createInitialState();
    await persistState(cachedState);
  }

  // Optional automated bootstrap if ADMIN_INITIAL_PASSWORD is provided via environment
  const hasSuperAdmin = cachedState.users.some((u) => u.role === 'SUPER_ADMIN');
  const initialAdminPassword = process.env.ADMIN_INITIAL_PASSWORD;
  const initialAdminEmail = process.env.ADMIN_INITIAL_EMAIL || 'admin@edugenius.ai';
  if (!hasSuperAdmin && initialAdminPassword && initialAdminPassword.length >= 8) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(initialAdminPassword, salt, 64).toString('hex');
    cachedState.users.push({
      id: `usr-${crypto.randomUUID()}`,
      fullName: 'Website Administrator',
      displayName: 'Website Administrator',
      email: initialAdminEmail.toLowerCase(),
      phone: '+8801700000000',
      passwordHash: hash,
      passwordSalt: salt,
      role: 'SUPER_ADMIN',
      educationLevel: 'University',
      address: 'Gaibandha Circular Road, Gaibandha, Bangladesh.',
      status: 'ACTIVE',
      emailVerified: true,
      educatorVerified: true,
      leaderboardPublic: false,
      learningMinutes: 0,
      aiPreferences: {
        model: cachedState.siteSettings.aiConfig.defaultModel,
        temperature: 0.4,
        defaultLanguage: 'English',
      },
      createdAt: new Date().toISOString(),
    });
    await persistState(cachedState);
  }

  return cachedState;
}

async function persistState(state: DatabaseState): Promise<void> {
  const tmpFile = `${DB_FILE}.${crypto.randomUUID()}.tmp`;
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(tmpFile, JSON.stringify(state, null, 2), 'utf8');
  await fs.rename(tmpFile, DB_FILE);
}

export async function mutateDb<T>(mutator: (db: DatabaseState) => T | Promise<T>): Promise<T> {
  let result!: T;
  writeQueue = writeQueue.then(async () => {
    const db = await getDb();
    result = await mutator(db);
    await persistState(db);
  });
  await writeQueue;
  return result;
}
