export type UserRole = 'STUDENT' | 'EDUCATOR' | 'ADMIN' | 'SUPER_ADMIN';

export type EducationLevel =
  | 'Primary'
  | 'Secondary (SSC)'
  | 'Higher Secondary (HSC)'
  | 'University'
  | 'Admission Preparation'
  | 'Job Preparation';

export const SUBJECTS = [
  'Science',
  'Mathematics',
  'English',
  'General Knowledge',
  'Physics',
  'Chemistry',
  'Biology',
  'ICT',
  'Programming',
  'History',
  'Other',
] as const;

export const EDUCATION_LEVELS: EducationLevel[] = [
  'Primary',
  'Secondary (SSC)',
  'Higher Secondary (HSC)',
  'University',
  'Admission Preparation',
  'Job Preparation',
];

export type AppPage =
  | 'home'
  | 'study-hub'
  | 'smart-quiz'
  | 'live-tutor'
  | 'dashboard'
  | 'educator'
  | 'admin';

export interface AiPreferences {
  model: string;
  temperature: number;
  defaultLanguage: 'English' | 'Bengali';
}

export interface User {
  id: string;
  fullName: string;
  displayName: string;
  email: string;
  phone: string;
  role: UserRole;
  educationLevel: EducationLevel;
  address?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  emailVerified: boolean;
  educatorVerified: boolean;
  leaderboardPublic: boolean;
  learningMinutes: number;
  aiPreferences: AiPreferences;
  createdAt: string;
}

export interface AiModelInfo {
  id: string;
  label: string;
  description: string;
  tier: string;
}

export interface StudyNote {
  id: string;
  userId: string;
  subject: string;
  educationLevel: EducationLevel;
  topic: string;
  depth: 'Summary' | 'Detailed Explanation' | 'Flashcard Format';
  language: 'English' | 'Bengali';
  difficulty: 'Easy' | 'Medium' | 'Advanced';
  includeExamples: boolean;
  content: string;
  createdAt: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  subtopic: string;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  subject: string;
  topic: string;
  educationLevel: EducationLevel;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questionCount: number;
  score: number;
  accuracy: number;
  weakTopics: string[];
  suggestions: string;
  questions: QuizQuestion[];
  selectedAnswers: number[];
  durationSeconds: number;
  createdAt: string;
}

export interface LeaderboardEntry {
  id: string;
  displayName: string;
  educationLevel: EducationLevel;
  quizzesCompleted: number;
  averageAccuracy: number;
  totalCorrect: number;
  bestScore: number;
}

export interface TutorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface TutorConversation {
  id: string;
  userId: string;
  title: string;
  subject: string;
  educationLevel: EducationLevel;
  language: 'English' | 'Bengali';
  messages: TutorMessage[];
  updatedAt: string;
  createdAt: string;
}

export interface StudyTask {
  id: string;
  userId: string;
  title: string;
  subject: string;
  dueDate: string;
  priority: 'Low' | 'Medium' | 'High';
  completed: boolean;
  createdAt: string;
}

export interface CourseMaterial {
  id: string;
  title: string;
  type: 'Lesson Plan' | 'Syllabus' | 'Exam Questions' | 'Study Guide';
  content: string;
  createdAt: string;
}

export interface Course {
  id: string;
  title: string;
  subject: string;
  educationLevel: EducationLevel;
  description: string;
  educatorId: string;
  educatorName: string;
  published: boolean;
  enrolledUserIds: string[];
  materials: CourseMaterial[];
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: 'ALL' | 'STUDENT' | 'EDUCATOR';
  active: boolean;
  createdAt: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  institution: string;
  quote: string;
  outcome: string;
}

export interface SiteSettings {
  siteName: string;
  tagline: string;
  address: string;
  promoStats: {
    questionsSolved: string;
    quizzesCreated: string;
    studentSatisfaction: string;
    isSampleNotice: string;
  };
  aiConfig: {
    defaultModel: string;
    enabledModels: string[];
    dailyLimitPerUser: number;
  };
}
