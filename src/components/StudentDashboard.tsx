import { useEffect, useState, type FormEvent } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  BookMarked,
  BookOpen,
  CalendarCheck2,
  CheckCircle2,
  FileText,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  Loader2,
  LogOut,
  MessageSquareText,
  Plus,
  Settings,
  Trash2,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import {
  EDUCATION_LEVELS,
  SUBJECTS,
  type AiModelInfo,
  type AppPage,
  type Course,
  type EducationLevel,
  type QuizAttempt,
  type StudyNote,
  type StudyTask,
  type TutorConversation,
  type User,
} from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface StudentDashboardProps {
  user: User;
  models: AiModelInfo[];
  verificationPreviewCode?: string;
  onUserUpdated: (user: User) => void;
  onNavigate: (page: AppPage) => void;
  onLogout: () => void;
}

type TabKey = 'overview' | 'courses' | 'notes' | 'planner' | 'progress' | 'settings';

interface DashboardPayload {
  stats: {
    learningHours: number;
    completedQuizzes: number;
    averageQuizScore: number;
    savedNotesCount: number;
    enrolledCoursesCount: number;
  };
  enrolledCourses: Course[];
  availableCourses: Course[];
  recentConversations: TutorConversation[];
  savedNotes: StudyNote[];
  recentQuizResults: QuizAttempt[];
  upcomingTasks: StudyTask[];
  recommendedTopics: Array<{ topic: string; reason: string }>;
  notifications: Array<{ id: string; title: string; body: string; createdAt: string }>;
}

export function StudentDashboard({
  user,
  models,
  verificationPreviewCode,
  onUserUpdated,
  onNavigate,
  onLogout,
}: StudentDashboardProps) {
  const [tab, setTab] = useState<TabKey>('overview');
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<StudyNote | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Study Planner Form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskSubject, setTaskSubject] = useState<string>('Science');
  const [taskDue, setTaskDue] = useState(new Date().toISOString().slice(0, 10));
  const [taskPriority, setTaskPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');

  // Settings Form
  const [fullName, setFullName] = useState(user.fullName);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [phone, setPhone] = useState(user.phone);
  const [educationLevel, setEducationLevel] = useState<EducationLevel>(user.educationLevel);
  const [leaderboardPublic, setLeaderboardPublic] = useState(user.leaderboardPublic);

  const [aiModel, setAiModel] = useState(user.aiPreferences.model);
  const [temperature, setTemperature] = useState(user.aiPreferences.temperature);
  const [defaultLanguage, setDefaultLanguage] = useState<'English' | 'Bengali'>(
    user.aiPreferences.defaultLanguage
  );
  const [settingsMsg, setSettingsMsg] = useState('');
  const [settingsErr, setSettingsErr] = useState('');
  const [testingAi, setTestingAi] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{
    ok: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  // Email verification
  const [verifyCode, setVerifyCode] = useState(verificationPreviewCode || '');
  const [verifyStatus, setVerifyStatus] = useState('');

  const loadDashboard = () => {
    setLoading(true);
    apiRequest<DashboardPayload>('/api/student/dashboard')
      .then((res) => setData(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleEnroll = async (courseId: string) => {
    try {
      await apiRequest(`/api/courses/${courseId}/enroll`, { method: 'POST' });
      loadDashboard();
    } catch {
      // ignore
    }
  };

  const handleCreateTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    try {
      await apiRequest('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: taskTitle.trim(),
          subject: taskSubject,
          dueDate: taskDue,
          priority: taskPriority,
        }),
      });
      setTaskTitle('');
      loadDashboard();
    } catch {
      // ignore
    }
  };

  const handleToggleTask = async (task: StudyTask) => {
    try {
      await apiRequest(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: !task.completed }),
      });
      loadDashboard();
    } catch {
      // ignore
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await apiRequest(`/api/tasks/${id}`, { method: 'DELETE' });
      loadDashboard();
    } catch {
      // ignore
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await apiRequest(`/api/study-hub/notes/${id}`, { method: 'DELETE' });
      if (selectedNote?.id === id) setSelectedNote(null);
      loadDashboard();
    } catch {
      // ignore
    }
  };

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    setSettingsErr('');
    setSettingsMsg('');
    try {
      await apiRequest<{ user: User }>('/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          fullName,
          displayName,
          phone,
          educationLevel,
          leaderboardPublic,
        }),
      });
      const aiRes = await apiRequest<{ user: User }>('/api/user/ai-settings', {
        method: 'PATCH',
        body: JSON.stringify({
          model: aiModel,
          temperature,
          defaultLanguage,
        }),
      });
      onUserUpdated(aiRes.user);
      setSettingsMsg('Profile and AI settings saved successfully.');
    } catch (err) {
      setSettingsErr(err instanceof Error ? err.message : 'Failed to save settings.');
    }
  };

  const handleTestAi = async () => {
    setTestingAi(true);
    setAiTestResult(null);
    try {
      const res = await apiRequest<{ ok: boolean; model: string; latencyMs: number; message: string }>(
        '/api/ai/test',
        {
          method: 'POST',
          body: JSON.stringify({ model: aiModel }),
        }
      );
      setAiTestResult({
        ok: res.ok,
        latencyMs: res.latencyMs,
        message: `Connected to ${res.model} (${res.latencyMs}ms): ${res.message}`,
      });
    } catch (err) {
      setAiTestResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Connection test failed.',
      });
    } finally {
      setTestingAi(false);
    }
  };

  const handleVerifyEmail = async (e: FormEvent) => {
    e.preventDefault();
    setVerifyStatus('');
    try {
      const res = await apiRequest<{ user: User }>('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ code: verifyCode }),
      });
      onUserUpdated(res.user);
      setVerifyStatus('Email verified successfully.');
      loadDashboard();
    } catch (err) {
      setVerifyStatus(err instanceof Error ? err.message : 'Invalid code.');
    }
  };

  const handleResendCode = async () => {
    try {
      const res = await apiRequest<{ verificationPreviewCode: string }>('/api/auth/resend-verification', {
        method: 'POST',
      });
      setVerifyCode(res.verificationPreviewCode);
      setVerifyStatus(`New verification code generated: ${res.verificationPreviewCode}`);
    } catch {
      // ignore
    }
  };

  const sidebarItems = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard, action: () => setTab('overview') },
    { key: 'study-hub', label: 'AI Study Hub', icon: BookOpen, action: () => onNavigate('study-hub') },
    { key: 'smart-quiz', label: 'Smart Quiz', icon: HelpCircle, action: () => onNavigate('smart-quiz') },
    { key: 'live-tutor', label: 'Live Tutor', icon: MessageSquareText, action: () => onNavigate('live-tutor') },
    { key: 'courses', label: 'My Courses', icon: GraduationCap, action: () => setTab('courses') },
    { key: 'notes', label: 'My Notes', icon: BookMarked, action: () => setTab('notes') },
    { key: 'planner', label: 'Study Planner', icon: CalendarCheck2, action: () => setTab('planner') },
    { key: 'progress', label: 'My Progress', icon: BarChart3, action: () => setTab('progress') },
    { key: 'settings', label: 'Settings', icon: Settings, action: () => setTab('settings') },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar Navigation */}
        <aside className="no-print lg:col-span-3 rounded-2xl bg-white border border-[#1E1B4B]/10 p-4 space-y-4">
          <div className="px-2 pb-3 border-b border-[#1E1B4B]/10">
            <p className="text-sm font-bold text-[#1E1B4B] truncate">{user.fullName}</p>
            <p className="text-xs text-[#1E1B4B]/60 truncate">
              {user.educationLevel} · {user.role}
            </p>
          </div>

          <nav className="space-y-1" aria-label="Student Dashboard Navigation">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const active = tab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={item.action}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-[#4338CA] text-white'
                      : 'text-[#1E1B4B]/75 hover:bg-[#F8FAFC] hover:text-[#1E1B4B]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#1E1B4B]/70 hover:bg-[#1E1B4B]/5 hover:text-[#1E1B4B] transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Logout</span>
            </button>
          </nav>
        </aside>

        {/* Main Viewport */}
        <main className="lg:col-span-9 space-y-6">
          {loading && !data ? (
            <div className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-12 flex items-center justify-center gap-2 text-sm text-[#1E1B4B]/65">
              <Loader2 className="w-5 h-5 animate-spin text-[#4338CA]" />
              <span>Loading your student workspace...</span>
            </div>
          ) : (
            <>
              {tab === 'overview' && data && (
                <div className="space-y-6">
                  {/* Welcome Header */}
                  <div className="rounded-2xl bg-[#1E1B4B] text-white p-6 sm:p-7 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-[#10B981]">Student Learning Dashboard</p>
                      <h1 className="text-2xl font-bold mt-1">Welcome back, {user.fullName}</h1>
                      <p className="text-xs text-white/75 mt-1">
                        {user.educationLevel} · Email {user.emailVerified ? 'Verified' : 'Pending Verification'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      <button
                        type="button"
                        onClick={() => onNavigate('study-hub')}
                        className="px-4 py-2 rounded-xl bg-[#4338CA] hover:bg-[#7C3AED] text-white text-xs font-semibold transition-colors"
                      >
                        New Study Note
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigate('smart-quiz')}
                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
                      >
                        Start Quiz
                      </button>
                    </div>
                  </div>

                  {/* KPI Metrics */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-5">
                      <p className="text-xs text-[#1E1B4B]/60">Total Learning Hours</p>
                      <p className="text-2xl font-extrabold text-[#4338CA] tabular-nums mt-1">
                        {data.stats.learningHours}h
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-5">
                      <p className="text-xs text-[#1E1B4B]/60">Completed Quizzes</p>
                      <p className="text-2xl font-extrabold text-[#1E1B4B] tabular-nums mt-1">
                        {data.stats.completedQuizzes}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-5">
                      <p className="text-xs text-[#1E1B4B]/60">Average Quiz Score</p>
                      <p className="text-2xl font-extrabold text-[#10B981] tabular-nums mt-1">
                        {data.stats.averageQuizScore}%
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-5">
                      <p className="text-xs text-[#1E1B4B]/60">Saved Study Notes</p>
                      <p className="text-2xl font-extrabold text-[#7C3AED] tabular-nums mt-1">
                        {data.stats.savedNotesCount}
                      </p>
                    </div>
                  </div>

                  {/* Notifications & Recommended Topics */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-6 space-y-3">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-[#4338CA]" />
                        <h2 className="text-base font-bold text-[#1E1B4B]">Notifications</h2>
                      </div>
                      {data.notifications.length === 0 ? (
                        <p className="text-xs text-[#1E1B4B]/60">No new notifications.</p>
                      ) : (
                        <div className="space-y-2.5">
                          {data.notifications.slice(0, 4).map((n) => (
                            <div key={n.id} className="rounded-xl bg-[#F8FAFC] p-3 text-xs">
                              <p className="font-semibold text-[#1E1B4B]">{n.title}</p>
                              <p className="text-[#1E1B4B]/65 mt-0.5">{n.body}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-6 space-y-3">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#7C3AED]" />
                        <h2 className="text-base font-bold text-[#1E1B4B]">Recommended Topics</h2>
                      </div>
                      <div className="space-y-2.5">
                        {data.recommendedTopics.map((rec) => (
                          <button
                            key={rec.topic}
                            type="button"
                            onClick={() => onNavigate('study-hub')}
                            className="w-full text-left rounded-xl bg-[#F8FAFC] hover:bg-[#4338CA]/5 p-3 text-xs transition-colors"
                          >
                            <p className="font-semibold text-[#1E1B4B]">{rec.topic}</p>
                            <p className="text-[#1E1B4B]/60 mt-0.5">{rec.reason}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recent Quiz Results, Upcoming Tasks, Conversations, Notes */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold text-[#1E1B4B]">Recent Quiz Results</h2>
                        <button
                          type="button"
                          onClick={() => setTab('progress')}
                          className="text-xs font-semibold text-[#4338CA] hover:underline"
                        >
                          View All
                        </button>
                      </div>
                      {data.recentQuizResults.length === 0 ? (
                        <p className="text-xs text-[#1E1B4B]/60">No quizzes attempted yet.</p>
                      ) : (
                        <div className="divide-y divide-[#1E1B4B]/8">
                          {data.recentQuizResults.slice(0, 4).map((q) => (
                            <div key={q.id} className="py-2.5 flex items-center justify-between text-xs">
                              <div>
                                <p className="font-semibold text-[#1E1B4B]">{q.topic}</p>
                                <p className="text-[#1E1B4B]/55">
                                  {q.subject} · {q.score}/{q.questionCount}
                                </p>
                              </div>
                              <span className="font-bold text-[#10B981] tabular-nums">{q.accuracy}%</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold text-[#1E1B4B]">Upcoming Study Tasks</h2>
                        <button
                          type="button"
                          onClick={() => setTab('planner')}
                          className="text-xs font-semibold text-[#4338CA] hover:underline"
                        >
                          Manage
                        </button>
                      </div>
                      {data.upcomingTasks.length === 0 ? (
                        <p className="text-xs text-[#1E1B4B]/60">No study tasks scheduled yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {data.upcomingTasks.slice(0, 4).map((t) => (
                            <div
                              key={t.id}
                              className="flex items-center justify-between gap-2 rounded-xl bg-[#F8FAFC] px-3 py-2 text-xs"
                            >
                              <span className={t.completed ? 'line-through text-[#1E1B4B]/45' : 'font-medium'}>
                                {t.title}
                              </span>
                              <span className="text-[#1E1B4B]/55 tabular-nums shrink-0">{t.dueDate}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {tab === 'courses' && data && (
                <div className="space-y-6">
                  <div className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-6 space-y-4">
                    <h2 className="text-lg font-bold text-[#1E1B4B]">Enrolled Courses</h2>
                    {data.enrolledCourses.length === 0 ? (
                      <p className="text-xs text-[#1E1B4B]/65">
                        You have not enrolled in any courses yet. Browse available courses below.
                      </p>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-4">
                        {data.enrolledCourses.map((c) => (
                          <div key={c.id} className="rounded-xl border border-[#4338CA]/25 bg-[#F8FAFC] p-4 space-y-2">
                            <p className="text-xs text-[#4338CA] font-semibold">
                              {c.subject} · {c.educationLevel}
                            </p>
                            <h3 className="text-sm font-bold text-[#1E1B4B]">{c.title}</h3>
                            <p className="text-xs text-[#1E1B4B]/70">{c.description}</p>
                            <button
                              type="button"
                              onClick={() => setSelectedCourse(c)}
                              className="mt-2 text-xs font-semibold text-[#4338CA] hover:underline"
                            >
                              Open {c.materials.length} Study Modules
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedCourse && (
                    <div className="rounded-2xl bg-white border border-[#4338CA]/30 p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-[#1E1B4B]">
                          Course Materials: {selectedCourse.title}
                        </h3>
                        <button
                          type="button"
                          onClick={() => setSelectedCourse(null)}
                          className="text-xs font-semibold text-[#1E1B4B]/60 hover:text-[#1E1B4B]"
                        >
                          Close
                        </button>
                      </div>
                      {selectedCourse.materials.length === 0 ? (
                        <p className="text-xs text-[#1E1B4B]/60">No study modules added yet.</p>
                      ) : (
                        <div className="space-y-4">
                          {selectedCourse.materials.map((m) => (
                            <div key={m.id} className="rounded-xl bg-[#F8FAFC] p-4 space-y-2">
                              <p className="text-xs font-semibold text-[#7C3AED]">
                                {m.type} · {m.title}
                              </p>
                              <MarkdownRenderer content={m.content} compact />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-6 space-y-4">
                    <h2 className="text-lg font-bold text-[#1E1B4B]">Course Catalog</h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {data.availableCourses.map((c) => {
                        const isEnrolled = c.enrolledUserIds.includes(user.id);
                        return (
                          <div key={c.id} className="rounded-xl border border-[#1E1B4B]/10 p-4 flex flex-col justify-between">
                            <div>
                              <p className="text-xs text-[#1E1B4B]/55">
                                {c.subject} · {c.educationLevel}
                              </p>
                              <h3 className="text-sm font-bold text-[#1E1B4B] mt-1">{c.title}</h3>
                              <p className="text-xs text-[#1E1B4B]/70 mt-1.5">{c.description}</p>
                            </div>
                            <div className="mt-4 flex items-center justify-between">
                              <span className="text-xs text-[#1E1B4B]/55">{c.educatorName}</span>
                              {isEnrolled ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#10B981]">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Enrolled</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleEnroll(c.id)}
                                  className="px-3 py-1.5 rounded-lg bg-[#4338CA] text-white text-xs font-semibold"
                                >
                                  Enroll Free
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {tab === 'notes' && data && (
                <div className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-[#1E1B4B]">My Saved Notes</h2>
                    <button
                      type="button"
                      onClick={() => onNavigate('study-hub')}
                      className="px-3.5 py-2 rounded-xl bg-[#4338CA] text-white text-xs font-semibold"
                    >
                      Generate New Note
                    </button>
                  </div>
                  {data.savedNotes.length === 0 ? (
                    <p className="text-xs text-[#1E1B4B]/65">
                      No saved notes yet. Save any explanation from AI Study Hub to read or print anytime.
                    </p>
                  ) : (
                    <div className="divide-y divide-[#1E1B4B]/10">
                      {data.savedNotes.map((n) => (
                        <div key={n.id} className="py-3.5 flex items-center justify-between gap-4">
                          <button
                            type="button"
                            onClick={() => setSelectedNote(n)}
                            className="text-left flex-1 min-w-0 hover:text-[#4338CA]"
                          >
                            <p className="text-sm font-bold text-[#1E1B4B] truncate">{n.topic}</p>
                            <p className="text-xs text-[#1E1B4B]/55">
                              {n.subject} · {n.depth} · {n.language}
                            </p>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(n.id)}
                            className="p-2 rounded-lg text-[#1E1B4B]/45 hover:text-[#1E1B4B]"
                            aria-label="Delete note"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedNote && (
                    <div className="mt-4 rounded-xl bg-[#F8FAFC] border border-[#1E1B4B]/10 p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-[#1E1B4B]">{selectedNote.topic}</h3>
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4338CA]"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Print / PDF</span>
                        </button>
                      </div>
                      <MarkdownRenderer content={selectedNote.content} compact />
                    </div>
                  )}
                </div>
              )}

              {tab === 'planner' && data && (
                <div className="space-y-6">
                  <form
                    onSubmit={handleCreateTask}
                    className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-6 space-y-4"
                  >
                    <h2 className="text-lg font-bold text-[#1E1B4B]">Smart Study Planner</h2>
                    <div className="grid sm:grid-cols-4 gap-3">
                      <input
                        type="text"
                        required
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        placeholder="e.g. Complete HSC Physics Chapter 4 MCQs"
                        className="sm:col-span-2 rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3.5 py-2 text-sm text-[#1E1B4B]"
                      />
                      <select
                        value={taskSubject}
                        onChange={(e) => setTaskSubject(e.target.value)}
                        className="rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-sm text-[#1E1B4B]"
                      >
                        {SUBJECTS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={taskDue}
                        onChange={(e) => setTaskDue(e.target.value)}
                        className="rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-sm text-[#1E1B4B]"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <select
                        value={taskPriority}
                        onChange={(e) => setTaskPriority(e.target.value as 'Low' | 'Medium' | 'High')}
                        className="rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-xs font-semibold text-[#1E1B4B]"
                      >
                        <option value="High">High Priority</option>
                        <option value="Medium">Medium Priority</option>
                        <option value="Low">Low Priority</option>
                      </select>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4338CA] text-white text-xs font-semibold"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Study Task</span>
                      </button>
                    </div>
                  </form>

                  <div className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-6 space-y-3">
                    <h3 className="text-base font-bold text-[#1E1B4B]">Your Study Schedule</h3>
                    {data.upcomingTasks.length === 0 ? (
                      <p className="text-xs text-[#1E1B4B]/60">No tasks added yet.</p>
                    ) : (
                      <div className="divide-y divide-[#1E1B4B]/8">
                        {data.upcomingTasks.map((t) => (
                          <div key={t.id} className="py-3 flex items-center justify-between gap-3">
                            <label className="flex items-center gap-3 cursor-pointer flex-1">
                              <input
                                type="checkbox"
                                checked={t.completed}
                                onChange={() => handleToggleTask(t)}
                                className="rounded border-[#1E1B4B]/30 text-[#10B981]"
                              />
                              <div>
                                <p
                                  className={`text-sm font-semibold ${
                                    t.completed ? 'line-through text-[#1E1B4B]/45' : 'text-[#1E1B4B]'
                                  }`}
                                >
                                  {t.title}
                                </p>
                                <p className="text-xs text-[#1E1B4B]/55">
                                  {t.subject} · {t.priority} Priority · Due {t.dueDate}
                                </p>
                              </div>
                            </label>
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(t.id)}
                              className="p-2 text-[#1E1B4B]/45 hover:text-[#1E1B4B]"
                              aria-label="Delete task"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {tab === 'progress' && data && (
                <div className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-6 space-y-6">
                  <h2 className="text-lg font-bold text-[#1E1B4B]">Learning Progress & Quiz Analytics</h2>
                  {data.recentQuizResults.length === 0 ? (
                    <p className="text-xs text-[#1E1B4B]/65">
                      Complete a Smart Quiz to visualize your accuracy trend and subject mastery.
                    </p>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-[#1E1B4B]/70">Accuracy Across Recent Quizzes</p>
                        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 items-end h-36 pt-4">
                          {data.recentQuizResults
                            .slice(0, 10)
                            .reverse()
                            .map((q) => (
                              <div key={q.id} className="flex flex-col items-center gap-1 h-full justify-end">
                                <span className="text-[10px] font-bold text-[#1E1B4B] tabular-nums">
                                  {q.accuracy}%
                                </span>
                                <div
                                  className="w-full rounded-t-lg bg-[#4338CA]"
                                  style={{ height: `${Math.max(12, q.accuracy)}%` }}
                                  title={`${q.subject}: ${q.topic} (${q.accuracy}%)`}
                                />
                                <span className="text-[10px] text-[#1E1B4B]/55 truncate w-full text-center">
                                  {q.subject.slice(0, 4)}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#F8FAFC] border-b border-[#1E1B4B]/10 text-[#1E1B4B]/65">
                            <tr>
                              <th className="py-2.5 px-3 font-semibold">Topic</th>
                              <th className="py-2.5 px-3 font-semibold">Subject</th>
                              <th className="py-2.5 px-3 font-semibold text-right">Score</th>
                              <th className="py-2.5 px-3 font-semibold text-right">Accuracy</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1E1B4B]/8">
                            {data.recentQuizResults.map((q) => (
                              <tr key={q.id}>
                                <td className="py-2.5 px-3 font-semibold text-[#1E1B4B]">{q.topic}</td>
                                <td className="py-2.5 px-3 text-[#1E1B4B]/70">{q.subject}</td>
                                <td className="py-2.5 px-3 text-right tabular-nums">
                                  {q.score}/{q.questionCount}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-[#10B981] tabular-nums">
                                  {q.accuracy}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}

              {tab === 'settings' && (
                <div className="space-y-6">
                  {/* Email Verification */}
                  {!user.emailVerified && (
                    <form
                      onSubmit={handleVerifyEmail}
                      className="rounded-2xl bg-white border border-[#7C3AED]/30 p-6 space-y-3"
                    >
                      <h2 className="text-base font-bold text-[#1E1B4B]">Verify Your Email Address</h2>
                      <p className="text-xs text-[#1E1B4B]/70">
                        Enter the 6-digit verification code issued for {user.email}.
                      </p>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <input
                          type="text"
                          required
                          value={verifyCode}
                          onChange={(e) => setVerifyCode(e.target.value)}
                          placeholder="6-digit code"
                          className="rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3.5 py-2 text-sm text-[#1E1B4B]"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-xl bg-[#10B981] text-white text-xs font-semibold"
                        >
                          Verify Email
                        </button>
                        <button
                          type="button"
                          onClick={handleResendCode}
                          className="px-3 py-2 text-xs font-semibold text-[#4338CA] hover:underline"
                        >
                          Generate New Code
                        </button>
                      </div>
                      {verifyStatus && <p className="text-xs text-[#1E1B4B]">{verifyStatus}</p>}
                    </form>
                  )}

                  {/* Profile & AI Preferences */}
                  <form
                    onSubmit={handleSaveSettings}
                    className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-6 space-y-6"
                  >
                    <div className="space-y-4">
                      <h2 className="text-lg font-bold text-[#1E1B4B]">Profile & Leaderboard Privacy</h2>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1">Full Name</label>
                          <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3.5 py-2 text-sm text-[#1E1B4B]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1">
                            Leaderboard Display Name
                          </label>
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3.5 py-2 text-sm text-[#1E1B4B]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1">Phone Number</label>
                          <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3.5 py-2 text-sm text-[#1E1B4B]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1">
                            Education Level
                          </label>
                          <select
                            value={educationLevel}
                            onChange={(e) => setEducationLevel(e.target.value as EducationLevel)}
                            className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3.5 py-2 text-sm text-[#1E1B4B]"
                          >
                            {EDUCATION_LEVELS.map((lvl) => (
                              <option key={lvl} value={lvl}>
                                {lvl}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <label className="inline-flex items-center gap-2.5 text-xs text-[#1E1B4B]/80 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={leaderboardPublic}
                          onChange={(e) => setLeaderboardPublic(e.target.checked)}
                          className="rounded border-[#1E1B4B]/30 text-[#4338CA]"
                        />
                        <span>Show my Display Name and verified quiz score on the public Student Leaderboard</span>
                      </label>
                    </div>

                    <div className="pt-6 border-t border-[#1E1B4B]/10 space-y-4">
                      <div>
                        <h3 className="text-base font-bold text-[#1E1B4B]">AI Settings & Customization</h3>
                        <p className="text-xs text-[#1E1B4B]/65 mt-0.5">
                          AI requests are securely routed through server-side Gemini integration using your environment secrets.
                        </p>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1">
                            Active Gemini Model
                          </label>
                          <select
                            value={aiModel}
                            onChange={(e) => setAiModel(e.target.value)}
                            className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3.5 py-2 text-sm text-[#1E1B4B]"
                          >
                            {models.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.label} ({m.tier})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1">
                            Default Response Language
                          </label>
                          <select
                            value={defaultLanguage}
                            onChange={(e) => setDefaultLanguage(e.target.value as 'English' | 'Bengali')}
                            className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3.5 py-2 text-sm text-[#1E1B4B]"
                          >
                            <option value="English">English</option>
                            <option value="Bengali">Bengali (বাংলা)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs font-semibold text-[#1E1B4B]/80 mb-1.5">
                          <span>Reasoning & Explanation Depth (Temperature)</span>
                          <span className="tabular-nums text-[#4338CA]">{temperature.toFixed(1)}</span>
                        </div>
                        <input
                          type="range"
                          min={0.2}
                          max={0.7}
                          step={0.1}
                          value={temperature}
                          onChange={(e) => setTemperature(parseFloat(e.target.value))}
                          className="w-full accent-[#4338CA]"
                        />
                        <div className="flex justify-between text-[11px] text-[#1E1B4B]/55 mt-1">
                          <span>0.2 Concise</span>
                          <span>0.4 Balanced (Default)</span>
                          <span>0.7 Deep Reasoning</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handleTestAi}
                          disabled={testingAi}
                          className="px-4 py-2 rounded-xl border border-[#4338CA]/30 text-xs font-semibold text-[#4338CA] hover:bg-[#4338CA]/5"
                        >
                          {testingAi ? 'Testing Connection...' : 'Test AI Connection'}
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 rounded-xl bg-[#4338CA] hover:bg-[#1E1B4B] text-white text-xs font-semibold"
                        >
                          Save Settings
                        </button>
                      </div>

                      {aiTestResult && (
                        <div
                          className={`rounded-xl px-4 py-3 text-xs ${
                            aiTestResult.ok
                              ? 'bg-[#10B981]/10 border border-[#10B981]/30 text-[#1E1B4B]'
                              : 'bg-[#1E1B4B]/5 border border-[#1E1B4B]/20 text-[#1E1B4B]'
                          }`}
                        >
                          {aiTestResult.message}
                        </div>
                      )}
                      {settingsMsg && (
                        <p className="text-xs font-semibold text-[#10B981]">{settingsMsg}</p>
                      )}
                      {settingsErr && <p className="text-xs text-[#1E1B4B]">{settingsErr}</p>}
                    </div>
                  </form>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
