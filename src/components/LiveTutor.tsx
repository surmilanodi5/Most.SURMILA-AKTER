import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Loader2, MessageSquarePlus, Send, Trash2 } from 'lucide-react';
import { apiRequest } from '../lib/api';
import {
  EDUCATION_LEVELS,
  SUBJECTS,
  type EducationLevel,
  type TutorConversation,
  type User,
} from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface LiveTutorProps {
  user: User | null;
  onRequireAuth: () => void;
}

const QUICK_PROMPTS = [
  'Teach me a programming trick.',
  'Explain photosynthesis in simple Bengali.',
  'Give me English grammar tips.',
  'Help me solve a mathematics problem.',
  'Prepare me for university admission.',
  'Create a study plan for my exam.',
];

export function LiveTutor({ user, onRequireAuth }: LiveTutorProps) {
  const [conversations, setConversations] = useState<TutorConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [subject, setSubject] = useState<string>('General Knowledge');
  const [educationLevel, setEducationLevel] = useState<EducationLevel>(
    user?.educationLevel || 'Higher Secondary (HSC)'
  );
  const [language, setLanguage] = useState<'English' | 'Bengali'>(
    user?.aiPreferences.defaultLanguage || 'English'
  );
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setActiveId(null);
      return;
    }
    apiRequest<{ conversations: TutorConversation[] }>('/api/tutor/conversations')
      .then((res) => {
        setConversations(res.conversations);
        if (res.conversations.length > 0) {
          setActiveId(res.conversations[0].id);
        }
      })
      .catch(() => {});
  }, [user]);

  const activeConv = conversations.find((c) => c.id === activeId) || null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages.length, sending]);

  const handleNewChat = async () => {
    if (!user) {
      onRequireAuth();
      return;
    }
    setError('');
    try {
      const res = await apiRequest<{ conversation: TutorConversation }>('/api/tutor/conversations', {
        method: 'POST',
        body: JSON.stringify({ subject, educationLevel, language }),
      });
      setConversations((prev) => [res.conversation, ...prev]);
      setActiveId(res.conversation.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create conversation.');
    }
  };

  const sendMessageText = async (text: string) => {
    if (!user) {
      onRequireAuth();
      return;
    }
    const clean = text.trim();
    if (!clean || sending) return;
    setError('');
    setSending(true);
    setInput('');

    try {
      let targetId = activeId;
      if (!targetId) {
        const created = await apiRequest<{ conversation: TutorConversation }>('/api/tutor/conversations', {
          method: 'POST',
          body: JSON.stringify({ title: clean.slice(0, 56), subject, educationLevel, language }),
        });
        targetId = created.conversation.id;
        setConversations((prev) => [created.conversation, ...prev]);
        setActiveId(targetId);
      }

      const res = await apiRequest<{ conversation: TutorConversation }>(
        `/api/tutor/conversations/${targetId}/message`,
        {
          method: 'POST',
          body: JSON.stringify({ message: clean, subject, educationLevel, language }),
        }
      );
      setConversations((prev) =>
        prev.map((c) => (c.id === res.conversation.id ? res.conversation : c))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tutor could not respond.');
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessageText(input);
  };

  const handleDeleteConv = async (id: string) => {
    try {
      await apiRequest(`/api/tutor/conversations/${id}`, { method: 'DELETE' });
      const remaining = conversations.filter((c) => c.id !== id);
      setConversations(remaining);
      if (activeId === id) {
        setActiveId(remaining[0]?.id || null);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="rounded-2xl bg-white border border-[#1E1B4B]/10 overflow-hidden grid lg:grid-cols-12 min-h-[640px]">
        {/* Chat Sidebar */}
        <aside className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-[#1E1B4B]/10 bg-[#F8FAFC] p-4 flex flex-col justify-between">
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleNewChat}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#4338CA] hover:bg-[#1E1B4B] text-white text-xs font-semibold transition-colors"
            >
              <MessageSquarePlus className="w-4 h-4" />
              <span>New Chat</span>
            </button>

            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-[#1E1B4B]/55 px-2">Conversation History</p>
              {!user ? (
                <p className="text-xs text-[#1E1B4B]/60 px-2 py-2">
                  Sign in to save your tutoring sessions across devices.
                </p>
              ) : conversations.length === 0 ? (
                <p className="text-xs text-[#1E1B4B]/60 px-2 py-2">No saved chats yet.</p>
              ) : (
                <div className="space-y-1 max-h-[440px] overflow-y-auto">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`group flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs transition-colors ${
                        conv.id === activeId
                          ? 'bg-white border border-[#1E1B4B]/10 font-semibold text-[#1E1B4B]'
                          : 'text-[#1E1B4B]/70 hover:bg-white/70'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveId(conv.id)}
                        className="text-left flex-1 truncate"
                      >
                        {conv.title}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteConv(conv.id)}
                        className="opacity-60 hover:opacity-100 text-[#1E1B4B]/60 hover:text-[#1E1B4B]"
                        aria-label="Clear conversation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Chat Window */}
        <div className="lg:col-span-9 flex flex-col justify-between">
          {/* Top Context Bar */}
          <div className="px-5 py-3.5 border-b border-[#1E1B4B]/10 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-base font-bold text-[#1E1B4B]">24/7 AI Live Tutor</h1>
              <p className="text-xs text-[#1E1B4B]/60">Step-by-step guided tutoring in English & Bengali</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                aria-label="Tutor Subject"
                className="rounded-lg border border-[#1E1B4B]/15 bg-[#F8FAFC] px-2.5 py-1.5 text-xs font-medium text-[#1E1B4B]"
              >
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                value={educationLevel}
                onChange={(e) => setEducationLevel(e.target.value as EducationLevel)}
                aria-label="Tutor Education Level"
                className="rounded-lg border border-[#1E1B4B]/15 bg-[#F8FAFC] px-2.5 py-1.5 text-xs font-medium text-[#1E1B4B]"
              >
                {EDUCATION_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'English' | 'Bengali')}
                aria-label="Tutor Language"
                className="rounded-lg border border-[#1E1B4B]/15 bg-[#F8FAFC] px-2.5 py-1.5 text-xs font-medium text-[#1E1B4B]"
              >
                <option value="English">English</option>
                <option value="Bengali">Bengali</option>
              </select>
            </div>
          </div>

          {/* Messages Viewport */}
          <div className="flex-1 p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[480px]">
            {(!activeConv || activeConv.messages.length === 0) && (
              <div className="py-8 space-y-6">
                <div className="max-w-xl">
                  <h2 className="text-lg font-bold text-[#1E1B4B]">
                    What would you like to learn step by step today?
                  </h2>
                  <p className="text-sm text-[#1E1B4B]/65 mt-1">
                    Ask any follow-up question or pick a quick starter prompt below. Your tutor explains the reasoning rather than giving unexplained answers.
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {QUICK_PROMPTS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => void sendMessageText(chip)}
                      className="text-left rounded-xl border border-[#1E1B4B]/12 bg-[#F8FAFC] hover:border-[#4338CA] hover:bg-[#4338CA]/5 px-4 py-3 text-xs font-medium text-[#1E1B4B] transition-colors"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeConv?.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-[#4338CA] text-white text-sm'
                      : 'bg-[#F8FAFC] border border-[#1E1B4B]/10 text-[#1E1B4B]'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <MarkdownRenderer content={msg.content} compact />
                  )}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-2xl bg-[#F8FAFC] border border-[#1E1B4B]/10 px-4 py-3 text-xs font-medium text-[#7C3AED]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Tutor is preparing a step-by-step explanation...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input Bar */}
          <div className="p-4 border-t border-[#1E1B4B]/10 bg-white space-y-2">
            {error && (
              <p className="text-xs text-[#1E1B4B] bg-[#1E1B4B]/5 rounded-lg px-3 py-2">{error}</p>
            )}
            <form onSubmit={handleSubmit} className="flex items-center gap-2.5">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  user
                    ? 'Ask a question or request a simpler step-by-step example...'
                    : 'Sign in to chat with your 24/7 AI Live Tutor...'
                }
                className="flex-1 rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-4 py-2.5 text-sm text-[#1E1B4B] focus:outline-none focus:border-[#4338CA]"
              />
              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#4338CA] hover:bg-[#1E1B4B] text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
