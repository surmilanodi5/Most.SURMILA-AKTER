import { useEffect, useState, type FormEvent } from 'react';
import {
  BookmarkCheck,
  BookmarkPlus,
  Check,
  Copy,
  FileDown,
  Loader2,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import {
  EDUCATION_LEVELS,
  SUBJECTS,
  type EducationLevel,
  type StudyNote,
  type User,
} from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Logo } from './Logo';

interface StudyHubProps {
  user: User | null;
  onRequireAuth: () => void;
}

export function StudyHub({ user, onRequireAuth }: StudyHubProps) {
  const [subject, setSubject] = useState<string>('Science');
  const [educationLevel, setEducationLevel] = useState<EducationLevel>(
    user?.educationLevel || 'Higher Secondary (HSC)'
  );
  const [topic, setTopic] = useState('');
  const [depth, setDepth] = useState<'Summary' | 'Detailed Explanation' | 'Flashcard Format'>(
    'Detailed Explanation'
  );
  const [language, setLanguage] = useState<'English' | 'Bengali'>(
    user?.aiPreferences.defaultLanguage || 'English'
  );
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Advanced'>('Medium');
  const [includeExamples, setIncludeExamples] = useState(true);

  const [generatedContent, setGeneratedContent] = useState('');
  const [generatedModel, setGeneratedModel] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlag, setSavedFlag] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setNotes([]);
      return;
    }
    setNotesLoading(true);
    apiRequest<{ notes: StudyNote[] }>('/api/study-hub/notes')
      .then((res) => setNotes(res.notes))
      .catch(() => {})
      .finally(() => setNotesLoading(false));
  }, [user]);

  const generateExplanation = async () => {
    if (!user) {
      onRequireAuth();
      return;
    }
    if (!topic.trim()) {
      setError('Please enter a topic or question to explain.');
      return;
    }
    setError('');
    setSavedFlag(false);
    setLoading(true);
    try {
      const res = await apiRequest<{ content: string; model: string }>('/api/study-hub/generate', {
        method: 'POST',
        body: JSON.stringify({
          subject,
          educationLevel,
          topic,
          depth,
          language,
          difficulty,
          includeExamples,
        }),
      });
      setGeneratedContent(res.content);
      setGeneratedModel(res.model);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate explanation.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    generateExplanation();
  };

  const handleCopy = async () => {
    if (!generatedContent) return;
    try {
      await navigator.clipboard.writeText(generatedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  const handleSaveToLibrary = async () => {
    if (!user) {
      onRequireAuth();
      return;
    }
    if (!generatedContent) return;
    setSaving(true);
    setError('');
    try {
      const res = await apiRequest<{ note: StudyNote }>('/api/study-hub/notes', {
        method: 'POST',
        body: JSON.stringify({
          subject,
          educationLevel,
          topic,
          depth,
          language,
          difficulty,
          includeExamples,
          content: generatedContent,
        }),
      });
      setNotes((prev) => [res.note, ...prev]);
      setSavedFlag(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await apiRequest(`/api/study-hub/notes/${id}`, { method: 'DELETE' });
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // ignore
    }
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="no-print flex flex-wrap items-end justify-between gap-4 border-b border-[#1E1B4B]/10 pb-5">
        <div>
          <p className="text-xs font-semibold text-[#7C3AED]">AI Study Hub · Bilingual Concept Studio</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1E1B4B] mt-1">
            Structured Notes, Flashcards & Explanations
          </h1>
        </div>
        {!user && (
          <button
            type="button"
            onClick={onRequireAuth}
            className="px-4 py-2 rounded-xl bg-[#4338CA] text-white text-xs font-semibold"
          >
            Sign in to Save Notes
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left: Input Form */}
        <form
          onSubmit={handleSubmit}
          className="no-print lg:col-span-5 rounded-2xl bg-white border border-[#1E1B4B]/10 p-6 space-y-4"
        >
          <div className="grid sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1.5">Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-sm text-[#1E1B4B] focus:outline-none focus:border-[#4338CA]"
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
                className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-sm text-[#1E1B4B] focus:outline-none focus:border-[#4338CA]"
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
              Topic or Study Question
            </label>
            <textarea
              rows={4}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder='e.g. "Explain Quantum Computing in simple Bengali." or "Explain English Passive Voice with examples."'
              className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-[#1E1B4B] placeholder:text-[#1E1B4B]/45 focus:outline-none focus:border-[#4338CA]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1.5">Explanation Depth</label>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#F8FAFC] border border-[#1E1B4B]/10">
              {(['Summary', 'Detailed Explanation', 'Flashcard Format'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setDepth(opt)}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap truncate ${
                    depth === opt
                      ? 'bg-white text-[#4338CA] shadow-sm'
                      : 'text-[#1E1B4B]/65 hover:text-[#1E1B4B]'
                  }`}
                >
                  {opt === 'Detailed Explanation' ? 'Detailed' : opt === 'Flashcard Format' ? 'Flashcards' : opt}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1.5">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'English' | 'Bengali')}
                className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-[#1E1B4B]"
              >
                <option value="English">English</option>
                <option value="Bengali">Bengali (বাংলা)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1.5">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as 'Easy' | 'Medium' | 'Advanced')}
                className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-[#1E1B4B]"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1.5">Examples</label>
              <select
                value={includeExamples ? 'yes' : 'no'}
                onChange={(e) => setIncludeExamples(e.target.value === 'yes')}
                className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-[#1E1B4B]"
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-[#1E1B4B]/5 border border-[#1E1B4B]/15 px-3.5 py-2.5 text-xs text-[#1E1B4B]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#4338CA] hover:bg-[#1E1B4B] text-white text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Explanation...</span>
              </>
            ) : (
              <span>Generate Explanation</span>
            )}
          </button>

          <div className="pt-2 border-t border-[#1E1B4B]/10 space-y-1.5">
            <p className="text-[11px] font-semibold text-[#1E1B4B]/60">Sample Prompts</p>
            <div className="flex flex-col gap-1.5">
              {[
                {
                  subj: 'Physics',
                  lang: 'Bengali' as const,
                  text: 'Explain Quantum Computing in simple Bengali.',
                },
                {
                  subj: 'English',
                  lang: 'English' as const,
                  text: 'Explain English Passive Voice with examples.',
                },
              ].map((sample) => (
                <button
                  key={sample.text}
                  type="button"
                  onClick={() => {
                    setSubject(sample.subj);
                    setLanguage(sample.lang);
                    setTopic(sample.text);
                  }}
                  className="text-left text-xs text-[#4338CA] hover:underline"
                >
                  {sample.text}
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Right: AI Output Interface */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl bg-white border border-[#1E1B4B]/10 p-6 sm:p-8 min-h-[420px] flex flex-col justify-between">
            {generatedContent ? (
              <div>
                {/* Print Header */}
                <div className="hidden print:flex items-center justify-between pb-4 mb-4 border-b border-[#1E1B4B]/15">
                  <Logo size="sm" showTagline />
                  <span className="text-xs text-[#1E1B4B]/65">
                    {subject} · {educationLevel}
                  </span>
                </div>

                <div className="no-print flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-[#1E1B4B]/10">
                  <div>
                    <p className="text-xs text-[#7C3AED] font-semibold">
                      {subject} · {educationLevel} · {depth}
                    </p>
                    <h2 className="text-lg font-bold text-[#1E1B4B] mt-0.5">{topic}</h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1E1B4B]/15 text-xs font-semibold text-[#1E1B4B] hover:bg-[#F8FAFC]"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1E1B4B]/15 text-xs font-semibold text-[#1E1B4B] hover:bg-[#F8FAFC]"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveToLibrary}
                      disabled={saving || savedFlag}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#10B981]/90 text-white text-xs font-semibold disabled:opacity-70"
                    >
                      {savedFlag ? (
                        <>
                          <BookmarkCheck className="w-3.5 h-3.5" />
                          <span>Saved</span>
                        </>
                      ) : (
                        <>
                          <BookmarkPlus className="w-3.5 h-3.5" />
                          <span>{saving ? 'Saving...' : 'Save to Library'}</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={generateExplanation}
                      disabled={loading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#4338CA]/30 text-xs font-semibold text-[#4338CA] hover:bg-[#4338CA]/5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                      <span>Regenerate</span>
                    </button>
                  </div>
                </div>

                <MarkdownRenderer content={generatedContent} />

                {generatedModel && (
                  <p className="no-print mt-6 pt-3 border-t border-[#1E1B4B]/8 text-[11px] text-[#1E1B4B]/50">
                    Generated with {generatedModel} · {language} · {difficulty} difficulty
                  </p>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-14 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#4338CA]/10 text-[#4338CA] flex items-center justify-center">
                  <BookmarkPlus className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-[#1E1B4B]">Your AI Study Note Will Appear Here</h2>
                <p className="text-sm text-[#1E1B4B]/65 max-w-md leading-relaxed">
                  Choose a subject, education level, and depth on the left. EduGenius AI creates clean Markdown notes, practical examples, code snippets, or Q&A flashcards in Bengali or English.
                </p>
              </div>
            )}
          </div>

          {/* Saved Notes Library */}
          {user && (
            <div className="no-print rounded-2xl bg-white border border-[#1E1B4B]/10 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#1E1B4B]">My Saved Study Library</h3>
                <span className="text-xs text-[#1E1B4B]/60 tabular-nums">{notes.length} notes</span>
              </div>

              {notesLoading ? (
                <p className="text-xs text-[#1E1B4B]/60">Loading your saved notes...</p>
              ) : notes.length === 0 ? (
                <p className="text-xs text-[#1E1B4B]/60">
                  No saved notes yet. Generate an explanation above and click "Save to Library".
                </p>
              ) : (
                <div className="divide-y divide-[#1E1B4B]/8">
                  {notes.map((n) => (
                    <div key={n.id} className="py-3 flex items-center justify-between gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setSubject(n.subject);
                          setEducationLevel(n.educationLevel);
                          setTopic(n.topic);
                          setDepth(n.depth);
                          setLanguage(n.language);
                          setDifficulty(n.difficulty);
                          setGeneratedContent(n.content);
                          setSavedFlag(true);
                        }}
                        className="text-left flex-1 min-w-0 hover:text-[#4338CA]"
                      >
                        <p className="text-sm font-semibold text-[#1E1B4B] truncate">{n.topic}</p>
                        <p className="text-xs text-[#1E1B4B]/55">
                          {n.subject} · {n.depth} · {n.language} · {new Date(n.createdAt).toLocaleDateString()}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(n.id)}
                        className="p-2 rounded-lg text-[#1E1B4B]/45 hover:text-[#1E1B4B] hover:bg-[#1E1B4B]/5"
                        aria-label="Delete saved note"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
