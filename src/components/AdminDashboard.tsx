import { useEffect, useState, type FormEvent } from 'react';
import {
  Activity,
  Bot,
  CheckCircle2,
  Database,
  Loader2,
  Shield,
  Sliders,
  Trash2,
  Users,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import type {
  AiModelInfo,
  Announcement,
  Course,
  QuizAttempt,
  SiteSettings,
  Testimonial,
  User,
} from '../types';

interface AdminDashboardProps {
  user: User;
  onSettingsUpdated: (settings: SiteSettings) => void;
}

interface AdminOverview {
  metrics: {
    totalUsers: number;
    totalStudents: number;
    totalEducators: number;
    totalCourses: number;
    totalQuizAttempts: number;
    totalAiRequests: number;
    aiSuccessCount: number;
    aiErrorCount: number;
  };
  users: User[];
  courses: Course[];
  questionBank: Array<{ id: string; subject: string; topic: string; question: string }>;
  quizAttempts: QuizAttempt[];
  announcements: Announcement[];
  testimonials: Testimonial[];
  siteSettings: SiteSettings;
  activityLogs: Array<{ id: string; actorName: string; action: string; target: string; createdAt: string }>;
  aiUsageLogs: Array<{
    id: string;
    feature: string;
    model: string;
    success: boolean;
    errorMessage?: string;
    latencyMs: number;
    createdAt: string;
  }>;
  aiErrorLogs: Array<{ id: string; feature: string; model: string; errorMessage?: string; createdAt: string }>;
  availableModels: AiModelInfo[];
}

export function AdminDashboard({ user, onSettingsUpdated }: AdminDashboardProps) {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'users' | 'courses' | 'content' | 'ai' | 'system'>('overview');

  // User search & filter
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Content & Settings form
  const [questionsSolved, setQuestionsSolved] = useState('');
  const [quizzesCreated, setQuizzesCreated] = useState('');
  const [studentSatisfaction, setStudentSatisfaction] = useState('');
  const [address, setAddress] = useState('');
  const [tagline, setTagline] = useState('');
  const [defaultModel, setDefaultModel] = useState('gemini-4-hydrogen');
  const [enabledModels, setEnabledModels] = useState<string[]>([]);
  const [dailyLimit, setDailyLimit] = useState(100);
  const [saveNotice, setSaveNotice] = useState('');

  // Announcements & Testimonials
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [testName, setTestName] = useState('');
  const [testRole, setTestRole] = useState('');
  const [testInst, setTestInst] = useState('');
  const [testQuote, setTestQuote] = useState('');
  const [testOutcome, setTestOutcome] = useState('');

  const loadAdmin = () => {
    setLoading(true);
    apiRequest<AdminOverview>('/api/admin/overview')
      .then((res) => {
        setData(res);
        setQuestionsSolved(res.siteSettings.promoStats.questionsSolved);
        setQuizzesCreated(res.siteSettings.promoStats.quizzesCreated);
        setStudentSatisfaction(res.siteSettings.promoStats.studentSatisfaction);
        setAddress(res.siteSettings.address);
        setTagline(res.siteSettings.tagline);
        setDefaultModel(res.siteSettings.aiConfig.defaultModel);
        setEnabledModels(res.siteSettings.aiConfig.enabledModels);
        setDailyLimit(res.siteSettings.aiConfig.dailyLimitPerUser);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAdmin();
  }, []);

  const handleUpdateUser = async (targetId: string, patch: Record<string, unknown>) => {
    try {
      await apiRequest(`/api/admin/users/${targetId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      loadAdmin();
    } catch {
      // ignore
    }
  };

  const handleToggleCourse = async (course: Course) => {
    await apiRequest(`/api/admin/courses/${course.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ published: !course.published }),
    });
    loadAdmin();
  };

  const handleDeleteCourse = async (id: string) => {
    await apiRequest(`/api/admin/courses/${id}`, { method: 'DELETE' });
    loadAdmin();
  };

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    setSaveNotice('');
    const res = await apiRequest<{ siteSettings: SiteSettings }>('/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify({
        address,
        tagline,
        promoStats: {
          questionsSolved,
          quizzesCreated,
          studentSatisfaction,
        },
        aiConfig: {
          defaultModel,
          enabledModels: enabledModels.length > 0 ? enabledModels : ['gemini-4-hydrogen'],
          dailyLimitPerUser: Number(dailyLimit) || 100,
        },
      }),
    });
    onSettingsUpdated(res.siteSettings);
    setSaveNotice('Settings saved.');
    loadAdmin();
  };

  const handleCreateAnnouncement = async (e: FormEvent) => {
    e.preventDefault();
    await apiRequest('/api/admin/announcements', {
      method: 'POST',
      body: JSON.stringify({ title: annTitle, body: annBody, audience: 'ALL' }),
    });
    setAnnTitle('');
    setAnnBody('');
    loadAdmin();
  };

  const handleCreateTestimonial = async (e: FormEvent) => {
    e.preventDefault();
    await apiRequest('/api/admin/testimonials', {
      method: 'POST',
      body: JSON.stringify({
        name: testName,
        role: testRole,
        institution: testInst,
        quote: testQuote,
        outcome: testOutcome,
      }),
    });
    setTestName('');
    setTestRole('');
    setTestInst('');
    setTestQuote('');
    setTestOutcome('');
    loadAdmin();
  };

  const filteredUsers = (data?.users || []).filter((u) => {
    const matchesSearch =
      !search.trim() ||
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="rounded-2xl bg-[#1E1B4B] text-white p-6 sm:p-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#10B981]">Secure Administration Console</p>
          <h1 className="text-2xl font-bold mt-1">{user.fullName}</h1>
          <p className="text-xs text-white/75 mt-1">
            {user.role} · {data?.siteSettings.address || 'Gaibandha Circular Road, Gaibandha, Bangladesh.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-white/10">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'users', label: 'Users' },
            { key: 'courses', label: 'Courses & Quizzes' },
            { key: 'content', label: 'Content & Stats' },
            { key: 'ai', label: 'AI Management' },
            { key: 'system', label: 'System & Logs' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key as typeof tab)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                tab === item.key ? 'bg-white text-[#1E1B4B]' : 'text-white/80 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <div className="p-12 flex items-center justify-center gap-2 text-sm text-[#1E1B4B]/65">
          <Loader2 className="w-5 h-5 animate-spin text-[#4338CA]" />
          <span>Loading admin telemetry...</span>
        </div>
      ) : (
        data && (
          <>
            {tab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                  {[
                    { label: 'Total Users', value: data.metrics.totalUsers },
                    { label: 'Students', value: data.metrics.totalStudents },
                    { label: 'Educators', value: data.metrics.totalEducators },
                    { label: 'Courses', value: data.metrics.totalCourses },
                    { label: 'Quiz Attempts', value: data.metrics.totalQuizAttempts },
                    { label: 'AI Requests', value: data.metrics.totalAiRequests },
                  ].map((m) => (
                    <div key={m.label} className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-4">
                      <p className="text-xs text-[#1E1B4B]/60">{m.label}</p>
                      <p className="text-2xl font-extrabold text-[#1E1B4B] tabular-nums mt-1">{m.value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#4338CA]" />
                    <h2 className="text-base font-bold text-[#1E1B4B]">Recent Platform Activity</h2>
                  </div>
                  {data.activityLogs.length === 0 ? (
                    <p className="text-xs text-[#1E1B4B]/60">No activity events recorded yet.</p>
                  ) : (
                    <div className="divide-y divide-[#1E1B4B]/8">
                      {data.activityLogs.slice(0, 10).map((log) => (
                        <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                          <span>
                            <strong className="text-[#1E1B4B]">{log.actorName}</strong> — {log.action} ({log.target})
                          </span>
                          <span className="text-[#1E1B4B]/55 tabular-nums">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'users' && (
              <div className="rounded-2xl bg-white border border-[#1E1B4B]/10 overflow-hidden">
                <div className="p-5 border-b border-[#1E1B4B]/10 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#4338CA]" />
                    <h2 className="text-base font-bold text-[#1E1B4B]">User & Verification Management</h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search name or email..."
                      className="rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-1.5 text-xs"
                    />
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-1.5 text-xs font-semibold"
                    >
                      <option value="ALL">All Roles</option>
                      <option value="STUDENT">Student</option>
                      <option value="EDUCATOR">Educator</option>
                      <option value="ADMIN">Admin</option>
                      <option value="SUPER_ADMIN">Super Admin</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] border-b border-[#1E1B4B]/10 text-[#1E1B4B]/65">
                      <tr>
                        <th className="py-3 px-4 font-semibold">User</th>
                        <th className="py-3 px-4 font-semibold">Role</th>
                        <th className="py-3 px-4 font-semibold">Status</th>
                        <th className="py-3 px-4 font-semibold">Educator Verification</th>
                        <th className="py-3 px-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E1B4B]/8">
                      {filteredUsers.map((u) => (
                        <tr key={u.id}>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-[#1E1B4B]">{u.fullName}</p>
                            <p className="text-[#1E1B4B]/55">
                              {u.email} · {u.educationLevel}
                            </p>
                          </td>
                          <td className="py-3 px-4">
                            {u.role === 'SUPER_ADMIN' ? (
                              <span className="font-bold text-[#7C3AED]">SUPER_ADMIN</span>
                            ) : (
                              <select
                                value={u.role}
                                onChange={(e) => handleUpdateUser(u.id, { role: e.target.value })}
                                className="rounded-lg border border-[#1E1B4B]/15 bg-[#F8FAFC] px-2 py-1 text-xs font-semibold"
                              >
                                <option value="STUDENT">STUDENT</option>
                                <option value="EDUCATOR">EDUCATOR</option>
                                {user.role === 'SUPER_ADMIN' && <option value="ADMIN">ADMIN</option>}
                              </select>
                            )}
                          </td>
                          <td className="py-3 px-4 font-semibold">
                            <span className={u.status === 'ACTIVE' ? 'text-[#10B981]' : 'text-[#1E1B4B]/60'}>
                              {u.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {u.role === 'EDUCATOR' ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateUser(u.id, { educatorVerified: !u.educatorVerified })
                                }
                                className={`px-2.5 py-1 rounded-lg font-semibold ${
                                  u.educatorVerified
                                    ? 'bg-[#10B981]/12 text-[#10B981]'
                                    : 'bg-[#7C3AED]/10 text-[#7C3AED]'
                                }`}
                              >
                                {u.educatorVerified ? 'Verified Educator' : 'Approve Educator'}
                              </button>
                            ) : (
                              <span className="text-[#1E1B4B]/45">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {u.id !== user.id && u.role !== 'SUPER_ADMIN' && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateUser(u.id, {
                                    status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                                  })
                                }
                                className="px-3 py-1 rounded-lg border border-[#1E1B4B]/15 font-semibold hover:bg-[#F8FAFC]"
                              >
                                {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'courses' && (
              <div className="space-y-6">
                <div className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-6 space-y-4">
                  <h2 className="text-base font-bold text-[#1E1B4B]">Courses ({data.courses.length})</h2>
                  <div className="divide-y divide-[#1E1B4B]/8">
                    {data.courses.map((c) => (
                      <div key={c.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-[#1E1B4B]">{c.title}</p>
                          <p className="text-xs text-[#1E1B4B]/55">
                            {c.subject} · {c.educationLevel} · By {c.educatorName}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleCourse(c)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                              c.published
                                ? 'bg-[#10B981]/12 text-[#10B981]'
                                : 'bg-[#4338CA] text-white'
                            }`}
                          >
                            {c.published ? 'Published (Unpublish)' : 'Publish Course'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCourse(c.id)}
                            className="p-2 text-[#1E1B4B]/50 hover:text-[#1E1B4B]"
                            aria-label="Delete course"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-6 space-y-3">
                  <h2 className="text-base font-bold text-[#1E1B4B]">
                    Question Bank ({data.questionBank.length}) & Recent Quiz Reviews
                  </h2>
                  <div className="divide-y divide-[#1E1B4B]/8">
                    {data.questionBank.map((q) => (
                      <div key={q.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                        <span>
                          <strong>{q.subject}</strong> · {q.topic}: {q.question}
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            await apiRequest(`/api/admin/question-bank/${q.id}`, { method: 'DELETE' });
                            loadAdmin();
                          }}
                          className="text-[#1E1B4B]/50 hover:text-[#1E1B4B]"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'content' && (
              <div className="grid lg:grid-cols-2 gap-6">
                <form
                  onSubmit={handleSaveSettings}
                  className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-6 space-y-4"
                >
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#4338CA]" />
                    <h2 className="text-base font-bold text-[#1E1B4B]">Homepage Sample Statistics & Brand</h2>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Questions Solved</label>
                      <input
                        value={questionsSolved}
                        onChange={(e) => setQuestionsSolved(e.target.value)}
                        className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-sm tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Quizzes Created</label>
                      <input
                        value={quizzesCreated}
                        onChange={(e) => setQuizzesCreated(e.target.value)}
                        className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-sm tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Satisfaction</label>
                      <input
                        value={studentSatisfaction}
                        onChange={(e) => setStudentSatisfaction(e.target.value)}
                        className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-sm tabular-nums"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Brand Tagline</label>
                    <input
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Official Address</label>
                    <input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#4338CA] text-white text-xs font-semibold"
                  >
                    Save Content Settings
                  </button>
                  {saveNotice && <p className="text-xs font-semibold text-[#10B981]">{saveNotice}</p>}
                </form>

                <div className="space-y-6">
                  <form
                    onSubmit={handleCreateAnnouncement}
                    className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-6 space-y-3"
                  >
                    <h2 className="text-base font-bold text-[#1E1B4B]">Announcements</h2>
                    <input
                      required
                      value={annTitle}
                      onChange={(e) => setAnnTitle(e.target.value)}
                      placeholder="Announcement title"
                      className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-xs"
                    />
                    <input
                      required
                      value={annBody}
                      onChange={(e) => setAnnBody(e.target.value)}
                      placeholder="Announcement message"
                      className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-xs"
                    />
                    <button type="submit" className="px-4 py-2 rounded-xl bg-[#4338CA] text-white text-xs font-semibold">
                      Publish Announcement
                    </button>
                    <div className="divide-y divide-[#1E1B4B]/8 pt-2">
                      {data.announcements.map((a) => (
                        <div key={a.id} className="py-2 flex items-center justify-between text-xs">
                          <span>{a.title}</span>
                          <button
                            type="button"
                            onClick={async () => {
                              await apiRequest(`/api/admin/announcements/${a.id}`, { method: 'DELETE' });
                              loadAdmin();
                            }}
                            className="text-[#1E1B4B]/50 hover:text-[#1E1B4B]"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  </form>

                  <form
                    onSubmit={handleCreateTestimonial}
                    className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-6 space-y-2.5"
                  >
                    <h2 className="text-base font-bold text-[#1E1B4B]">Add Testimonial</h2>
                    <div className="grid grid-cols-2 gap-2">
                      <input required value={testName} onChange={(e) => setTestName(e.target.value)} placeholder="Name" className="rounded-lg border border-[#1E1B4B]/15 px-3 py-1.5 text-xs" />
                      <input required value={testRole} onChange={(e) => setTestRole(e.target.value)} placeholder="Role" className="rounded-lg border border-[#1E1B4B]/15 px-3 py-1.5 text-xs" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input required value={testInst} onChange={(e) => setTestInst(e.target.value)} placeholder="Institution" className="rounded-lg border border-[#1E1B4B]/15 px-3 py-1.5 text-xs" />
                      <input required value={testOutcome} onChange={(e) => setTestOutcome(e.target.value)} placeholder="Outcome metric" className="rounded-lg border border-[#1E1B4B]/15 px-3 py-1.5 text-xs" />
                    </div>
                    <textarea required rows={2} value={testQuote} onChange={(e) => setTestQuote(e.target.value)} placeholder="Student or educator quote..." className="w-full rounded-lg border border-[#1E1B4B]/15 px-3 py-1.5 text-xs" />
                    <button type="submit" className="px-4 py-2 rounded-xl bg-[#4338CA] text-white text-xs font-semibold">
                      Add Testimonial
                    </button>
                  </form>
                </div>
              </div>
            )}

            {tab === 'ai' && (
              <div className="grid lg:grid-cols-12 gap-6">
                <form
                  onSubmit={handleSaveSettings}
                  className="lg:col-span-5 rounded-2xl bg-white border border-[#1E1B4B]/10 p-6 space-y-4"
                >
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-[#7C3AED]" />
                    <h2 className="text-base font-bold text-[#1E1B4B]">AI Provider & Model Governance</h2>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Default Gemini Model</label>
                    <select
                      value={defaultModel}
                      onChange={(e) => setDefaultModel(e.target.value)}
                      className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-sm"
                    >
                      {data.availableModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5">Enabled Models</label>
                    <div className="space-y-1.5">
                      {data.availableModels.map((m) => (
                        <label key={m.id} className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enabledModels.includes(m.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEnabledModels([...enabledModels, m.id]);
                              } else {
                                setEnabledModels(enabledModels.filter((x) => x !== m.id));
                              }
                            }}
                          />
                          <span>{m.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Daily Request Limit Per User</label>
                    <input
                      type="number"
                      min={5}
                      max={1000}
                      value={dailyLimit}
                      onChange={(e) => setDailyLimit(Number(e.target.value))}
                      className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-sm tabular-nums"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#4338CA] text-white text-xs font-semibold"
                  >
                    Save AI Configuration
                  </button>
                  {saveNotice && <p className="text-xs font-semibold text-[#10B981]">{saveNotice}</p>}
                </form>

                <div className="lg:col-span-7 rounded-2xl bg-white border border-[#1E1B4B]/10 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-[#1E1B4B]">AI Usage & Error Logs</h2>
                    <span className="text-xs text-[#1E1B4B]/60 tabular-nums">
                      {data.metrics.aiSuccessCount} ok · {data.metrics.aiErrorCount} errors
                    </span>
                  </div>
                  {data.aiUsageLogs.length === 0 ? (
                    <p className="text-xs text-[#1E1B4B]/60">No AI requests logged yet.</p>
                  ) : (
                    <div className="overflow-x-auto max-h-80">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F8FAFC] border-b border-[#1E1B4B]/10 text-[#1E1B4B]/65">
                          <tr>
                            <th className="py-2 px-3">Feature</th>
                            <th className="py-2 px-3">Model</th>
                            <th className="py-2 px-3 text-right">Latency</th>
                            <th className="py-2 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1E1B4B]/8">
                          {data.aiUsageLogs.slice(0, 20).map((log) => (
                            <tr key={log.id}>
                              <td className="py-2 px-3 font-medium">{log.feature}</td>
                              <td className="py-2 px-3 font-mono text-[11px]">{log.model}</td>
                              <td className="py-2 px-3 text-right tabular-nums">{log.latencyMs}ms</td>
                              <td className="py-2 px-3">
                                {log.success ? (
                                  <span className="text-[#10B981] font-semibold">Success</span>
                                ) : (
                                  <span className="text-[#1E1B4B] font-semibold" title={log.errorMessage}>
                                    Error: {log.errorMessage?.slice(0, 40)}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'system' && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#4338CA]" />
                    <h2 className="text-base font-bold text-[#1E1B4B]">Security & RBAC Posture</h2>
                  </div>
                  <ul className="space-y-2 text-xs text-[#1E1B4B]/80">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                      <span>Password Hashing: Per-user 16-byte salt + scrypt key derivation</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                      <span>Login Rate Limiting: Max 10 failed attempts per 15-minute window</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                      <span>Public Admin Registration: Permanently blocked at API boundary</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                      <span>Roles Enforced: STUDENT, EDUCATOR, ADMIN, SUPER_ADMIN</span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#7C3AED]" />
                    <h2 className="text-base font-bold text-[#1E1B4B]">Data Storage Summary</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl bg-[#F8FAFC] p-3">
                      <p className="text-[#1E1B4B]/60">Registered Accounts</p>
                      <p className="text-lg font-bold tabular-nums">{data.metrics.totalUsers}</p>
                    </div>
                    <div className="rounded-xl bg-[#F8FAFC] p-3">
                      <p className="text-[#1E1B4B]/60">Published Courses</p>
                      <p className="text-lg font-bold tabular-nums">{data.metrics.totalCourses}</p>
                    </div>
                    <div className="rounded-xl bg-[#F8FAFC] p-3">
                      <p className="text-[#1E1B4B]/60">MCQ Bank Items</p>
                      <p className="text-lg font-bold tabular-nums">{data.questionBank.length}</p>
                    </div>
                    <div className="rounded-xl bg-[#F8FAFC] p-3">
                      <p className="text-[#1E1B4B]/60">Activity Events</p>
                      <p className="text-lg font-bold tabular-nums">{data.activityLogs.length}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}
