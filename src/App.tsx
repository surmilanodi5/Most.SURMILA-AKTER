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

export default function App() {
  const [page, setPage] = useState<AppPage>('home');
  const [bootstrapping, setBootstrapping] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [needsAdminSetup, setNeedsAdminSetup] = useState(false);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [courses, setCourses] = useState<Course[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
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
      setNeedsAdminSetup(data.needsAdminSetup);
      setSiteSettings(data.siteSettings);
      setCourses(data.courses);
      setAnnouncements(data.announcements);
      setTestimonials(data.testimonials);
      setModels(data.models);
      setUser(data.user);
    } catch {
      // keep defaults if transient error
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
