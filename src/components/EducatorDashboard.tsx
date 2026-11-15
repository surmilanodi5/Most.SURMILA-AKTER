import { useEffect, useState, type FormEvent } from 'react';
import {
  BookPlus,
  CheckCircle2,
  ClipboardList,
  Loader2,
  PlusCircle,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { EDUCATION_LEVELS, SUBJECTS, type Course, type EducationLevel, type User } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface EducatorDashboardProps {
  user: User;
}

interface EducatorOverview {
  educatorVerified: boolean;
  courses: Course[];
  questionBank: Array<{
    id: string;
    subject: string;
    educationLevel: EducationLevel;
    topic: string;
    difficulty: string;
    question: string;
    options: string[];
    correctIndex: number;
  }>;
  studentPerformance: Array<{
    id: string;
    studentName: string;
    subject: string;
    topic: string;
    educationLevel: string;
    score: number;
    questionCount: number;
    accuracy: number;
    createdAt: string;
  }>;
}

export function EducatorDashboard({ user }: EducatorDashboardProps) {
  const [data, setData] = useState<EducatorOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'studio' | 'courses' | 'questions' | 'students'>('studio');

  // AI Authoring Studio
  const [materialType, setMaterialType] = useState<'Lesson Plan' | 'Exam Questions' | 'Syllabus' | 'MCQ Bank'>(
    'Lesson Plan'
  );
  const [subject, setSubject] = useState<string>('Physics');
  const [educationLevel, setEducationLevel] = useState<EducationLevel>('Higher Secondary (HSC)');
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState<'English' | 'Bengali'>('English');
  const [aiContent, setAiContent] = useState('');
  const [generating, setGenerating] = useState(false);
  const [attachCourseId, setAttachCourseId] = useState('');
  const [attachTitle, setAttachTitle] = useState('');
  const [studioMsg, setStudioMsg] = useState('');

  // Create Course
  const [courseTitle, setCourseTitle] = useState('');
  const [courseSubject, setCourseSubject] = useState<string>('Science');
  const [courseLevel, setCourseLevel] = useState<EducationLevel>('Secondary (SSC)');
  const [courseDesc, setCourseDesc] = useState('');

  // Add MCQ
  const [qTopic, setQTopic] = useState('');
  const [qText, setQText] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correctIdx, setCorrectIdx] = useState(0);
  const [qExp, setQExp] = useState('');

  const loadOverview = () => {
    setLoading(true);
    apiRequest<EducatorOverview>('/api/educator/overview')
      .then((res) => {
        setData(res);
        if (res.courses.length > 0 && !attachCourseId) {
          setAttachCourseId(res.courses[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerateMaterial = async (e: FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setGenerating(true);
    setStudioMsg('');
    try {
      const res = await apiRequest<{ content: string }>('/api/educator/ai-generate', {
        method: 'POST',
        body: JSON.stringify({ materialType, subject, educationLevel, topic: topic.trim(), language }),
      });
      setAiContent(res.content);
      setAttachTitle(`${materialType}: ${topic.trim()}`);
    } catch (err) {
      setStudioMsg(err instanceof Error ? err.message : 'Generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const handleAttachToCourse = async () => {
    if (!attachCourseId || !aiContent) return;
    const mappedType =
      materialType === 'MCQ Bank' ? 'Exam Questions' : (materialType as 'Lesson Plan' | 'Syllabus' | 'Exam Questions');
    try {
      await apiRequest(`/api/educator/courses/${attachCourseId}/materials`, {
        method: 'POST',
        body: JSON.stringify({
          title: attachTitle || topic,
          type: mappedType,
          content: aiContent,
        }),
      });
      setStudioMsg('Material saved to selected course.');
      loadOverview();
    } catch (err) {
      setStudioMsg(err instanceof Error ? err.message : 'Failed to attach material.');
    }
  };

  const handleCreateCourse = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/educator/courses', {
        method: 'POST',
        body: JSON.stringify({
          title: courseTitle,
          subject: courseSubject,
          educationLevel: courseLevel,
          description: courseDesc,
        }),
      });
      setCourseTitle('');
      setCourseDesc('');
      loadOverview();
    } catch {
      // ignore
    }
  };

  const handleAddQuestion = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/educator/question-bank', {
        method: 'POST',
        body: JSON.stringify({
          subject: courseSubject,
          educationLevel: courseLevel,
          topic: qTopic,
          difficulty: 'Medium',
          question: qText,
          options: [optA, optB, optC, optD],
          correctIndex: correctIdx,
          explanation: qExp,
        }),
      });
      setQText('');
      setOptA('');
      setOptB('');
      setOptC('');
      setOptD('');
      setQExp('');
      loadOverview();
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="rounded-2xl bg-[#1E1B4B] text-white p-6 sm:p-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#10B981]">Educator & Mentor Studio</p>
          <h1 className="text-2xl font-bold mt-1">{user.fullName}</h1>
          <p className="text-xs text-white/75 mt-1">
            {user.educationLevel} ·{' '}
            {data?.educatorVerified ? (
              <span className="inline-flex items-center gap-1 text-[#10B981] font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified Educator
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-white/80">
                <ShieldAlert className="w-3.5 h-3.5" /> Pending Admin Verification (courses await approval)
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-white/10">
          {[
            { key: 'studio', label: 'AI Authoring Studio' },
            { key: 'courses', label: 'My Courses' },
            { key: 'questions', label: 'MCQ Question Bank' },
            { key: 'students', label: 'Student Performance' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key as typeof tab)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
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
          <span>Loading educator workspace...</span>
        </div>
      ) : (
        <>
          {tab === 'studio' && (
            <div className="grid lg:grid-cols-12 gap-8 items-start">
              <form
                onSubmit={handleGenerateMaterial}
                className="lg:col-span-5 rounded-2xl bg-white border border-[#1E1B4B]/10 p-6 space-y-4"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#7C3AED]" />
                  <h2 className="text-base font-bold text-[#1E1B4B]">AI Curriculum & Exam Generator</h2>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1">Material Type</label>
                  <select
                    value={materialType}
                    onChange={(e) => setMaterialType(e.target.value as typeof materialType)}
                    className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-sm text-[#1E1B4B]"
                  >
                    <option value="Lesson Plan">Lesson Plan</option>
                    <option value="Exam Questions">Examination Question Paper</option>
                    <option value="Syllabus">Subject-Based Syllabus</option>
                    <option value="MCQ Bank">MCQ Question Bank</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1">Subject</label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-sm text-[#1E1B4B]"
                    >
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1">Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as 'English' | 'Bengali')}
                      className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-sm text-[#1E1B4B]"
                    >
                      <option value="English">English</option>
                      <option value="Bengali">Bengali</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1">Education Level</label>
                  <select
                    value={educationLevel}
                    onChange={(e) => setEducationLevel(e.target.value as EducationLevel)}
                    className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-sm text-[#1E1B4B]"
                  >
                    {EDUCATION_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1">Chapter / Scope</label>
                  <textarea
                    rows={3}
                    required
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. HSC Physics Chapter 3: Current Electricity (50 marks creative & MCQ set)"
                    className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3.5 py-2 text-sm text-[#1E1B4B]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={generating}
                  className="w-full py-2.5 rounded-xl bg-[#4338CA] hover:bg-[#1E1B4B] text-white text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {generating ? 'Generating Material...' : `Generate ${materialType}`}
                </button>
                {studioMsg && <p className="text-xs text-[#10B981] font-semibold">{studioMsg}</p>}
              </form>

              <div className="lg:col-span-7 rounded-2xl bg-white border border-[#1E1B4B]/10 p-6 space-y-4 min-h-[420px]">
                {aiContent ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1E1B4B]/10">
                      <h3 className="text-base font-bold text-[#1E1B4B]">Generated Teaching Resource</h3>
                      {data && data.courses.length > 0 && (
                        <div className="flex items-center gap-2">
                          <select
                            value={attachCourseId}
                            onChange={(e) => setAttachCourseId(e.target.value)}
                            className="rounded-lg border border-[#1E1B4B]/15 bg-[#F8FAFC] px-2.5 py-1.5 text-xs text-[#1E1B4B]"
                          >
                            {data.courses.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.title}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={handleAttachToCourse}
                            className="px-3 py-1.5 rounded-lg bg-[#10B981] text-white text-xs font-semibold"
                          >
                            Save to Course
                          </button>
                        </div>
                      )}
                    </div>
                    <MarkdownRenderer content={aiContent} />
                  </>
                ) : (
                  <div className="py-16 text-center space-y-2">
                    <ClipboardList className="w-10 h-10 text-[#4338CA] mx-auto" />
                    <p className="text-sm font-bold text-[#1E1B4B]">Ready to Draft Teaching Materials</p>
                    <p className="text-xs text-[#1E1B4B]/65 max-w-md mx-auto">
                      Generate lesson plans, syllabuses, and examination question papers aligned with Bangladesh SSC, HSC, and University standards.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'courses' && data && (
            <div className="grid lg:grid-cols-12 gap-8 items-start">
              <form
                onSubmit={handleCreateCourse}
                className="lg:col-span-5 rounded-2xl bg-white border border-[#1E1B4B]/10 p-6 space-y-4"
              >
                <div className="flex items-center gap-2">
                  <BookPlus className="w-5 h-5 text-[#4338CA]" />
                  <h2 className="text-base font-bold text-[#1E1B4B]">Create New Course</h2>
                </div>
                <input
                  type="text"
                  required
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  placeholder="Course Title"
                  className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3.5 py-2 text-sm text-[#1E1B4B]"
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={courseSubject}
                    onChange={(e) => setCourseSubject(e.target.value)}
                    className="rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-sm text-[#1E1B4B]"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <select
                    value={courseLevel}
                    onChange={(e) => setCourseLevel(e.target.value as EducationLevel)}
                    className="rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-sm text-[#1E1B4B]"
                  >
                    {EDUCATION_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  rows={3}
                  required
                  value={courseDesc}
                  onChange={(e) => setCourseDesc(e.target.value)}
                  placeholder="Course description and learning outcomes..."
                  className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3.5 py-2 text-sm text-[#1E1B4B]"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#4338CA] text-white text-sm font-semibold"
                >
                  Create Course
                </button>
              </form>

              <div className="lg:col-span-7 space-y-4">
                {data.courses.map((c) => (
                  <div key={c.id} className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-5 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-[#1E1B4B]/60">
                        {c.subject} · {c.educationLevel} · {c.materials.length} modules
                      </p>
                      <span
                        className={`text-xs font-semibold ${
                          c.published ? 'text-[#10B981]' : 'text-[#7C3AED]'
                        }`}
                      >
                        {c.published ? 'Published' : 'Awaiting Admin Approval'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[#1E1B4B]">{c.title}</h3>
                    <p className="text-xs text-[#1E1B4B]/70">{c.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'questions' && data && (
            <div className="grid lg:grid-cols-12 gap-8 items-start">
              <form
                onSubmit={handleAddQuestion}
                className="lg:col-span-5 rounded-2xl bg-white border border-[#1E1B4B]/10 p-6 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-[#4338CA]" />
                  <h2 className="text-base font-bold text-[#1E1B4B]">Add Question Bank MCQ</h2>
                </div>
                <input
                  type="text"
                  required
                  value={qTopic}
                  onChange={(e) => setQTopic(e.target.value)}
                  placeholder="Topic (e.g. Organic Chemistry)"
                  className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3.5 py-2 text-sm"
                />
                <textarea
                  rows={2}
                  required
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  placeholder="Question text..."
                  className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3.5 py-2 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input required value={optA} onChange={(e) => setOptA(e.target.value)} placeholder="Option A" className="rounded-lg border border-[#1E1B4B]/15 px-3 py-1.5 text-xs" />
                  <input required value={optB} onChange={(e) => setOptB(e.target.value)} placeholder="Option B" className="rounded-lg border border-[#1E1B4B]/15 px-3 py-1.5 text-xs" />
                  <input required value={optC} onChange={(e) => setOptC(e.target.value)} placeholder="Option C" className="rounded-lg border border-[#1E1B4B]/15 px-3 py-1.5 text-xs" />
                  <input required value={optD} onChange={(e) => setOptD(e.target.value)} placeholder="Option D" className="rounded-lg border border-[#1E1B4B]/15 px-3 py-1.5 text-xs" />
                </div>
                <select
                  value={correctIdx}
                  onChange={(e) => setCorrectIdx(Number(e.target.value))}
                  className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-xs font-semibold"
                >
                  <option value={0}>Correct Answer: Option A</option>
                  <option value={1}>Correct Answer: Option B</option>
                  <option value={2}>Correct Answer: Option C</option>
                  <option value={3}>Correct Answer: Option D</option>
                </select>
                <input
                  type="text"
                  value={qExp}
                  onChange={(e) => setQExp(e.target.value)}
                  placeholder="Simple explanation"
                  className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3.5 py-2 text-xs"
                />
                <button type="submit" className="w-full py-2.5 rounded-xl bg-[#4338CA] text-white text-xs font-semibold">
                  Save to Question Bank
                </button>
              </form>

              <div className="lg:col-span-7 rounded-2xl bg-white border border-[#1E1B4B]/10 p-6 space-y-3">
                <h3 className="text-base font-bold text-[#1E1B4B]">Saved Question Bank ({data.questionBank.length})</h3>
                <div className="divide-y divide-[#1E1B4B]/8">
                  {data.questionBank.map((q) => (
                    <div key={q.id} className="py-3 space-y-1">
                      <p className="text-xs text-[#7C3AED] font-semibold">
                        {q.subject} · {q.topic} · {q.educationLevel}
                      </p>
                      <p className="text-sm font-semibold text-[#1E1B4B]">{q.question}</p>
                      <p className="text-xs text-[#10B981]">Answer: {q.options[q.correctIndex]}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'students' && data && (
            <div className="rounded-2xl bg-white border border-[#1E1B4B]/10 overflow-hidden">
              <div className="p-6 border-b border-[#1E1B4B]/10">
                <h2 className="text-lg font-bold text-[#1E1B4B]">Student Quiz Performance</h2>
              </div>
              {data.studentPerformance.length === 0 ? (
                <p className="p-6 text-xs text-[#1E1B4B]/60">No student quiz attempts recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] border-b border-[#1E1B4B]/10 text-[#1E1B4B]/65">
                      <tr>
                        <th className="py-3 px-5 font-semibold">Student</th>
                        <th className="py-3 px-4 font-semibold">Subject & Topic</th>
                        <th className="py-3 px-4 font-semibold">Level</th>
                        <th className="py-3 px-4 font-semibold text-right">Score</th>
                        <th className="py-3 px-5 font-semibold text-right">Accuracy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E1B4B]/8">
                      {data.studentPerformance.map((row) => (
                        <tr key={row.id}>
                          <td className="py-3 px-5 font-semibold text-[#1E1B4B]">{row.studentName}</td>
                          <td className="py-3 px-4">
                            {row.subject} · {row.topic}
                          </td>
                          <td className="py-3 px-4 text-[#1E1B4B]/65">{row.educationLevel}</td>
                          <td className="py-3 px-4 text-right tabular-nums">
                            {row.score}/{row.questionCount}
                          </td>
                          <td className="py-3 px-5 text-right font-bold text-[#10B981] tabular-nums">
                            {row.accuracy}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
