export type UserRole = 'STUDENT' | 'EDUCATOR' | 'ADMIN' | 'SUPER_ADMIN';

export type EducationLevel =
  | 'Primary'
  | 'Secondary (SSC)'
  | 'Higher Secondary (HSC)'
  | 'University'
  | 'Admission Preparation'
  | 'Job Preparation';

export interface AiPreferences {
  model: string;
  temperature: number;
  defaultLanguage: 'English' | 'Bengali';
}

export interface UserRecord {
  id: string;
  fullName: string;
  displayName: string;
  email: string;
  phone: string;
  passwordHash: string;
  passwordSalt: string;
  role: UserRole;
  educationLevel: EducationLevel;
  address?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  emailVerified: boolean;
  verificationCode?: string;
  resetCode?: string;
  resetCodeExpiresAt?: number;
  educatorVerified: boolean;
  leaderboardPublic: boolean;
  learningMinutes: number;
  aiPreferences: AiPreferences;
  createdAt: string;
}

export interface SessionRecord {
  token: string;
  userId: string;
  rememberMe: boolean;
  createdAt: number;
  expiresAt: number;
}

export interface StudyNoteRecord {
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

export interface QuizQuestionItem {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  subtopic: string;
}

export interface QuizAttemptRecord {
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
  questions: QuizQuestionItem[];
  selectedAnswers: number[];
  durationSeconds: number;
  createdAt: string;
}

export interface TutorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface TutorConversationRecord {
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

export interface StudyTaskRecord {
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

export interface CourseRecord {
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

export interface QuestionBankRecord {
  id: string;
  subject: string;
  educationLevel: EducationLevel;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  createdById: string;
  createdAt: string;
}

export interface AnnouncementRecord {
  id: string;
  title: string;
  body: string;
  audience: 'ALL' | 'STUDENT' | 'EDUCATOR';
  active: boolean;
  createdAt: string;
}

export interface TestimonialRecord {
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

export interface ActivityLogRecord {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  target: string;
  createdAt: string;
}

export interface AiUsageLogRecord {
  id: string;
  userId: string | null;
  feature: 'quick_ask' | 'study_hub' | 'smart_quiz' | 'live_tutor' | 'educator_studio' | 'connection_test';
  model: string;
  success: boolean;
  errorMessage?: string;
  latencyMs: number;
  createdAt: string;
}

export interface DatabaseState {
  users: UserRecord[];
  sessions: SessionRecord[];
  studyNotes: StudyNoteRecord[];
  quizAttempts: QuizAttemptRecord[];
  conversations: TutorConversationRecord[];
  studyTasks: StudyTaskRecord[];
  courses: CourseRecord[];
  questionBank: QuestionBankRecord[];
  announcements: AnnouncementRecord[];
  testimonials: TestimonialRecord[];
  siteSettings: SiteSettings;
  activityLogs: ActivityLogRecord[];
  aiUsageLogs: AiUsageLogRecord[];
}
