import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  BrainCircuit,
  CalendarCheck2,
  CheckCircle2,
  Compass,
  FileText,
  Layers,
  LineChart,
  Loader2,
  MapPin,
  MessageSquareText,
  Send,
  Sparkles,
} from 'lucide-react';
import { SUBJECTS, type Announcement, type AppPage, type Course, type LeaderboardEntry, type SiteSettings, type Testimonial, type User } from '../types';
import { Logo } from './Logo';
import { MarkdownRenderer } from './MarkdownRenderer';

interface LandingPageProps {
  user: User | null;
  siteSettings: SiteSettings;
  courses: Course[];
  announcements: Announcement[];
  testimonials: Testimonial[];
  leaderboard: LeaderboardEntry[];
  quickQuestion: string;
  quickSubject: string;
  quickAnswer: string;
  quickLoading: boolean;
  quickError: string;
  onQuickQuestionChange: (val: string) => void;
  onQuickSubjectChange: (val: string) => void;
  onSubmitQuickAsk: () => void;
  onNavigate: (page: AppPage) => void;
  onOpenAuth: (tab?: 'login' | 'register') => void;
}

function AnimatedStatValue({ target }: { target: string }) {
  const [display, setDisplay] = useState(target);

  useEffect(() => {
    const match = target.match(/^([\d,]+(?:\.\d+)?)(.*)$/);
    if (!match) {
      setDisplay(target);
      return;
    }
    const numeric = parseFloat(match[1].replace(/,/g, ''));
    const suffix = match[2] || '';
    const hasComma = match[1].includes(',');
    const isDecimal = match[1].includes('.');
    const duration = 900;
    const start = performance.now();

    let raf = 0;
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = numeric * eased;
      const formatted = isDecimal
        ? current.toFixed(1)
        : hasComma
        ? Math.round(current).toLocaleString('en-US')
        : String(Math.round(current));
      setDisplay(`${formatted}${suffix}`);
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      } else {
        setDisplay(target);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return <span className="tabular-nums">{display}</span>;
}

export function LandingPage({
  user,
  siteSettings,
  courses,
  announcements,
  testimonials,
  leaderboard,
  quickQuestion,
  quickSubject,
  quickAnswer,
  quickLoading,
  quickError,
  onQuickQuestionChange,
  onQuickSubjectChange,
  onSubmitQuickAsk,
  onNavigate,
  onOpenAuth,
}: LandingPageProps) {
  const [previewTab, setPreviewTab] = useState<'chat' | 'progress' | 'subjects'>('chat');

  const handleQuickSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmitQuickAsk();
  };

  return (
    <div className="bg-[#F8FAFC] text-[#1E1B4B]">
      {/* Active Announcement Strip */}
      {announcements.length > 0 && (
        <div className="bg-[#1E1B4B] text-white text-xs sm:text-sm py-2.5 px-4">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
            <span className="font-semibold text-[#10B981]">{announcements[0].title}</span>
            <span aria-hidden="true" className="text-white/40">
              ·
            </span>
            <span className="text-white/85">{announcements[0].body}</span>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-[#1E1B4B]/10 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            {/* Left Column: Headline, Quick AI Input, CTAs */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <p className="text-xs sm:text-sm font-semibold tracking-wide text-[#7C3AED]">
                  Next-Generation AI Learning Platform · Bangladesh
                </p>
                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#1E1B4B] leading-[1.12] max-w-2xl">
                  Learn Any Subject with the Power of AI
                </h1>
                <p className="text-base sm:text-lg text-[#1E1B4B]/80 leading-relaxed max-w-2xl">
                  Understand complex concepts, practice smarter, and achieve your academic goals with your personal AI-powered learning assistant.
                </p>
                <p className="text-sm sm:text-base text-[#1E1B4B]/65 leading-relaxed max-w-2xl">
                  From school and college to university admission and job preparation, EduGenius AI helps you learn faster and grow smarter.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => (user ? onNavigate('study-hub') : onOpenAuth('register'))}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#4338CA] hover:bg-[#1E1B4B] text-white text-sm font-semibold transition-colors shadow-sm"
                  >
                    <span>Start Learning Free</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <a
                    href="#features"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] hover:border-[#4338CA]/40 text-[#1E1B4B] text-sm font-semibold transition-colors"
                  >
                    <span>Explore AI Features</span>
                  </a>
                </div>
              </div>

              {/* Hero Quick AI Input */}
              <div className="rounded-2xl border border-[#1E1B4B]/12 bg-[#F8FAFC] p-4 sm:p-5">
                <form onSubmit={handleQuickSubmit} className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label htmlFor="hero-quick-input" className="text-xs font-semibold text-[#1E1B4B]/80">
                      Quick AI Concept Explorer
                    </label>
                    <select
                      value={quickSubject}
                      onChange={(e) => onQuickSubjectChange(e.target.value)}
                      aria-label="Select subject"
                      className="rounded-lg border border-[#1E1B4B]/15 bg-white px-3 py-1.5 text-xs font-medium text-[#1E1B4B] focus:outline-none focus:border-[#4338CA]"
                    >
                      {SUBJECTS.map((subj) => (
                        <option key={subj} value={subj}>
                          {subj}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <textarea
                      id="hero-quick-input"
                      rows={2}
                      value={quickQuestion}
                      onChange={(e) => onQuickQuestionChange(e.target.value)}
                      placeholder="Ask anything... Explain photosynthesis in simple Bengali."
                      className="flex-1 resize-none rounded-xl border border-[#1E1B4B]/15 bg-white px-3.5 py-2.5 text-sm text-[#1E1B4B] placeholder:text-[#1E1B4B]/45 focus:outline-none focus:border-[#4338CA]"
                    />
                    <button
                      type="submit"
                      disabled={quickLoading}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#4338CA] text-white text-sm font-semibold transition-colors shrink-0 disabled:opacity-60"
                    >
                      {quickLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Thinking...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Ask AI</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {quickError && (
                  <div className="mt-3 rounded-xl bg-white border border-[#1E1B4B]/15 px-4 py-2.5 text-xs text-[#1E1B4B]">
                    {quickError}
                  </div>
                )}

                {quickAnswer && (
                  <div className="mt-4 rounded-xl bg-white border border-[#4338CA]/20 p-4">
                    <div className="flex items-center justify-between text-xs text-[#7C3AED] font-semibold mb-2">
                      <span>EduGenius AI Answer · {quickSubject}</span>
                      <button
                        type="button"
                        onClick={() => onNavigate('study-hub')}
                        className="text-[#4338CA] hover:underline"
                      >
                        Open full Study Hub
                      </button>
                    </div>
                    <MarkdownRenderer content={quickAnswer} compact />
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Interactive AI Learning Dashboard Preview */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="relative flex-1 rounded-2xl border border-[#1E1B4B]/12 bg-[#1E1B4B] text-white p-5 sm:p-6 flex flex-col justify-between shadow-xl">
                {/* Preview Header & Segmented Switcher */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium text-white/65">Interactive Workspace Preview</p>
                      <h2 className="text-base font-bold text-white">Student Learning Console</h2>
                    </div>
                    <div className="flex items-center gap-1 p-1 rounded-lg bg-white/10">
                      <button
                        type="button"
                        onClick={() => setPreviewTab('chat')}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                          previewTab === 'chat' ? 'bg-white text-[#1E1B4B]' : 'text-white/75 hover:text-white'
                        }`}
                      >
                        Tutor
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewTab('progress')}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                          previewTab === 'progress' ? 'bg-white text-[#1E1B4B]' : 'text-white/75 hover:text-white'
                        }`}
                      >
                        Progress
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewTab('subjects')}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                          previewTab === 'subjects' ? 'bg-white text-[#1E1B4B]' : 'text-white/75 hover:text-white'
                        }`}
                      >
                        Subjects
                      </button>
                    </div>
                  </div>

                  {previewTab === 'chat' && (
                    <div className="space-y-3 pt-1">
                      <div className="rounded-xl bg-white/10 p-3.5 text-xs sm:text-sm text-white/95">
                        <p className="text-[11px] font-semibold text-white/60 mb-1">Student · HSC Biology</p>
                        <p>সালোকসংশ্লেষণ প্রক্রিয়াটি সহজ বাংলায় উদাহরণসহ বুঝিয়ে দাও।</p>
                      </div>
                      <div className="rounded-xl bg-[#4338CA]/45 border border-[#7C3AED]/40 p-3.5 text-xs sm:text-sm text-white/95 space-y-1.5">
                        <p className="text-[11px] font-semibold text-[#10B981]">EduGenius AI Live Tutor</p>
                        <p className="leading-relaxed">
                          সালোকসংশ্লেষণ হলো গাছের খাবার তৈরির প্রক্রিয়া। সূর্যের আলো ও ক্লোরোফিলের সাহায্যে পাতা বাতাসের CO₂ এবং মাটির পানি ব্যবহার করে গ্লুকোজ ও অক্সিজেন তৈরি করে।
                        </p>
                      </div>
                    </div>
                  )}

                  {previewTab === 'progress' && (
                    <div className="space-y-4 pt-1">
                      <div className="rounded-xl bg-white/8 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-medium text-white/75">Weekly Mastery Trend</span>
                          <span className="text-xs font-semibold text-[#10B981] tabular-nums">+18% this week</span>
                        </div>
                        <svg viewBox="0 0 280 84" className="w-full h-20" aria-label="Learning progress curve">
                          <defs>
                            <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <path
                            d="M0 68 L46 56 L92 60 L138 40 L184 34 L230 22 L280 12 L280 84 L0 84 Z"
                            fill="url(#chart-fill)"
                          />
                          <path
                            d="M0 68 L46 56 L92 60 L138 40 L184 34 L230 22 L280 12"
                            fill="none"
                            stroke="#10B981"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-white/8 p-3.5">
                          <p className="text-[11px] text-white/65">Latest Quiz Score</p>
                          <p className="text-xl font-bold text-[#10B981] tabular-nums mt-0.5">9 / 10</p>
                          <p className="text-[11px] text-white/70 mt-0.5">HSC Physics · 90%</p>
                        </div>
                        <div className="rounded-xl bg-white/8 p-3.5">
                          <p className="text-[11px] text-white/65">Saved Notes</p>
                          <p className="text-xl font-bold text-white tabular-nums mt-0.5">24</p>
                          <p className="text-[11px] text-white/70 mt-0.5">English & Bengali</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {previewTab === 'subjects' && (
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      {[
                        { name: 'Physics', level: 'HSC Science' },
                        { name: 'ICT & C Coding', level: 'Higher Secondary' },
                        { name: 'Mathematics', level: 'SSC & Admission' },
                        { name: 'English Grammar', level: 'University Prep' },
                      ].map((item) => (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => onNavigate('study-hub')}
                          className="text-left rounded-xl bg-white/10 hover:bg-white/15 p-3 transition-colors"
                        >
                          <p className="text-xs font-semibold text-white">{item.name}</p>
                          <p className="text-[11px] text-white/65 mt-0.5">{item.level}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Preview Metrics & Floating Assistant Card */}
                <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#7C3AED] flex items-center justify-center shrink-0">
                      <BrainCircuit className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">24/7 AI Study Assistant</p>
                      <p className="text-[11px] text-white/65">Bengali & English · Step-by-step</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('live-tutor')}
                    className="px-3.5 py-2 rounded-lg bg-[#10B981] hover:bg-[#10B981]/90 text-[#1E1B4B] text-xs font-bold transition-colors whitespace-nowrap shrink-0"
                  >
                    Open Tutor
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Statistics Strip (Editable Sample Promotional Figures) */}
      <section className="border-b border-[#1E1B4B]/10 bg-[#F8FAFC] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-6">
              <p className="text-3xl sm:text-4xl font-extrabold text-[#4338CA]">
                <AnimatedStatValue target={siteSettings.promoStats.questionsSolved} />
              </p>
              <p className="text-sm font-semibold text-[#1E1B4B] mt-1">Questions Solved</p>
              <p className="text-xs text-[#1E1B4B]/60 mt-1">Step-by-step bilingual academic answers</p>
            </div>
            <div className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-6">
              <p className="text-3xl sm:text-4xl font-extrabold text-[#7C3AED]">
                <AnimatedStatValue target={siteSettings.promoStats.quizzesCreated} />
              </p>
              <p className="text-sm font-semibold text-[#1E1B4B] mt-1">Quizzes Created</p>
              <p className="text-xs text-[#1E1B4B]/60 mt-1">Topic-aligned MCQ practice & analysis</p>
            </div>
            <div className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-6">
              <p className="text-3xl sm:text-4xl font-extrabold text-[#10B981]">
                <AnimatedStatValue target={siteSettings.promoStats.studentSatisfaction} />
              </p>
              <p className="text-sm font-semibold text-[#1E1B4B] mt-1">Student Satisfaction</p>
              <p className="text-xs text-[#1E1B4B]/60 mt-1">Clarity across school, college & job prep</p>
            </div>
          </div>
          <p className="text-xs text-[#1E1B4B]/55 mt-3 text-center">
            {siteSettings.promoStats.isSampleNotice}
          </p>
        </div>
      </section>

      {/* Feature Highlights */}
      <section id="features" className="py-16 lg:py-20 bg-white border-b border-[#1E1B4B]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold text-[#7C3AED]">Core Learning Suite</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1E1B4B] mt-1">
              Everything you need to understand faster and score higher
            </h2>
          </div>

          {/* 3 Primary Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-[#1E1B4B]/10 bg-[#F8FAFC] p-7 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-xl bg-[#4338CA]/10 text-[#4338CA] flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-[#1E1B4B]">Instant Concept Explanation</h3>
                <p className="text-sm text-[#1E1B4B]/75 leading-relaxed">
                  Understand difficult textbook concepts with simple explanations, practical examples, and step-by-step guidance.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('study-hub')}
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#4338CA] hover:text-[#1E1B4B]"
              >
                <span>Open AI Study Hub</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl border border-[#1E1B4B]/10 bg-[#F8FAFC] p-7 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-xl bg-[#7C3AED]/10 text-[#7C3AED] flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-[#1E1B4B]">AI Quiz & Mock Test Generation</h3>
                <p className="text-sm text-[#1E1B4B]/75 leading-relaxed">
                  Generate topic-based MCQs, practice tests, and instant performance analysis.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('smart-quiz')}
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#4338CA] hover:text-[#1E1B4B]"
              >
                <span>Start Smart Quiz</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl border border-[#1E1B4B]/10 bg-[#F8FAFC] p-7 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-xl bg-[#10B981]/12 text-[#10B981] flex items-center justify-center">
                  <MessageSquareText className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-[#1E1B4B]">24/7 Personalized AI Tutor</h3>
                <p className="text-sm text-[#1E1B4B]/75 leading-relaxed">
                  Ask questions anytime and receive personalized educational support.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('live-tutor')}
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#4338CA] hover:text-[#1E1B4B]"
              >
                <span>Launch Live Tutor</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 6 Additional Platform Capabilities */}
          <div className="pt-4">
            <h3 className="text-sm font-semibold text-[#1E1B4B]/70 mb-4">Additional Platform Capabilities</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  icon: Layers,
                  title: 'AI Flashcard Generator',
                  desc: 'Turn any chapter into concise Q&A revision cards inside AI Study Hub.',
                  page: 'study-hub' as AppPage,
                },
                {
                  icon: CalendarCheck2,
                  title: 'Smart Study Planner',
                  desc: 'Organize exam tasks, priorities, and weekly schedules in your dashboard.',
                  page: 'dashboard' as AppPage,
                },
                {
                  icon: FileText,
                  title: 'AI Question Paper Generator',
                  desc: 'Educators draft structured exam questions and answer keys in seconds.',
                  page: 'educator' as AppPage,
                },
                {
                  icon: Compass,
                  title: 'AI Syllabus Generator',
                  desc: 'Generate week-by-week subject syllabuses for SSC, HSC, and University courses.',
                  page: 'educator' as AppPage,
                },
                {
                  icon: LineChart,
                  title: 'Learning Analytics',
                  desc: 'Track quiz accuracy trends, study hours, and mastery by subject.',
                  page: 'dashboard' as AppPage,
                },
                {
                  icon: Sparkles,
                  title: 'Personalized Recommendations',
                  desc: 'Automatically surface weak subtopics from quiz attempts for targeted review.',
                  page: 'smart-quiz' as AppPage,
                },
              ].map((feat) => {
                const Icon = feat.icon;
                return (
                  <button
                    key={feat.title}
                    type="button"
                    onClick={() => onNavigate(feat.page)}
                    className="text-left rounded-xl border border-[#1E1B4B]/10 bg-white hover:border-[#4338CA]/40 p-4 transition-colors flex items-start gap-3.5"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#4338CA]/8 text-[#4338CA] flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[#1E1B4B]">{feat.title}</h4>
                      <p className="text-xs text-[#1E1B4B]/65 mt-1 leading-relaxed">{feat.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Courses & Verified Leaderboard */}
      <section className="py-16 bg-[#F8FAFC] border-b border-[#1E1B4B]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold text-[#4338CA]">Curated Curriculum</p>
                <h2 className="text-2xl font-bold text-[#1E1B4B] mt-1">Featured Courses</h2>
              </div>
              <button
                type="button"
                onClick={() => (user ? onNavigate('dashboard') : onOpenAuth('register'))}
                className="text-sm font-semibold text-[#4338CA] hover:underline"
              >
                Enroll in Dashboard
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {courses.slice(0, 4).map((course) => (
                <div
                  key={course.id}
                  className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-5 flex flex-col justify-between"
                >
                  <div>
                    <p className="text-xs text-[#1E1B4B]/60">
                      {course.subject} · {course.educationLevel}
                    </p>
                    <h3 className="text-base font-bold text-[#1E1B4B] mt-1.5">{course.title}</h3>
                    <p className="text-xs text-[#1E1B4B]/70 mt-2 leading-relaxed">{course.description}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#1E1B4B]/8 flex items-center justify-between text-xs">
                    <span className="text-[#1E1B4B]/60">{course.educatorName}</span>
                    <span className="font-semibold text-[#4338CA] tabular-nums">
                      {course.materials.length} modules
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold text-[#10B981]">Verified Quiz Results</p>
                <h2 className="text-2xl font-bold text-[#1E1B4B] mt-1">Student Leaderboard</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('smart-quiz')}
                className="text-sm font-semibold text-[#4338CA] hover:underline"
              >
                Take a Quiz
              </button>
            </div>
            <div className="rounded-2xl bg-white border border-[#1E1B4B]/10 overflow-hidden">
              {leaderboard.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <Award className="w-8 h-8 text-[#4338CA] mx-auto" />
                  <p className="text-sm font-semibold text-[#1E1B4B]">Be the first on the verified leaderboard</p>
                  <p className="text-xs text-[#1E1B4B]/65">
                    Complete any Smart Quiz with public display enabled in Settings to rank here.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#F8FAFC] border-b border-[#1E1B4B]/10 text-xs text-[#1E1B4B]/65">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Learner</th>
                      <th className="py-3 px-3 font-semibold text-right">Quizzes</th>
                      <th className="py-3 px-4 font-semibold text-right">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E1B4B]/8">
                    {leaderboard.slice(0, 5).map((entry, idx) => (
                      <tr key={entry.id}>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-[#1E1B4B]">
                            #{idx + 1} {entry.displayName}
                          </p>
                          <p className="text-xs text-[#1E1B4B]/55">{entry.educationLevel}</p>
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums text-[#1E1B4B]/75">
                          {entry.quizzesCompleted}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-[#10B981] tabular-nums">
                          {entry.averageAccuracy}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="py-16 bg-white border-b border-[#1E1B4B]/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold text-[#7C3AED]">Learner & Educator Stories</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#1E1B4B] mt-1">
                Built for Bangladesh classrooms and exam preparation
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((t) => (
                <div key={t.id} className="rounded-2xl border border-[#1E1B4B]/10 bg-[#F8FAFC] p-6 flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#10B981]">{t.outcome}</p>
                    <p className="text-sm text-[#1E1B4B]/80 leading-relaxed mt-3">“{t.quote}”</p>
                  </div>
                  <div className="mt-5 pt-4 border-t border-[#1E1B4B]/10">
                    <p className="text-sm font-bold text-[#1E1B4B]">{t.name}</p>
                    <p className="text-xs text-[#1E1B4B]/60">
                      {t.role} · {t.institution}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing Section */}
      <section id="pricing" className="py-16 lg:py-20 bg-[#F8FAFC] border-b border-[#1E1B4B]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold text-[#4338CA]">Transparent Access</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1E1B4B] mt-1">
              Plans for every student, educator, and academy
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-7 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-[#1E1B4B]/60">For Individual Learners</p>
                <h3 className="text-xl font-bold text-[#1E1B4B] mt-1">Free Starter</h3>
                <p className="text-3xl font-extrabold text-[#1E1B4B] tabular-nums mt-3">
                  ৳0 <span className="text-sm font-medium text-[#1E1B4B]/60">/ month</span>
                </p>
                <ul className="mt-6 space-y-2.5 text-sm text-[#1E1B4B]/80">
                  <li>15 AI Study Hub explanations daily</li>
                  <li>5-question & 10-question Smart Quizzes</li>
                  <li>Bilingual Bengali & English Live Tutor</li>
                  <li>Personal Study Planner & Note Library</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => (user ? onNavigate('study-hub') : onOpenAuth('register'))}
                className="mt-8 w-full py-2.5 rounded-xl border border-[#4338CA] text-[#4338CA] hover:bg-[#4338CA] hover:text-white text-sm font-semibold transition-colors"
              >
                Start Free
              </button>
            </div>

            <div className="rounded-2xl bg-[#1E1B4B] text-white p-7 flex flex-col justify-between shadow-lg">
              <div>
                <p className="text-xs font-semibold text-[#10B981]">For SSC, HSC & Admission Prep</p>
                <h3 className="text-xl font-bold mt-1">Pro Scholar</h3>
                <p className="text-3xl font-extrabold tabular-nums mt-3">
                  ৳299 <span className="text-sm font-medium text-white/65">/ month</span>
                </p>
                <ul className="mt-6 space-y-2.5 text-sm text-white/85">
                  <li>100 AI requests per day across all subjects</li>
                  <li>Unlimited saved notes & PDF note exports</li>
                  <li>Weak-topic diagnostics & progress analytics</li>
                  <li>Priority Gemini 4 model access</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => (user ? onNavigate('dashboard') : onOpenAuth('register'))}
                className="mt-8 w-full py-2.5 rounded-xl bg-[#4338CA] hover:bg-[#7C3AED] text-white text-sm font-semibold transition-colors"
              >
                Get Started
              </button>
            </div>

            <div className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-7 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-[#1E1B4B]/60">For Mentors & Institutions</p>
                <h3 className="text-xl font-bold text-[#1E1B4B] mt-1">Educator & Academy</h3>
                <p className="text-3xl font-extrabold text-[#1E1B4B] tabular-nums mt-3">
                  ৳999 <span className="text-sm font-medium text-[#1E1B4B]/60">/ month</span>
                </p>
                <ul className="mt-6 space-y-2.5 text-sm text-[#1E1B4B]/80">
                  <li>AI Lesson Plan & Question Paper Studio</li>
                  <li>Subject Syllabus & MCQ Bank Builder</li>
                  <li>Student cohort quiz performance tracking</li>
                  <li>Verified Educator badge & course publishing</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => (user ? onNavigate('educator') : onOpenAuth('register'))}
                className="mt-8 w-full py-2.5 rounded-xl border border-[#1E1B4B]/20 text-[#1E1B4B] hover:border-[#4338CA] hover:text-[#4338CA] text-sm font-semibold transition-colors"
              >
                Join as Educator
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* About & Footer */}
      <footer id="about" className="bg-[#1E1B4B] text-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-12 gap-10 pb-10 border-b border-white/15">
            <div className="md:col-span-5 space-y-4">
              <Logo size="lg" darkSurface showTagline />
              <p className="text-sm text-white/75 leading-relaxed max-w-md">
                EduGenius AI is a next-generation bilingual AI learning platform built to empower students and educators across Bangladesh—from primary classrooms to SSC, HSC, University Admission, and Career Preparation.
              </p>
              <div className="flex items-start gap-2 text-xs text-white/70">
                <MapPin className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                <span>{siteSettings.address}</span>
              </div>
            </div>

            <div className="md:col-span-3 space-y-3">
              <h4 className="text-sm font-bold text-white">Learning Tools</h4>
              <ul className="space-y-2 text-sm text-white/70">
                <li>
                  <button type="button" onClick={() => onNavigate('study-hub')} className="hover:text-white">
                    AI Study Hub
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('smart-quiz')} className="hover:text-white">
                    Smart Quiz & Leaderboard
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('live-tutor')} className="hover:text-white">
                    24/7 AI Live Tutor
                  </button>
                </li>
              </ul>
            </div>

            <div className="md:col-span-4 space-y-3">
              <h4 className="text-sm font-bold text-white">Portals</h4>
              <ul className="space-y-2 text-sm text-white/70">
                <li>
                  <button
                    type="button"
                    onClick={() => (user ? onNavigate('dashboard') : onOpenAuth('login'))}
                    className="hover:text-white"
                  >
                    Student Dashboard
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => (user ? onNavigate('educator') : onOpenAuth('register'))}
                    className="hover:text-white"
                  >
                    Educator & Mentor Studio
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => (user ? onNavigate('admin') : onOpenAuth('login'))}
                    className="hover:text-white"
                  >
                    Administrator Console
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-white/60">
            <span>© {new Date().getFullYear()} EduGenius AI. All rights reserved.</span>
            <span>English & বাংলা Bilingual Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
