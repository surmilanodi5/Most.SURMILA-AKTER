import crypto from 'node:crypto';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { getDb, mutateDb } from './store.ts';
import type { AiUsageLogRecord, EducationLevel, QuizQuestionItem } from './types.ts';

export const AVAILABLE_MODELS = [
  {
    id: 'gemini-4-hydrogen',
    label: 'Gemini 4 Flash (Hydrogen)',
    description: 'Fast, high-accuracy reasoning for Study Hub, Smart Quizzes, and Live Tutoring.',
    tier: 'Standard',
  },
  {
    id: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash Lite',
    description: 'Ultra-low latency model ideal for rapid flashcards and quick Q&A.',
    tier: 'Lightweight',
  },
] as const;

const ALLOWED_MODEL_IDS = new Set<string>(AVAILABLE_MODELS.map((m) => m.id));

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server environment secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function resolveModel(requestedModel?: string): Promise<string> {
  const db = await getDb();
  const enabled = db.siteSettings.aiConfig.enabledModels;
  if (requestedModel && ALLOWED_MODEL_IDS.has(requestedModel) && enabled.includes(requestedModel)) {
    return requestedModel;
  }
  const fallback = db.siteSettings.aiConfig.defaultModel;
  if (ALLOWED_MODEL_IDS.has(fallback) && enabled.includes(fallback)) {
    return fallback;
  }
  return enabled.find((m) => ALLOWED_MODEL_IDS.has(m)) || 'gemini-4-hydrogen';
}

function mapTemperatureToThinking(model: string, temp: number): ThinkingLevel | undefined {
  if (model !== 'gemini-4-hydrogen') return undefined;
  if (temp <= 0.3) return ThinkingLevel.LOW;
  if (temp <= 0.55) return ThinkingLevel.MEDIUM;
  return ThinkingLevel.HIGH;
}

async function checkDailyUsageLimit(userId: string | null): Promise<void> {
  if (!userId) return;
  const db = await getDb();
  const limit = db.siteSettings.aiConfig.dailyLimitPerUser;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const count = db.aiUsageLogs.filter(
    (log) => log.userId === userId && log.success && new Date(log.createdAt).getTime() >= startOfDay.getTime()
  ).length;
  if (count >= limit) {
    throw new Error(`Daily AI usage limit (${limit} requests) reached. Please contact an administrator or try again tomorrow.`);
  }
}

async function recordAiUsage(entry: Omit<AiUsageLogRecord, 'id' | 'createdAt'>): Promise<void> {
  await mutateDb((db) => {
    db.aiUsageLogs.unshift({
      id: `ai-${crypto.randomUUID()}`,
      ...entry,
      createdAt: new Date().toISOString(),
    });
    if (db.aiUsageLogs.length > 500) {
      db.aiUsageLogs = db.aiUsageLogs.slice(0, 500);
    }
  });
}

function formatGeminiError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('GEMINI_API_KEY')) return msg;
  if (msg.includes('403') || msg.includes('PERMISSION_DENIED') || msg.includes('API_KEY_INVALID')) {
    return 'AI service authentication error. Please verify GEMINI_API_KEY in Settings > Secrets.';
  }
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
    return 'AI rate limit reached. Please wait a few seconds and try again.';
  }
  return msg || 'AI request failed. Please try again.';
}

export async function runQuickAsk(params: {
  userId: string | null;
  question: string;
  subject: string;
}): Promise<{ answer: string; model: string }> {
  await checkDailyUsageLimit(params.userId);
  const model = await resolveModel();
  const start = Date.now();
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model,
      contents: `Subject: ${params.subject}\nQuestion: ${params.question}`,
      config: {
        systemInstruction:
          'You are EduGenius AI, an encouraging tutor for students in Bangladesh. Reply in the same language requested or used by the student (Bengali or English). Give a crisp, structured, easy-to-understand explanation using Markdown headings and bullet points, plus one relatable real-world example. Keep it concise (under 250 words).',
        ...(model === 'gemini-4-hydrogen' ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
      },
    });
    const answer = (response.text || '').trim();
    if (!answer) throw new Error('Empty response returned from AI model.');
    await recordAiUsage({
      userId: params.userId,
      feature: 'quick_ask',
      model,
      success: true,
      latencyMs: Date.now() - start,
    });
    return { answer, model };
  } catch (err) {
    const friendly = formatGeminiError(err);
    await recordAiUsage({
      userId: params.userId,
      feature: 'quick_ask',
      model,
      success: false,
      errorMessage: friendly,
      latencyMs: Date.now() - start,
    });
    throw new Error(friendly);
  }
}

export async function generateStudyNoteAI(params: {
  userId: string;
  subject: string;
  educationLevel: EducationLevel;
  topic: string;
  depth: 'Summary' | 'Detailed Explanation' | 'Flashcard Format';
  language: 'English' | 'Bengali';
  difficulty: 'Easy' | 'Medium' | 'Advanced';
  includeExamples: boolean;
  preferredModel?: string;
  temperature?: number;
}): Promise<{ content: string; model: string }> {
  await checkDailyUsageLimit(params.userId);
  const model = await resolveModel(params.preferredModel);
  const thinkingLevel = mapTemperatureToThinking(model, params.temperature ?? 0.4);
  const start = Date.now();

  const formatInstruction =
    params.depth === 'Flashcard Format'
      ? 'Format the response as 6–8 clear Q&A Flashcards using Markdown headings (`### Card 1: Question`) followed by concise memorable answers and memory hooks.'
      : params.depth === 'Summary'
      ? 'Provide a crisp, high-yield revision summary with clear headings, key definitions, formulas/rules, and quick takeaways.'
      : 'Provide a thorough, step-by-step textbook-quality explanation with clear Markdown headings, bullet points, intuitive analogies, and exam tips.';

  const prompt = `Create study notes for a student at "${params.educationLevel}" level.
Subject: ${params.subject}
Topic / Question: ${params.topic}
Response Language: ${params.language} (If Bengali, write natural, accurate academic Bengali with helpful English technical terms in parentheses where appropriate.)
Difficulty: ${params.difficulty}
Include Practical Examples: ${params.includeExamples ? 'Yes, include concrete worked examples' : 'No, focus purely on core concepts'}
Format Style: ${formatInstruction}
Include code blocks if the topic involves ICT, Programming, or algorithms.`;

  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction:
          'You are EduGenius AI Study Hub, a senior curriculum designer and tutor specializing in Bangladesh education standards (SSC, HSC, University Admission, Job Preparation) as well as global STEM and Humanities.',
        ...(thinkingLevel ? { thinkingConfig: { thinkingLevel } } : {}),
      },
    });
    const content = (response.text || '').trim();
    if (!content) throw new Error('AI returned an empty note.');
    await recordAiUsage({
      userId: params.userId,
      feature: 'study_hub',
      model,
      success: true,
      latencyMs: Date.now() - start,
    });
    return { content, model };
  } catch (err) {
    const friendly = formatGeminiError(err);
    await recordAiUsage({
      userId: params.userId,
      feature: 'study_hub',
      model,
      success: false,
      errorMessage: friendly,
      latencyMs: Date.now() - start,
    });
    throw new Error(friendly);
  }
}

export async function generateQuizAI(params: {
  userId: string;
  subject: string;
  topic: string;
  educationLevel: EducationLevel;
  questionCount: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  language: 'English' | 'Bengali';
  preferredModel?: string;
}): Promise<{ questions: QuizQuestionItem[]; model: string }> {
  await checkDailyUsageLimit(params.userId);
  const model = await resolveModel(params.preferredModel);
  const start = Date.now();
  const count = params.questionCount === 10 ? 10 : 5;

  const prompt = `Generate exactly ${count} original, accurate multiple-choice questions (MCQs).
Subject: ${params.subject}
Chapter / Topic: ${params.topic}
Education Level: ${params.educationLevel}
Difficulty: ${params.difficulty}
Language: ${params.language}
Rules:
- Each question must have exactly 4 distinct options.
- correctIndex must be 0, 1, 2, or 3 corresponding to the single unambiguously correct option.
- explanation must explain why the answer is right in simple, student-friendly language.
- subtopic must be a short 2–4 word concept label for weakness tracking.`;

  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction:
          'You are an expert exam question setter. Return valid JSON strictly matching the schema.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              correctIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
              subtopic: { type: Type.STRING },
            },
            required: ['question', 'options', 'correctIndex', 'explanation', 'subtopic'],
          },
        },
        ...(model === 'gemini-4-hydrogen' ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
      },
    });
    const rawText = (response.text || '[]').trim();
    const parsed = JSON.parse(rawText) as QuizQuestionItem[];
    const cleaned = parsed
      .filter((q) => q && q.question && Array.isArray(q.options) && q.options.length === 4)
      .slice(0, count)
      .map((q) => ({
        question: String(q.question),
        options: q.options.map((o) => String(o)),
        correctIndex: Math.min(3, Math.max(0, Number(q.correctIndex) || 0)),
        explanation: String(q.explanation || ''),
        subtopic: String(q.subtopic || params.topic),
      }));
    if (cleaned.length === 0) {
      throw new Error('Could not generate valid MCQ questions for this topic.');
    }
    await recordAiUsage({
      userId: params.userId,
      feature: 'smart_quiz',
      model,
      success: true,
      latencyMs: Date.now() - start,
    });
    return { questions: cleaned, model };
  } catch (err) {
    const friendly = formatGeminiError(err);
    await recordAiUsage({
      userId: params.userId,
      feature: 'smart_quiz',
      model,
      success: false,
      errorMessage: friendly,
      latencyMs: Date.now() - start,
    });
    throw new Error(friendly);
  }
}

export async function generateTutorReplyAI(params: {
  userId: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  message: string;
  subject: string;
  educationLevel: EducationLevel;
  language: 'English' | 'Bengali';
  preferredModel?: string;
  temperature?: number;
}): Promise<{ reply: string; model: string }> {
  await checkDailyUsageLimit(params.userId);
  const model = await resolveModel(params.preferredModel);
  const thinkingLevel = mapTemperatureToThinking(model, params.temperature ?? 0.4);
  const start = Date.now();

  try {
    const ai = getClient();
    const chat = ai.chats.create({
      model,
      history: params.history.slice(-12).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      config: {
        systemInstruction: `You are EduGenius AI Live Tutor, a patient, Socratic, 24/7 personal educational mentor.
Student Level: ${params.educationLevel}
Focus Subject: ${params.subject}
Preferred Language: ${params.language} (If the student writes in Bengali or asks for Bengali, respond in clear, natural Bengali; otherwise use English.)
Pedagogical Rules:
1. Never dump an unexplained final answer—walk the student through the reasoning step by step.
2. Give a relatable example or analogy suited to ${params.educationLevel}.
3. End with a brief check-in or follow-up prompt so the student stays engaged.`,
        ...(thinkingLevel ? { thinkingConfig: { thinkingLevel } } : {}),
      },
    });
    const response = await chat.sendMessage({ message: params.message });
    const reply = (response.text || '').trim();
    if (!reply) throw new Error('Tutor returned an empty reply.');
    await recordAiUsage({
      userId: params.userId,
      feature: 'live_tutor',
      model,
      success: true,
      latencyMs: Date.now() - start,
    });
    return { reply, model };
  } catch (err) {
    const friendly = formatGeminiError(err);
    await recordAiUsage({
      userId: params.userId,
      feature: 'live_tutor',
      model,
      success: false,
      errorMessage: friendly,
      latencyMs: Date.now() - start,
    });
    throw new Error(friendly);
  }
}

export async function generateEducatorMaterialAI(params: {
  userId: string;
  materialType: 'Lesson Plan' | 'Exam Questions' | 'Syllabus' | 'MCQ Bank';
  subject: string;
  educationLevel: EducationLevel;
  topic: string;
  language: 'English' | 'Bengali';
  preferredModel?: string;
}): Promise<{ content: string; model: string }> {
  await checkDailyUsageLimit(params.userId);
  const model = await resolveModel(params.preferredModel);
  const start = Date.now();

  const prompt = `As a senior academic curriculum specialist, create a comprehensive ${params.materialType}.
Subject: ${params.subject}
Education Level: ${params.educationLevel}
Topic / Scope: ${params.topic}
Language: ${params.language}
Requirements:
- Structure clearly with Markdown headings, learning objectives, classroom activities or assessment rubrics, and an answer key where applicable.`;

  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: 'You assist educators in designing structured, curriculum-aligned teaching materials.',
        ...(model === 'gemini-4-hydrogen' ? { thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM } } : {}),
      },
    });
    const content = (response.text || '').trim();
    if (!content) throw new Error('Failed to generate educator material.');
    await recordAiUsage({
      userId: params.userId,
      feature: 'educator_studio',
      model,
      success: true,
      latencyMs: Date.now() - start,
    });
    return { content, model };
  } catch (err) {
    const friendly = formatGeminiError(err);
    await recordAiUsage({
      userId: params.userId,
      feature: 'educator_studio',
      model,
      success: false,
      errorMessage: friendly,
      latencyMs: Date.now() - start,
    });
    throw new Error(friendly);
  }
}

export async function testAiConnection(userId: string | null, requestedModel?: string): Promise<{
  ok: boolean;
  model: string;
  latencyMs: number;
  message: string;
}> {
  const model = await resolveModel(requestedModel);
  const start = Date.now();
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model,
      contents: 'Reply with exactly: EduGenius AI connection verified.',
      config: {
        ...(model === 'gemini-4-hydrogen' ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
      },
    });
    const latencyMs = Date.now() - start;
    const reply = (response.text || '').trim();
    await recordAiUsage({
      userId,
      feature: 'connection_test',
      model,
      success: true,
      latencyMs,
    });
    return {
      ok: Boolean(reply),
      model,
      latencyMs,
      message: reply || 'Connection verified.',
    };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const friendly = formatGeminiError(err);
    await recordAiUsage({
      userId,
      feature: 'connection_test',
      model,
      success: false,
      errorMessage: friendly,
      latencyMs,
    });
    return {
      ok: false,
      model,
      latencyMs,
      message: friendly,
    };
  }
}
