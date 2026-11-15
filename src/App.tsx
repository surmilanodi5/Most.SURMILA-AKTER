import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { apiRequest, setStoredToken } from './lib/api';
import type {
  AiModelInfo,
  Announcement,
  AppPage,
  Course,
  LeaderboardEntry,
  SiteSettings,
  Testimonial,
  User,
} from './types';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { StudyHub } from './components/StudyHub';
import { SmartQuiz } from './components/SmartQuiz';
import { LiveTutor } from './components/LiveTutor';
import { StudentDashboard } from './components/StudentDashboard';
import { EducatorDashboard } from './components/EducatorDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthModal } from './components/AuthModal';

const DEFAULT_SETTINGS: SiteSettings = {
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
};

const DEFAULT_COURSES: Course[] = [
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
    materials: [],
    createdAt: '',
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
    materials: [],
    createdAt: '',
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
    materials: [],
    createdAt: '',
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
    materials: [],
    createdAt: '',
  },
];

const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    title: 'Bilingual AI Study Hub & HSC/SSC Prep Live',
    body: 'Generate structured explanations in both Bengali and English with instant PDF note export and Smart Quiz feedback.',
    audience: 'ALL',
    active: true,
    createdAt: '',
  },
];

const DEFAULT_TESTIMONIALS: Testimonial[] = [
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
];

export default function App() {
  const [page, setPage] = useState<AppPage>('home');
  const [bootstrapping, setBootstrapping] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [needsAdminSetup, setNeedsAdminSetup] = useState(false);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [courses, setCourses] = useState<Course[]>(DEFAULT_COURSES);
  const [announcements, setAnnouncements] = useState<Announcement[]>(DEFAULT_ANNOUNCEMENTS);
  const [testimonials, setTestimonials] = useState<Testimonial[]>(DEFAULT_TESTIMONIALS);
  const [models, setModels] = useState<AiModelInfo[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Auth Modal state
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'forgot' | 'admin-setup'>('login');
  const [verificationCode, setVerificationCode] = useState<string | undefined>(undefined);

  // Hero Quick Ask state
  const [quickQuestion, setQuickQuestion] = useState('');
  const [quickSubject, setQuickSubject] = useState('Science');
  const [quickAnswer, setQuickAnswer] = useState('');
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState('');
  const [pendingQuickAsk, setPendingQuickAsk] = useState(false);

  const loadBootstrap = useCallback(async () => {
    try {
      const data = await apiRequest<{
        needsAdminSetup: boolean;
        siteSettings: SiteSettings;
        courses: Course[];
        announcements: Announcement[];
        testimonials: Testimonial[];
        models: AiModelInfo[];
        user: User | null;
      }>('/api/public/bootstrap');
      if (data && data.siteSettings) {
        setNeedsAdminSetup(Boolean(data.needsAdminSetup));
        setSiteSettings(data.siteSettings);
        if (Array.isArray(data.courses)) setCourses(data.courses);
        if (Array.isArray(data.announcements)) setAnnouncements(data.announcements);
        if (Array.isArray(data.testimonials)) setTestimonials(data.testimonials);
        if (Array.isArray(data.models)) setModels(data.models);
        setUser(data.user || null);
      }
    } catch {
      // keep defaults if static host or transient error
    } finally {
      setBootstrapping(false);
    }
  }, []);

  const loadLeaderboard = useCallback(async () => {
    try {
      const lb = await apiRequest<{ entries: LeaderboardEntry[] }>('/api/leaderboard');
      setLeaderboard(lb.entries);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void loadBootstrap();
    void loadLeaderboard();
  }, [loadBootstrap, loadLeaderboard]);

  const executeQuickAsk = useCallback(async (q: string, subj: string) => {
    if (!q.trim()) {
      setQuickError('Please enter a question to ask EduGenius AI.');
      return;
    }
    setQuickError('');
    setQuickLoading(true);
    try {
      const res = await apiRequest<{ answer: string }>('/api/ai/quick-ask', {
        method: 'POST',
        body: JSON.stringify({ question: q.trim(), subject: subj }),
      });
      setQuickAnswer(res.answer);
    } catch (err) {
      setQuickError(err instanceof Error ? err.message : 'Unable to answer right now.');
    } finally {
      setQuickLoading(false);
    }
  }, []);

  const handleHeroQuickAsk = () => {
    if (!quickQuestion.trim()) {
      setQuickError('Please enter a question to ask EduGenius AI.');
      return;
    }
    if (!user) {
      setPendingQuickAsk(true);
      setAuthTab('login');
      setAuthOpen(true);
      return;
    }
    void executeQuickAsk(quickQuestion, quickSubject);
  };

  const handleNavigate = (target: AppPage, hash?: string) => {
    // Enforce protected dashboard access
    if (target === 'dashboard' && !user) {
      setAuthTab('login');
      setAuthOpen(true);
      return;
    }
    if (target === 'educator') {
      if (!user) {
        setAuthTab('login');
        setAuthOpen(true);
        return;
      }
      if (!['EDUCATOR', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
        setPage('dashboard');
        return;
      }
    }
    if (target === 'admin') {
      if (!user) {
        setAuthTab('login');
        setAuthOpen(true);
        return;
      }
      if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
        setPage(user.role === 'EDUCATOR' ? 'educator' : 'dashboard');
        return;
      }
    }

    setPage(target);
    if (hash) {
      setTimeout(() => {
        const el = document.querySelector(hash);
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleOpenAuth = (tab: 'login' | 'register' = 'login') => {
    setAuthTab(tab);
    setAuthOpen(true);
  };

  const handleAuthenticated = (authedUser: User, previewCode?: string) => {
    setUser(authedUser);
    setVerificationCode(previewCode);
    setAuthOpen(false);
    setNeedsAdminSetup(false);
    void loadBootstrap();

    if (pendingQuickAsk && quickQuestion.trim()) {
      setPendingQuickAsk(false);
      void executeQuickAsk(quickQuestion, quickSubject);
      return;
    }

    if (page === 'home') {
      if (authedUser.role === 'ADMIN' || authedUser.role === 'SUPER_ADMIN') {
        setPage('admin');
      } else if (authedUser.role === 'EDUCATOR') {
        setPage('educator');
      } else {
        setPage('dashboard');
      }
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setStoredToken(null);
    setUser(null);
    setQuickAnswer('');
    setPage('home');
  };

  if (bootstrapping) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center gap-2.5 text-sm font-semibold text-[#1E1B4B]">
        <Loader2 className="w-5 h-5 animate-spin text-[#4338CA]" />
        <span>Loading EduGenius AI...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#1E1B4B]">
      <Navbar
        currentPage={page}
        user={user}
        onNavigate={handleNavigate}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
      />

      <div className="flex-1">
        {page === 'home' && (
          <LandingPage
            user={user}
            siteSettings={siteSettings}
            courses={courses}
            announcements={announcements}
            testimonials={testimonials}
            leaderboard={leaderboard}
            quickQuestion={quickQuestion}
            quickSubject={quickSubject}
            quickAnswer={quickAnswer}
            quickLoading={quickLoading}
            quickError={quickError}
            onQuickQuestionChange={setQuickQuestion}
            onQuickSubjectChange={setQuickSubject}
            onSubmitQuickAsk={handleHeroQuickAsk}
            onNavigate={handleNavigate}
            onOpenAuth={handleOpenAuth}
          />
        )}

        {page === 'study-hub' && (
          <StudyHub user={user} onRequireAuth={() => handleOpenAuth('login')} />
        )}

        {page === 'smart-quiz' && (
          <SmartQuiz user={user} onRequireAuth={() => handleOpenAuth('login')} />
        )}

        {page === 'live-tutor' && (
          <LiveTutor user={user} onRequireAuth={() => handleOpenAuth('login')} />
        )}

        {page === 'dashboard' && user && (
          <StudentDashboard
            user={user}
            models={models}
            verificationPreviewCode={verificationCode}
            onUserUpdated={setUser}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
          />
        )}

        {page === 'educator' && user && ['EDUCATOR', 'ADMIN', 'SUPER_ADMIN'].includes(user.role) && (
          <EducatorDashboard user={user} />
        )}

        {page === 'admin' && user && ['ADMIN', 'SUPER_ADMIN'].includes(user.role) && (
          <AdminDashboard user={user} onSettingsUpdated={setSiteSettings} />
        )}
      </div>

      {authOpen && (
        <AuthModal
          open={authOpen}
          initialTab={authTab}
          needsAdminSetup={needsAdminSetup}
          onClose={() => {
            setAuthOpen(false);
            setPendingQuickAsk(false);
          }}
          onAuthenticated={handleAuthenticated}
        />
      )}
    </div>
  );
}
