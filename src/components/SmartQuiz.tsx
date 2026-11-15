import { useEffect, useState, type FormEvent } from 'react';
import {
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  RotateCcw,
  Trophy,
  XCircle,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import {
  EDUCATION_LEVELS,
  SUBJECTS,
  type EducationLevel,
  type LeaderboardEntry,
  type QuizAttempt,
  type QuizQuestion,
  type User,
} from '../types';

interface SmartQuizProps {
  user: User | null;
  onRequireAuth: () => void;
}

export function SmartQuiz({ user, onRequireAuth }: SmartQuizProps) {
  const [activeTab, setActiveTab] = useState<'quiz' | 'leaderboard'>('quiz');

  // Config state
  const [subject, setSubject] = useState<string>('Science');
  const [topic, setTopic] = useState('');
  const [educationLevel, setEducationLevel] = useState<EducationLevel>(
    user?.educationLevel || 'Higher Secondary (HSC)'
  );
  const [questionCount, setQuestionCount] = useState<5 | 10>(5);
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [language, setLanguage] = useState<'English' | 'Bengali'>(
    user?.aiPreferences.defaultLanguage || 'English'
  );
  const [timerMinutes, setTimerMinutes] = useState<number>(0);

  // Active quiz runner
  const [phase, setPhase] = useState<'setup' | 'running' | 'results'>('setup');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Results & History
  const [latestAttempt, setLatestAttempt] = useState<QuizAttempt | null>(null);
  const [pastAttempts, setPastAttempts] = useState<QuizAttempt[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const loadLeaderboard = () => {
    apiRequest<{ entries: LeaderboardEntry[] }>('/api/leaderboard')
      .then((res) => setLeaderboard(res.entries))
      .catch(() => {});
  };

  useEffect(() => {
    loadLeaderboard();
    if (user) {
      apiRequest<{ attempts: QuizAttempt[] }>('/api/quizzes/attempts')
        .then((res) => setPastAttempts(res.attempts))
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (phase !== 'running') return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
      if (timerMinutes > 0) {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            void handleSubmitQuiz();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timerMinutes]);

  const handleGenerateQuiz = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    if (!topic.trim()) {
      setError('Please enter a chapter or topic for your quiz.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await apiRequest<{ questions: QuizQuestion[] }>('/api/quizzes/generate', {
        method: 'POST',
        body: JSON.stringify({
          subject,
          topic: topic.trim(),
          educationLevel,
          questionCount,
          difficulty,
          language,
        }),
      });
      setQuestions(res.questions);
      setSelectedAnswers(new Array(res.questions.length).fill(-1));
      setCurrentIdx(0);
      setElapsedSeconds(0);
      setSecondsLeft(timerMinutes * 60);
      setPhase('running');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate quiz.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (phase !== 'running') return;
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest<{ attempt: QuizAttempt }>('/api/quizzes/submit', {
        method: 'POST',
        body: JSON.stringify({
          subject,
          topic: topic.trim(),
          educationLevel,
          difficulty,
          questions,
          selectedAnswers,
          durationSeconds: elapsedSeconds,
        }),
      });
      setLatestAttempt(res.attempt);
      setPastAttempts((prev) => [res.attempt, ...prev]);
      setPhase('results');
      loadLeaderboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit quiz.');
    } finally {
      setLoading(false);
    }
  };

  const handleReattempt = () => {
    setSelectedAnswers(new Array(questions.length).fill(-1));
    setCurrentIdx(0);
    setElapsedSeconds(0);
    setSecondsLeft(timerMinutes * 60);
    setPhase('running');
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentIdx];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#1E1B4B]/10 pb-5">
        <div>
          <p className="text-xs font-semibold text-[#7C3AED]">Smart AI Quiz & Practice Engine</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1E1B4B] mt-1">
            Practice MCQs with Instant Weakness Diagnostics
          </h1>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-[#1E1B4B]/10">
          <button
            type="button"
            onClick={() => setActiveTab('quiz')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'quiz' ? 'bg-[#4338CA] text-white' : 'text-[#1E1B4B]/70 hover:text-[#1E1B4B]'
            }`}
          >
            Quiz Practice
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('leaderboard');
              loadLeaderboard();
            }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'leaderboard'
                ? 'bg-[#4338CA] text-white'
                : 'text-[#1E1B4B]/70 hover:text-[#1E1B4B]'
            }`}
          >
            Leaderboard
          </button>
        </div>
      </div>

      {activeTab === 'quiz' && (
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Main Quiz Stage */}
          <div className="lg:col-span-8">
            {phase === 'setup' && (
              <form
                onSubmit={handleGenerateQuiz}
                className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-6 sm:p-8 space-y-5"
              >
                <h2 className="text-lg font-bold text-[#1E1B4B]">Configure Your AI Quiz</h2>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1.5">Subject</label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-[#1E1B4B]"
                    >
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1.5">Education Level</label>
                    <select
                      value={educationLevel}
                      onChange={(e) => setEducationLevel(e.target.value as EducationLevel)}
                      className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-[#1E1B4B]"
                    >
                      {EDUCATION_LEVELS.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1.5">
                    Chapter or Specific Topic
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Newtonian Mechanics, Photosynthesis, Passive Voice, or Binary Arithmetic"
                    className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-[#1E1B4B]"
                  />
                </div>

                <div className="grid sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1.5">Questions</label>
                    <select
                      value={questionCount}
                      onChange={(e) => setQuestionCount(Number(e.target.value) === 10 ? 10 : 5)}
                      className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-sm text-[#1E1B4B]"
                    >
                      <option value={5}>5 MCQs</option>
                      <option value={10}>10 MCQs</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1.5">Difficulty</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as 'Easy' | 'Medium' | 'Hard')}
                      className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-sm text-[#1E1B4B]"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1.5">Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as 'English' | 'Bengali')}
                      className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-sm text-[#1E1B4B]"
                    >
                      <option value="English">English</option>
                      <option value="Bengali">Bengali</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1.5">Timer</label>
                    <select
                      value={timerMinutes}
                      onChange={(e) => setTimerMinutes(Number(e.target.value))}
                      className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-sm text-[#1E1B4B]"
                    >
                      <option value={0}>No Timer</option>
                      <option value={5}>5 Minutes</option>
                      <option value={10}>10 Minutes</option>
                    </select>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl bg-[#1E1B4B]/5 border border-[#1E1B4B]/15 px-4 py-3 text-xs text-[#1E1B4B]">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#4338CA] hover:bg-[#1E1B4B] text-white text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating Quiz...</span>
                    </>
                  ) : (
                    <span>Generate Quiz</span>
                  )}
                </button>
              </form>
            )}

            {phase === 'running' && currentQuestion && (
              <div className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-6 sm:p-8 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1E1B4B]/10">
                  <div>
                    <p className="text-xs text-[#7C3AED] font-semibold">
                      {subject} · {topic} · {difficulty}
                    </p>
                    <p className="text-sm font-bold text-[#1E1B4B] tabular-nums mt-0.5">
                      Question {currentIdx + 1} of {questions.length}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-semibold tabular-nums">
                    {timerMinutes > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-[#7C3AED]">
                        <Clock className="w-4 h-4" />
                        <span>{formatTimer(secondsLeft)}</span>
                      </span>
                    )}
                    <span className="text-[#1E1B4B]/60">
                      Answered {selectedAnswers.filter((a) => a >= 0).length}/{questions.length}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full bg-[#F8FAFC] overflow-hidden">
                  <div
                    className="h-full bg-[#4338CA] transition-all"
                    style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
                  />
                </div>

                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-[#1E1B4B] leading-snug">
                    {currentQuestion.question}
                  </h2>

                  <div className="space-y-2.5">
                    {currentQuestion.options.map((opt, idx) => {
                      const selected = selectedAnswers[currentIdx] === idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            const next = [...selectedAnswers];
                            next[currentIdx] = idx;
                            setSelectedAnswers(next);
                          }}
                          className={`w-full text-left rounded-xl border p-4 text-sm transition-colors flex items-center gap-3 ${
                            selected
                              ? 'border-[#4338CA] bg-[#4338CA]/8 font-semibold text-[#1E1B4B]'
                              : 'border-[#1E1B4B]/12 bg-[#F8FAFC] hover:border-[#4338CA]/40 text-[#1E1B4B]/85'
                          }`}
                        >
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                              selected ? 'bg-[#4338CA] text-white' : 'bg-white border border-[#1E1B4B]/15 text-[#1E1B4B]'
                            }`}
                          >
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#1E1B4B]/10 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={currentIdx === 0}
                    onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#1E1B4B]/15 text-xs font-semibold text-[#1E1B4B] disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  {currentIdx < questions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#4338CA] text-white text-xs font-semibold"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleSubmitQuiz}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#10B981]/90 text-white text-xs font-semibold"
                    >
                      <span>{loading ? 'Grading...' : 'Submit Quiz'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {phase === 'results' && latestAttempt && (
              <div className="space-y-6">
                <div className="rounded-2xl bg-[#1E1B4B] text-white p-6 sm:p-8 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-[#10B981]">Performance Summary</p>
                      <h2 className="text-2xl font-bold mt-1">
                        {latestAttempt.subject}: {latestAttempt.topic}
                      </h2>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-white/65">Total Score</p>
                        <p className="text-2xl font-extrabold tabular-nums">
                          {latestAttempt.score}/{latestAttempt.questionCount}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-white/65">Accuracy</p>
                        <p className="text-2xl font-extrabold text-[#10B981] tabular-nums">
                          {latestAttempt.accuracy}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {latestAttempt.weakTopics.length > 0 && (
                    <div className="rounded-xl bg-white/10 p-4 text-xs space-y-1">
                      <p className="font-semibold text-white">Weak Topics Identified</p>
                      <p className="text-white/80">{latestAttempt.weakTopics.join(' · ')}</p>
                    </div>
                  )}

                  <p className="text-sm text-white/85 leading-relaxed">{latestAttempt.suggestions}</p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleReattempt}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4338CA] hover:bg-[#7C3AED] text-white text-xs font-semibold"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Re-attempt Quiz</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhase('setup')}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold"
                    >
                      New Topic Quiz
                    </button>
                  </div>
                </div>

                {/* Question Breakdown */}
                <div className="space-y-4">
                  {latestAttempt.questions.map((q, idx) => {
                    const userChoice = latestAttempt.selectedAnswers[idx];
                    const isCorrect = userChoice === q.correctIndex;
                    return (
                      <div key={idx} className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-5 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-sm font-bold text-[#1E1B4B]">
                            Q{idx + 1}. {q.question}
                          </h3>
                          {isCorrect ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#10B981] shrink-0">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Correct</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#1E1B4B]/65 shrink-0">
                              <XCircle className="w-4 h-4" />
                              <span>Incorrect</span>
                            </span>
                          )}
                        </div>
                        <div className="grid sm:grid-cols-2 gap-2 text-xs">
                          {q.options.map((opt, optIdx) => {
                            const isRight = optIdx === q.correctIndex;
                            const isPicked = optIdx === userChoice;
                            return (
                              <div
                                key={optIdx}
                                className={`rounded-lg px-3 py-2 border ${
                                  isRight
                                    ? 'border-[#10B981] bg-[#10B981]/10 text-[#1E1B4B] font-semibold'
                                    : isPicked
                                    ? 'border-[#1E1B4B]/40 bg-[#1E1B4B]/5 text-[#1E1B4B]'
                                    : 'border-[#1E1B4B]/10 bg-[#F8FAFC] text-[#1E1B4B]/70'
                                }`}
                              >
                                {String.fromCharCode(65 + optIdx)}. {opt}
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-xs text-[#1E1B4B]/75 leading-relaxed bg-[#F8FAFC] rounded-lg p-3">
                          <span className="font-semibold text-[#4338CA]">Explanation: </span>
                          {q.explanation}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar: Recent Attempts */}
          <div className="lg:col-span-4 rounded-2xl bg-white border border-[#1E1B4B]/10 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1E1B4B]">Your Recent Attempts</h3>
              <span className="text-xs text-[#1E1B4B]/55 tabular-nums">{pastAttempts.length}</span>
            </div>
            {!user ? (
              <p className="text-xs text-[#1E1B4B]/65">
                Sign in to save your quiz history, track weak subtopics, and join the verified leaderboard.
              </p>
            ) : pastAttempts.length === 0 ? (
              <p className="text-xs text-[#1E1B4B]/65">
                No completed quizzes yet. Generate your first practice quiz on the left.
              </p>
            ) : (
              <div className="divide-y divide-[#1E1B4B]/8">
                {pastAttempts.slice(0, 8).map((att) => (
                  <button
                    key={att.id}
                    type="button"
                    onClick={() => {
                      setLatestAttempt(att);
                      setPhase('results');
                    }}
                    className="w-full text-left py-3 flex items-center justify-between gap-3 hover:text-[#4338CA]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#1E1B4B] truncate">{att.topic}</p>
                      <p className="text-xs text-[#1E1B4B]/55">
                        {att.subject} · {att.difficulty}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-[#10B981] tabular-nums shrink-0">
                      {att.accuracy}%
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div className="rounded-2xl bg-white border border-[#1E1B4B]/10 overflow-hidden">
          <div className="p-6 border-b border-[#1E1B4B]/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#4338CA]/10 text-[#4338CA] flex items-center justify-center">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#1E1B4B]">Verified Student Leaderboard</h2>
                <p className="text-xs text-[#1E1B4B]/65">
                  Ranked by verified quiz accuracy and total correct answers. Manage display name & privacy in Student Settings.
                </p>
              </div>
            </div>
          </div>

          {leaderboard.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Award className="w-10 h-10 text-[#4338CA] mx-auto" />
              <p className="text-sm font-semibold text-[#1E1B4B]">No public leaderboard entries yet</p>
              <p className="text-xs text-[#1E1B4B]/65">
                Complete a Smart Quiz and ensure leaderboard visibility is enabled in your profile settings.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F8FAFC] border-b border-[#1E1B4B]/10 text-xs text-[#1E1B4B]/65">
                  <tr>
                    <th className="py-3.5 px-6 font-semibold">Rank</th>
                    <th className="py-3.5 px-4 font-semibold">Display Name</th>
                    <th className="py-3.5 px-4 font-semibold">Level</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Quizzes</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Best Score</th>
                    <th className="py-3.5 px-6 font-semibold text-right">Avg Accuracy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E1B4B]/8">
                  {leaderboard.map((entry, idx) => (
                    <tr key={entry.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3.5 px-6 font-bold text-[#4338CA] tabular-nums">#{idx + 1}</td>
                      <td className="py-3.5 px-4 font-semibold text-[#1E1B4B]">{entry.displayName}</td>
                      <td className="py-3.5 px-4 text-xs text-[#1E1B4B]/65">{entry.educationLevel}</td>
                      <td className="py-3.5 px-4 text-right tabular-nums">{entry.quizzesCompleted}</td>
                      <td className="py-3.5 px-4 text-right tabular-nums">{entry.bestScore}%</td>
                      <td className="py-3.5 px-6 text-right font-bold text-[#10B981] tabular-nums">
                        {entry.averageAccuracy}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
