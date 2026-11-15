import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import express from 'express';
import { getDb, mutateDb } from './server/store.ts';
import {
  checkLoginRateLimit,
  clearFailedLogins,
  hashPassword,
  logActivity,
  optionalAuth,
  recordFailedLogin,
  requireAuth,
  requireRole,
  sanitizeUser,
  verifyPassword,
  type AuthRequest,
} from './server/auth.ts';
import {
  AVAILABLE_MODELS,
  generateEducatorMaterialAI,
  generateQuizAI,
  generateStudyNoteAI,
  generateTutorReplyAI,
  runQuickAsk,
  testAiConnection,
} from './server/gemini.ts';
import type { EducationLevel, UserRecord } from './server/types.ts';

const app = express();
const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '2mb' }));

function setSessionCookie(res: express.Response, token: string, rememberMe: boolean) {
  const maxAgeMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  res.cookie('eg_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PROD,
    maxAge: maxAgeMs,
    path: '/',
  });
}

// ---------- PUBLIC BOOTSTRAP & LEADERBOARD ----------
app.get('/api/public/bootstrap', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const db = await getDb();
    const needsAdminSetup = !db.users.some((u) => u.role === 'SUPER_ADMIN');
    const publishedCourses = db.courses.filter((c) => c.published);
    const activeAnnouncements = db.announcements.filter((a) => a.active);

    res.json({
      needsAdminSetup,
      siteSettings: db.siteSettings,
      courses: publishedCourses,
      announcements: activeAnnouncements,
      testimonials: db.testimonials,
      models: AVAILABLE_MODELS.filter((m) => db.siteSettings.aiConfig.enabledModels.includes(m.id)),
      user: req.user ? sanitizeUser(req.user) : null,
    });
  } catch (err) {
    console.error('Bootstrap error:', err);
    res.status(500).json({ error: 'Failed to load platform configuration.' });
  }
});

app.get('/api/leaderboard', async (_req, res) => {
  try {
    const db = await getDb();
    const userScores = new Map<
      string,
      { attempts: number; totalAccuracy: number; totalCorrect: number; bestScore: number }
    >();
    for (const attempt of db.quizAttempts) {
      const curr = userScores.get(attempt.userId) || {
        attempts: 0,
        totalAccuracy: 0,
        totalCorrect: 0,
        bestScore: 0,
      };
      curr.attempts += 1;
      curr.totalAccuracy += attempt.accuracy;
      curr.totalCorrect += attempt.score;
      curr.bestScore = Math.max(curr.bestScore, attempt.accuracy);
      userScores.set(attempt.userId, curr);
    }

    const entries = db.users
      .filter((u) => u.role === 'STUDENT' && u.status === 'ACTIVE' && u.leaderboardPublic)
      .map((u) => {
        const stats = userScores.get(u.id);
        if (!stats || stats.attempts === 0) return null;
        return {
          id: u.id,
          displayName: u.displayName || u.fullName,
          educationLevel: u.educationLevel,
          quizzesCompleted: stats.attempts,
          averageAccuracy: Math.round((stats.totalAccuracy / stats.attempts) * 10) / 10,
          totalCorrect: stats.totalCorrect,
          bestScore: stats.bestScore,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.averageAccuracy - a.averageAccuracy || b.totalCorrect - a.totalCorrect)
      .slice(0, 20);

    res.json({ entries });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to load leaderboard.' });
  }
});

// ---------- ONE-TIME SUPER ADMIN SETUP ----------
app.post('/api/admin/bootstrap', async (req, res) => {
  try {
    const { fullName, email, password, address } = req.body || {};
    if (!email || !password || String(password).length < 8) {
      res.status(400).json({ error: 'Valid email and password (minimum 8 characters) are required.' });
      return;
    }

    const result = await mutateDb((db) => {
      const exists = db.users.some((u) => u.role === 'SUPER_ADMIN');
      if (exists) {
        return { error: 'Super Admin account is already configured.', status: 403 as const };
      }
      const normalizedEmail = String(email).trim().toLowerCase();
      if (db.users.some((u) => u.email === normalizedEmail)) {
        return { error: 'An account with this email already exists.', status: 409 as const };
      }

      const { hash, salt } = hashPassword(String(password));
      const user: UserRecord = {
        id: `usr-${crypto.randomUUID()}`,
        fullName: String(fullName || 'Website Administrator').trim(),
        displayName: String(fullName || 'Website Administrator').trim(),
        email: normalizedEmail,
        phone: '+8801700000000',
        passwordHash: hash,
        passwordSalt: salt,
        role: 'SUPER_ADMIN',
        educationLevel: 'University',
        address: String(address || 'Gaibandha Circular Road, Gaibandha, Bangladesh.').trim(),
        status: 'ACTIVE',
        emailVerified: true,
        educatorVerified: true,
        leaderboardPublic: false,
        learningMinutes: 0,
        aiPreferences: {
          model: db.siteSettings.aiConfig.defaultModel,
          temperature: 0.4,
          defaultLanguage: 'English',
        },
        createdAt: new Date().toISOString(),
      };
      db.users.push(user);

      const token = crypto.randomBytes(32).toString('hex');
      db.sessions.push({
        token,
        userId: user.id,
        rememberMe: true,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });

      db.activityLogs.unshift({
        id: `act-${crypto.randomUUID()}`,
        actorId: user.id,
        actorName: user.fullName,
        action: 'Initial Super Admin provisioned',
        target: user.email,
        createdAt: new Date().toISOString(),
      });

      return { user, token, status: 201 as const };
    });

    if ('error' in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    setSessionCookie(res, result.token, true);
    res.status(201).json({ user: sanitizeUser(result.user), token: result.token });
  } catch (err) {
    console.error('Admin bootstrap error:', err);
    res.status(500).json({ error: 'Failed to create initial administrator.' });
  }
});

// ---------- AUTHENTICATION ----------
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, phone, password, confirmPassword, educationLevel, role } = req.body || {};

    if (!fullName || !email || !phone || !password) {
      res.status(400).json({ error: 'All registration fields are required.' });
      return;
    }
    if (String(password).length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }
    if (password !== confirmPassword) {
      res.status(400).json({ error: 'Passwords do not match.' });
      return;
    }

    // Strictly block public admin registration
    const requestedRole = String(role || 'STUDENT').toUpperCase();
    if (requestedRole === 'ADMIN' || requestedRole === 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Administrator accounts cannot be created through public registration.' });
      return;
    }
    const assignedRole = requestedRole === 'EDUCATOR' ? 'EDUCATOR' : 'STUDENT';
    const normalizedEmail = String(email).trim().toLowerCase();

    const result = await mutateDb((db) => {
      if (db.users.some((u) => u.email === normalizedEmail)) {
        return { error: 'An account with this email already exists.', status: 409 as const };
      }

      const { hash, salt } = hashPassword(String(password));
      const verificationCode = String(crypto.randomInt(100000, 999999));

      const newUser: UserRecord = {
        id: `usr-${crypto.randomUUID()}`,
        fullName: String(fullName).trim(),
        displayName: String(fullName).trim(),
        email: normalizedEmail,
        phone: String(phone).trim(),
        passwordHash: hash,
        passwordSalt: salt,
        role: assignedRole,
        educationLevel: (educationLevel as EducationLevel) || 'Higher Secondary (HSC)',
        status: 'ACTIVE',
        emailVerified: false,
        verificationCode,
        educatorVerified: false,
        leaderboardPublic: true,
        learningMinutes: 0,
        aiPreferences: {
          model: db.siteSettings.aiConfig.defaultModel,
          temperature: 0.4,
          defaultLanguage: 'English',
        },
        createdAt: new Date().toISOString(),
      };
      db.users.push(newUser);

      const token = crypto.randomBytes(32).toString('hex');
      db.sessions.push({
        token,
        userId: newUser.id,
        rememberMe: false,
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });

      db.activityLogs.unshift({
        id: `act-${crypto.randomUUID()}`,
        actorId: newUser.id,
        actorName: newUser.fullName,
        action: `Registered as ${assignedRole}`,
        target: newUser.email,
        createdAt: new Date().toISOString(),
      });

      return { user: newUser, token, verificationCode, status: 201 as const };
    });

    if ('error' in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    setSessionCookie(res, result.token, false);
    res.status(201).json({
      user: sanitizeUser(result.user),
      token: result.token,
      verificationPreviewCode: result.verificationCode,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body || {};
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const rateKey = `${req.ip}:${normalizedEmail}`;

    const limit = checkLoginRateLimit(rateKey);
    if (!limit.allowed) {
      res.status(429).json({
        error: `Too many failed login attempts. Please retry in ${Math.ceil(limit.retryAfterSec / 60)} minutes.`,
      });
      return;
    }

    if (!normalizedEmail || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const db = await getDb();
    const user = db.users.find((u) => u.email === normalizedEmail);
    if (!user || !verifyPassword(String(password), user.passwordSalt, user.passwordHash)) {
      recordFailedLogin(rateKey);
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (user.status === 'SUSPENDED') {
      res.status(403).json({ error: 'Your account has been suspended. Please contact an administrator.' });
      return;
    }

    clearFailedLogins(rateKey);
    const remember = Boolean(rememberMe);
    const token = crypto.randomBytes(32).toString('hex');
    const ttlMs = remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    await mutateDb((state) => {
      state.sessions = state.sessions.filter((s) => s.expiresAt > Date.now());
      state.sessions.push({
        token,
        userId: user.id,
        rememberMe: remember,
        createdAt: Date.now(),
        expiresAt: Date.now() + ttlMs,
      });
      state.activityLogs.unshift({
        id: `act-${crypto.randomUUID()}`,
        actorId: user.id,
        actorName: user.fullName,
        action: 'Signed in',
        target: user.role,
        createdAt: new Date().toISOString(),
      });
    });

    setSessionCookie(res, token, remember);
    res.json({ user: sanitizeUser(user), token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

app.post('/api/auth/logout', optionalAuth, async (req: AuthRequest, res) => {
  try {
    if (req.sessionToken) {
      await mutateDb((db) => {
        db.sessions = db.sessions.filter((s) => s.token !== req.sessionToken);
      });
    }
    res.clearCookie('eg_session', { path: '/' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed.' });
  }
});

app.get('/api/auth/me', optionalAuth, async (req: AuthRequest, res) => {
  const db = await getDb();
  const needsAdminSetup = !db.users.some((u) => u.role === 'SUPER_ADMIN');
  res.json({
    user: req.user ? sanitizeUser(req.user) : null,
    needsAdminSetup,
  });
});

app.post('/api/auth/verify-email', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { code } = req.body || {};
    const userId = req.user!.id;
    const result = await mutateDb((db) => {
      const user = db.users.find((u) => u.id === userId);
      if (!user) return { error: 'User not found', status: 404 as const };
      if (user.emailVerified) return { user, status: 200 as const };
      if (!code || String(code).trim() !== user.verificationCode) {
        return { error: 'Invalid verification code.', status: 400 as const };
      }
      user.emailVerified = true;
      user.verificationCode = undefined;
      return { user, status: 200 as const };
    });

    if ('error' in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({ user: sanitizeUser(result.user) });
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ error: 'Failed to verify email.' });
  }
});

app.post('/api/auth/resend-verification', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const code = String(crypto.randomInt(100000, 999999));
    await mutateDb((db) => {
      const user = db.users.find((u) => u.id === userId);
      if (user && !user.emailVerified) {
        user.verificationCode = code;
      }
    });
    res.json({ verificationPreviewCode: code });
  } catch (err) {
    console.error('Resend verification error:', err);
    res.status(500).json({ error: 'Failed to issue verification code.' });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) {
      res.status(400).json({ error: 'Please enter your email address.' });
      return;
    }
    const resetCode = String(crypto.randomInt(100000, 999999));
    let issued = false;
    await mutateDb((db) => {
      const user = db.users.find((u) => u.email === email);
      if (user) {
        user.resetCode = resetCode;
        user.resetCodeExpiresAt = Date.now() + 15 * 60 * 1000;
        issued = true;
      }
    });
    res.json({
      message: 'If an account matches this email, a 6-digit password reset code has been generated.',
      resetPreviewCode: issued ? resetCode : undefined,
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to initiate password reset.' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body || {};
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !code || !newPassword || String(newPassword).length < 6) {
      res.status(400).json({ error: 'Valid email, 6-digit code, and new password (6+ chars) are required.' });
      return;
    }

    const result = await mutateDb((db) => {
      const user = db.users.find((u) => u.email === normalizedEmail);
      if (
        !user ||
        !user.resetCode ||
        user.resetCode !== String(code).trim() ||
        !user.resetCodeExpiresAt ||
        user.resetCodeExpiresAt < Date.now()
      ) {
        return { error: 'Invalid or expired reset code.', status: 400 as const };
      }
      const { hash, salt } = hashPassword(String(newPassword));
      user.passwordHash = hash;
      user.passwordSalt = salt;
      user.resetCode = undefined;
      user.resetCodeExpiresAt = undefined;
      db.sessions = db.sessions.filter((s) => s.userId !== user.id);
      return { ok: true, status: 200 as const };
    });

    if ('error' in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({ message: 'Password updated successfully. Please sign in with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// ---------- USER PROFILE & AI SETTINGS ----------
app.patch('/api/user/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { fullName, displayName, phone, educationLevel, leaderboardPublic } = req.body || {};
    const updated = await mutateDb((db) => {
      const user = db.users.find((u) => u.id === req.user!.id);
      if (!user) return null;
      if (typeof fullName === 'string' && fullName.trim()) user.fullName = fullName.trim();
      if (typeof displayName === 'string' && displayName.trim()) user.displayName = displayName.trim();
      if (typeof phone === 'string' && phone.trim()) user.phone = phone.trim();
      if (typeof educationLevel === 'string') user.educationLevel = educationLevel as EducationLevel;
      if (typeof leaderboardPublic === 'boolean') user.leaderboardPublic = leaderboardPublic;
      return sanitizeUser(user);
    });
    res.json({ user: updated });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

app.patch('/api/user/ai-settings', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { model, temperature, defaultLanguage } = req.body || {};
    const db = await getDb();
    const enabled = db.siteSettings.aiConfig.enabledModels;

    const updated = await mutateDb((state) => {
      const user = state.users.find((u) => u.id === req.user!.id);
      if (!user) return null;
      if (typeof model === 'string' && enabled.includes(model)) {
        user.aiPreferences.model = model;
      }
      if (typeof temperature === 'number') {
        user.aiPreferences.temperature = Math.min(0.7, Math.max(0.2, Math.round(temperature * 10) / 10));
      }
      if (defaultLanguage === 'English' || defaultLanguage === 'Bengali') {
        user.aiPreferences.defaultLanguage = defaultLanguage;
      }
      return sanitizeUser(user);
    });
    res.json({ user: updated });
  } catch (err) {
    console.error('AI settings error:', err);
    res.status(500).json({ error: 'Failed to save AI settings.' });
  }
});

app.get('/api/ai/models', async (_req, res) => {
  const db = await getDb();
  const enabled = db.siteSettings.aiConfig.enabledModels;
  res.json({
    models: AVAILABLE_MODELS.filter((m) => enabled.includes(m.id)),
    defaultModel: db.siteSettings.aiConfig.defaultModel,
    configured: Boolean(process.env.GEMINI_API_KEY),
  });
});

app.post('/api/ai/test', requireAuth, async (req: AuthRequest, res) => {
  const requestedModel = typeof req.body?.model === 'string' ? req.body.model : req.user?.aiPreferences.model;
  const result = await testAiConnection(req.user!.id, requestedModel);
  res.status(result.ok ? 200 : 502).json(result);
});

// ---------- HERO QUICK AI ASK ----------
app.post('/api/ai/quick-ask', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { question, subject } = req.body || {};
    if (!question || !String(question).trim()) {
      res.status(400).json({ error: 'Please enter a question to ask EduGenius AI.' });
      return;
    }
    const result = await runQuickAsk({
      userId: req.user!.id,
      question: String(question).trim(),
      subject: String(subject || 'General Knowledge'),
    });
    await mutateDb((db) => {
      const u = db.users.find((item) => item.id === req.user!.id);
      if (u) u.learningMinutes += 5;
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Quick ask failed.' });
  }
});

// ---------- AI STUDY HUB ----------
app.post('/api/study-hub/generate', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { subject, educationLevel, topic, depth, language, difficulty, includeExamples } = req.body || {};
    if (!topic || !String(topic).trim()) {
      res.status(400).json({ error: 'Please enter a topic or question.' });
      return;
    }
    const result = await generateStudyNoteAI({
      userId: req.user!.id,
      subject: String(subject || 'Science'),
      educationLevel: (educationLevel as EducationLevel) || req.user!.educationLevel,
      topic: String(topic).trim(),
      depth: depth || 'Detailed Explanation',
      language: language === 'Bengali' ? 'Bengali' : 'English',
      difficulty: difficulty || 'Medium',
      includeExamples: includeExamples !== false,
      preferredModel: req.user!.aiPreferences.model,
      temperature: req.user!.aiPreferences.temperature,
    });
    await mutateDb((db) => {
      const u = db.users.find((item) => item.id === req.user!.id);
      if (u) u.learningMinutes += 10;
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to generate study note.' });
  }
});

app.get('/api/study-hub/notes', requireAuth, async (req: AuthRequest, res) => {
  const db = await getDb();
  const notes = db.studyNotes.filter((n) => n.userId === req.user!.id);
  res.json({ notes });
});

app.post('/api/study-hub/notes', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { subject, educationLevel, topic, depth, language, difficulty, includeExamples, content } = req.body || {};
    if (!topic || !content) {
      res.status(400).json({ error: 'Topic and content are required to save note.' });
      return;
    }
    const note = await mutateDb((db) => {
      const item = {
        id: `note-${crypto.randomUUID()}`,
        userId: req.user!.id,
        subject: String(subject || 'Science'),
        educationLevel: (educationLevel as EducationLevel) || req.user!.educationLevel,
        topic: String(topic).trim(),
        depth: depth || 'Detailed Explanation',
        language: language === 'Bengali' ? ('Bengali' as const) : ('English' as const),
        difficulty: difficulty || 'Medium',
        includeExamples: Boolean(includeExamples),
        content: String(content),
        createdAt: new Date().toISOString(),
      };
      db.studyNotes.unshift(item);
      return item;
    });
    res.status(201).json({ note });
  } catch (err) {
    console.error('Save note error:', err);
    res.status(500).json({ error: 'Failed to save study note.' });
  }
});

app.delete('/api/study-hub/notes/:id', requireAuth, async (req: AuthRequest, res) => {
  await mutateDb((db) => {
    db.studyNotes = db.studyNotes.filter((n) => !(n.id === req.params.id && n.userId === req.user!.id));
  });
  res.json({ ok: true });
});

// ---------- SMART QUIZ ----------
app.post('/api/quizzes/generate', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { subject, topic, educationLevel, questionCount, difficulty, language } = req.body || {};
    if (!topic || !String(topic).trim()) {
      res.status(400).json({ error: 'Please enter a chapter or topic for your quiz.' });
      return;
    }
    const result = await generateQuizAI({
      userId: req.user!.id,
      subject: String(subject || 'Science'),
      topic: String(topic).trim(),
      educationLevel: (educationLevel as EducationLevel) || req.user!.educationLevel,
      questionCount: Number(questionCount) === 10 ? 10 : 5,
      difficulty: difficulty || 'Medium',
      language: language === 'Bengali' ? 'Bengali' : 'English',
      preferredModel: req.user!.aiPreferences.model,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to generate quiz.' });
  }
});

app.post('/api/quizzes/submit', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { subject, topic, educationLevel, difficulty, questions, selectedAnswers, durationSeconds } = req.body || {};
    if (!Array.isArray(questions) || !Array.isArray(selectedAnswers) || questions.length === 0) {
      res.status(400).json({ error: 'Quiz questions and answers are required.' });
      return;
    }

    let score = 0;
    const weakSet = new Set<string>();
    questions.forEach((q, idx) => {
      const picked = Number(selectedAnswers[idx]);
      if (picked === Number(q.correctIndex)) {
        score += 1;
      } else if (q.subtopic) {
        weakSet.add(String(q.subtopic));
      }
    });

    const total = questions.length;
    const accuracy = Math.round((score / total) * 100);
    const weakTopics = Array.from(weakSet);
    const suggestions =
      accuracy >= 80
        ? `Strong mastery in ${topic}. Challenge yourself with Hard difficulty or explore advanced application problems.`
        : weakTopics.length > 0
        ? `Focus on revising: ${weakTopics.join(', ')}. Generate a Detailed Explanation in AI Study Hub for these concepts and re-attempt the quiz.`
        : `Review the step-by-step explanations below and practice another 5-question round to build confidence.`;

    const attempt = await mutateDb((db) => {
      const record = {
        id: `quiz-${crypto.randomUUID()}`,
        userId: req.user!.id,
        subject: String(subject || 'General'),
        topic: String(topic || 'Practice Quiz'),
        educationLevel: (educationLevel as EducationLevel) || req.user!.educationLevel,
        difficulty: difficulty || 'Medium',
        questionCount: total,
        score,
        accuracy,
        weakTopics,
        suggestions,
        questions,
        selectedAnswers,
        durationSeconds: Number(durationSeconds) || 0,
        createdAt: new Date().toISOString(),
      };
      db.quizAttempts.unshift(record);
      const u = db.users.find((item) => item.id === req.user!.id);
      if (u) u.learningMinutes += Math.max(5, Math.round((Number(durationSeconds) || 180) / 60));
      return record;
    });

    res.status(201).json({ attempt });
  } catch (err) {
    console.error('Submit quiz error:', err);
    res.status(500).json({ error: 'Failed to submit quiz.' });
  }
});

app.get('/api/quizzes/attempts', requireAuth, async (req: AuthRequest, res) => {
  const db = await getDb();
  const attempts = db.quizAttempts.filter((a) => a.userId === req.user!.id);
  res.json({ attempts });
});

// ---------- AI LIVE TUTOR ----------
app.get('/api/tutor/conversations', requireAuth, async (req: AuthRequest, res) => {
  const db = await getDb();
  const conversations = db.conversations.filter((c) => c.userId === req.user!.id);
  res.json({ conversations });
});

app.post('/api/tutor/conversations', requireAuth, async (req: AuthRequest, res) => {
  const { title, subject, educationLevel, language } = req.body || {};
  const conv = await mutateDb((db) => {
    const item = {
      id: `conv-${crypto.randomUUID()}`,
      userId: req.user!.id,
      title: String(title || 'New Tutoring Session').slice(0, 80),
      subject: String(subject || 'General'),
      educationLevel: (educationLevel as EducationLevel) || req.user!.educationLevel,
      language: language === 'Bengali' ? ('Bengali' as const) : ('English' as const),
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.conversations.unshift(item);
    return item;
  });
  res.status(201).json({ conversation: conv });
});

app.post('/api/tutor/conversations/:id/message', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { message, subject, educationLevel, language } = req.body || {};
    if (!message || !String(message).trim()) {
      res.status(400).json({ error: 'Message text is required.' });
      return;
    }

    const db = await getDb();
    const conv = db.conversations.find((c) => c.id === req.params.id && c.userId === req.user!.id);
    if (!conv) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }

    const userText = String(message).trim();
    const replyData = await generateTutorReplyAI({
      userId: req.user!.id,
      history: conv.messages.map((m) => ({ role: m.role, content: m.content })),
      message: userText,
      subject: String(subject || conv.subject),
      educationLevel: (educationLevel as EducationLevel) || conv.educationLevel,
      language: language === 'Bengali' || language === 'English' ? language : conv.language,
      preferredModel: req.user!.aiPreferences.model,
      temperature: req.user!.aiPreferences.temperature,
    });

    const updated = await mutateDb((state) => {
      const target = state.conversations.find((c) => c.id === req.params.id && c.userId === req.user!.id);
      if (!target) return null;
      const now = new Date().toISOString();
      if (target.messages.length === 0) {
        target.title = userText.slice(0, 56);
      }
      if (subject) target.subject = String(subject);
      if (educationLevel) target.educationLevel = educationLevel as EducationLevel;
      if (language === 'Bengali' || language === 'English') target.language = language;
      target.messages.push(
        { id: `msg-${crypto.randomUUID()}`, role: 'user', content: userText, createdAt: now },
        { id: `msg-${crypto.randomUUID()}`, role: 'assistant', content: replyData.reply, createdAt: now }
      );
      target.updatedAt = now;

      const u = state.users.find((item) => item.id === req.user!.id);
      if (u) u.learningMinutes += 5;

      return target;
    });

    res.json({ conversation: updated, model: replyData.model });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Tutor failed to respond.' });
  }
});

app.delete('/api/tutor/conversations/:id', requireAuth, async (req: AuthRequest, res) => {
  await mutateDb((db) => {
    db.conversations = db.conversations.filter((c) => !(c.id === req.params.id && c.userId === req.user!.id));
  });
  res.json({ ok: true });
});

// ---------- STUDENT DASHBOARD, COURSES & STUDY PLANNER ----------
app.get('/api/student/dashboard', requireAuth, async (req: AuthRequest, res) => {
  try {
    const db = await getDb();
    const uid = req.user!.id;
    const notes = db.studyNotes.filter((n) => n.userId === uid);
    const quizzes = db.quizAttempts.filter((q) => q.userId === uid);
    const conversations = db.conversations.filter((c) => c.userId === uid);
    const tasks = db.studyTasks.filter((t) => t.userId === uid);
    const enrolledCourses = db.courses.filter((c) => c.published && c.enrolledUserIds.includes(uid));
    const availableCourses = db.courses.filter((c) => c.published);

    const avgScore =
      quizzes.length > 0 ? Math.round(quizzes.reduce((sum, q) => sum + q.accuracy, 0) / quizzes.length) : 0;

    // Identify weak topics from recent quizzes to recommend topics
    const weakTopicsCount = new Map<string, number>();
    for (const q of quizzes.slice(0, 10)) {
      for (const wt of q.weakTopics) {
        weakTopicsCount.set(wt, (weakTopicsCount.get(wt) || 0) + 1);
      }
    }
    const recommendedTopics = Array.from(weakTopicsCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([topic]) => ({ topic, reason: 'Needs review based on recent quiz answers' }));

    if (recommendedTopics.length === 0) {
      recommendedTopics.push(
        { topic: 'Photosynthesis & Cellular Respiration', reason: `Popular for ${req.user!.educationLevel}` },
        { topic: 'English Passive Voice & Conditionals', reason: 'High-yield exam topic' },
        { topic: 'Binary Logic & Number Systems', reason: 'Core ICT skill' }
      );
    }

    const notifications = db.announcements
      .filter((a) => a.active && (a.audience === 'ALL' || a.audience === 'STUDENT'))
      .map((a) => ({ id: a.id, title: a.title, body: a.body, createdAt: a.createdAt }));

    if (!req.user!.emailVerified) {
      notifications.unshift({
        id: 'notif-verify-email',
        title: 'Verify Your Email Address',
        body: 'Complete email verification in Settings to secure your academic profile.',
        createdAt: req.user!.createdAt,
      });
    }

    res.json({
      stats: {
        learningHours: Math.round((req.user!.learningMinutes / 60) * 10) / 10,
        completedQuizzes: quizzes.length,
        averageQuizScore: avgScore,
        savedNotesCount: notes.length,
        enrolledCoursesCount: enrolledCourses.length,
      },
      enrolledCourses,
      availableCourses,
      recentConversations: conversations.slice(0, 5),
      savedNotes: notes.slice(0, 10),
      recentQuizResults: quizzes.slice(0, 10),
      upcomingTasks: tasks,
      recommendedTopics,
      notifications,
    });
  } catch (err) {
    console.error('Student dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard data.' });
  }
});

app.get('/api/courses', optionalAuth, async (req: AuthRequest, res) => {
  const db = await getDb();
  const isStaff = req.user && ['ADMIN', 'SUPER_ADMIN', 'EDUCATOR'].includes(req.user.role);
  const courses = isStaff ? db.courses : db.courses.filter((c) => c.published);
  res.json({ courses });
});

app.post('/api/courses/:id/enroll', requireAuth, async (req: AuthRequest, res) => {
  const result = await mutateDb((db) => {
    const course = db.courses.find((c) => c.id === req.params.id && c.published);
    if (!course) return null;
    if (!course.enrolledUserIds.includes(req.user!.id)) {
      course.enrolledUserIds.push(req.user!.id);
    }
    return course;
  });
  if (!result) {
    res.status(404).json({ error: 'Course not found.' });
    return;
  }
  res.json({ course: result });
});

app.get('/api/tasks', requireAuth, async (req: AuthRequest, res) => {
  const db = await getDb();
  res.json({ tasks: db.studyTasks.filter((t) => t.userId === req.user!.id) });
});

app.post('/api/tasks', requireAuth, async (req: AuthRequest, res) => {
  const { title, subject, dueDate, priority } = req.body || {};
  if (!title || !String(title).trim()) {
    res.status(400).json({ error: 'Task title is required.' });
    return;
  }
  const task = await mutateDb((db) => {
    const item = {
      id: `task-${crypto.randomUUID()}`,
      userId: req.user!.id,
      title: String(title).trim(),
      subject: String(subject || 'General'),
      dueDate: String(dueDate || new Date().toISOString().slice(0, 10)),
      priority: (priority === 'High' || priority === 'Low' ? priority : 'Medium') as 'Low' | 'Medium' | 'High',
      completed: false,
      createdAt: new Date().toISOString(),
    };
    db.studyTasks.unshift(item);
    return item;
  });
  res.status(201).json({ task });
});

app.patch('/api/tasks/:id', requireAuth, async (req: AuthRequest, res) => {
  const updated = await mutateDb((db) => {
    const task = db.studyTasks.find((t) => t.id === req.params.id && t.userId === req.user!.id);
    if (!task) return null;
    if (typeof req.body?.completed === 'boolean') task.completed = req.body.completed;
    if (typeof req.body?.title === 'string' && req.body.title.trim()) task.title = req.body.title.trim();
    return task;
  });
  if (!updated) {
    res.status(404).json({ error: 'Task not found.' });
    return;
  }
  res.json({ task: updated });
});

app.delete('/api/tasks/:id', requireAuth, async (req: AuthRequest, res) => {
  await mutateDb((db) => {
    db.studyTasks = db.studyTasks.filter((t) => !(t.id === req.params.id && t.userId === req.user!.id));
  });
  res.json({ ok: true });
});

// ---------- EDUCATOR DASHBOARD ----------
app.get('/api/educator/overview', requireAuth, requireRole(['EDUCATOR', 'ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
  const db = await getDb();
  const myCourses = db.courses.filter(
    (c) => c.educatorId === req.user!.id || ['ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)
  );
  const myQuestions = db.questionBank.filter(
    (q) => q.createdById === req.user!.id || ['ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)
  );
  const studentPerformance = db.quizAttempts.slice(0, 25).map((attempt) => {
    const student = db.users.find((u) => u.id === attempt.userId);
    return {
      id: attempt.id,
      studentName: student ? student.displayName : 'Student',
      subject: attempt.subject,
      topic: attempt.topic,
      educationLevel: attempt.educationLevel,
      score: attempt.score,
      questionCount: attempt.questionCount,
      accuracy: attempt.accuracy,
      createdAt: attempt.createdAt,
    };
  });

  res.json({
    educatorVerified: req.user!.educatorVerified || ['ADMIN', 'SUPER_ADMIN'].includes(req.user!.role),
    courses: myCourses,
    questionBank: myQuestions,
    studentPerformance,
  });
});

app.post('/api/educator/courses', requireAuth, requireRole(['EDUCATOR', 'ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
  const { title, subject, educationLevel, description } = req.body || {};
  if (!title || !subject || !description) {
    res.status(400).json({ error: 'Course title, subject, and description are required.' });
    return;
  }
  const canAutoPublish = req.user!.educatorVerified || ['ADMIN', 'SUPER_ADMIN'].includes(req.user!.role);
  const course = await mutateDb((db) => {
    const item = {
      id: `course-${crypto.randomUUID()}`,
      title: String(title).trim(),
      subject: String(subject).trim(),
      educationLevel: (educationLevel as EducationLevel) || 'Higher Secondary (HSC)',
      description: String(description).trim(),
      educatorId: req.user!.id,
      educatorName: req.user!.fullName,
      published: canAutoPublish,
      enrolledUserIds: [],
      materials: [],
      createdAt: new Date().toISOString(),
    };
    db.courses.unshift(item);
    return item;
  });
  await logActivity(req.user!.id, req.user!.fullName, 'Created course', course.title);
  res.status(201).json({ course });
});

app.post('/api/educator/courses/:id/materials', requireAuth, requireRole(['EDUCATOR', 'ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
  const { title, type, content } = req.body || {};
  if (!title || !content) {
    res.status(400).json({ error: 'Material title and content are required.' });
    return;
  }
  const course = await mutateDb((db) => {
    const target = db.courses.find(
      (c) => c.id === req.params.id && (c.educatorId === req.user!.id || ['ADMIN', 'SUPER_ADMIN'].includes(req.user!.role))
    );
    if (!target) return null;
    target.materials.push({
      id: `mat-${crypto.randomUUID()}`,
      title: String(title).trim(),
      type: type || 'Study Guide',
      content: String(content),
      createdAt: new Date().toISOString(),
    });
    return target;
  });
  if (!course) {
    res.status(404).json({ error: 'Course not found or unauthorized.' });
    return;
  }
  res.status(201).json({ course });
});

app.post('/api/educator/ai-generate', requireAuth, requireRole(['EDUCATOR', 'ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { materialType, subject, educationLevel, topic, language } = req.body || {};
    if (!topic) {
      res.status(400).json({ error: 'Topic is required.' });
      return;
    }
    const result = await generateEducatorMaterialAI({
      userId: req.user!.id,
      materialType: materialType || 'Lesson Plan',
      subject: String(subject || 'Science'),
      educationLevel: (educationLevel as EducationLevel) || 'Higher Secondary (HSC)',
      topic: String(topic).trim(),
      language: language === 'Bengali' ? 'Bengali' : 'English',
      preferredModel: req.user!.aiPreferences.model,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Generation failed.' });
  }
});

app.post('/api/educator/question-bank', requireAuth, requireRole(['EDUCATOR', 'ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
  const { subject, educationLevel, topic, difficulty, question, options, correctIndex, explanation } = req.body || {};
  if (!question || !Array.isArray(options) || options.length !== 4) {
    res.status(400).json({ error: 'Question and 4 options are required.' });
    return;
  }
  const item = await mutateDb((db) => {
    const entry = {
      id: `qb-${crypto.randomUUID()}`,
      subject: String(subject || 'General'),
      educationLevel: (educationLevel as EducationLevel) || 'Higher Secondary (HSC)',
      topic: String(topic || 'General'),
      difficulty: (difficulty || 'Medium') as 'Easy' | 'Medium' | 'Hard',
      question: String(question).trim(),
      options: options.map((o: unknown) => String(o).trim()),
      correctIndex: Math.min(3, Math.max(0, Number(correctIndex) || 0)),
      explanation: String(explanation || '').trim(),
      createdById: req.user!.id,
      createdAt: new Date().toISOString(),
    };
    db.questionBank.unshift(entry);
    return entry;
  });
  res.status(201).json({ item });
});

// ---------- ADMIN PANEL ----------
app.get('/api/admin/overview', requireAuth, requireRole(['ADMIN', 'SUPER_ADMIN']), async (_req: AuthRequest, res) => {
  const db = await getDb();
  const totalUsers = db.users.length;
  const totalStudents = db.users.filter((u) => u.role === 'STUDENT').length;
  const totalEducators = db.users.filter((u) => u.role === 'EDUCATOR').length;
  const totalCourses = db.courses.length;
  const totalQuizAttempts = db.quizAttempts.length;
  const aiSuccessCount = db.aiUsageLogs.filter((l) => l.success).length;
  const aiErrorLogs = db.aiUsageLogs.filter((l) => !l.success).slice(0, 30);

  res.json({
    metrics: {
      totalUsers,
      totalStudents,
      totalEducators,
      totalCourses,
      totalQuizAttempts,
      totalAiRequests: db.aiUsageLogs.length,
      aiSuccessCount,
      aiErrorCount: aiErrorLogs.length,
    },
    users: db.users.map(sanitizeUser),
    courses: db.courses,
    questionBank: db.questionBank,
    quizAttempts: db.quizAttempts.slice(0, 30),
    announcements: db.announcements,
    testimonials: db.testimonials,
    siteSettings: db.siteSettings,
    activityLogs: db.activityLogs.slice(0, 50),
    aiUsageLogs: db.aiUsageLogs.slice(0, 50),
    aiErrorLogs,
    availableModels: AVAILABLE_MODELS,
  });
});

app.patch('/api/admin/users/:id', requireAuth, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
  const { fullName, role, status, educatorVerified, educationLevel } = req.body || {};
  const result = await mutateDb((db) => {
    const target = db.users.find((u) => u.id === req.params.id);
    if (!target) return { error: 'User not found', status: 404 as const };
    if (target.role === 'SUPER_ADMIN' && req.user!.role !== 'SUPER_ADMIN') {
      return { error: 'Only Super Admin can modify Super Admin account.', status: 403 as const };
    }
    if (typeof fullName === 'string' && fullName.trim()) target.fullName = fullName.trim();
    if (typeof status === 'string' && (status === 'ACTIVE' || status === 'SUSPENDED')) {
      if (target.id === req.user!.id && status === 'SUSPENDED') {
        return { error: 'You cannot suspend your own account.', status: 400 as const };
      }
      target.status = status;
    }
    if (typeof educatorVerified === 'boolean') target.educatorVerified = educatorVerified;
    if (typeof educationLevel === 'string') target.educationLevel = educationLevel as EducationLevel;
    if (typeof role === 'string' && ['STUDENT', 'EDUCATOR', 'ADMIN'].includes(role)) {
      if (role === 'ADMIN' && req.user!.role !== 'SUPER_ADMIN') {
        return { error: 'Only Super Admin can assign Admin role.', status: 403 as const };
      }
      if (target.role !== 'SUPER_ADMIN') {
        target.role = role as 'STUDENT' | 'EDUCATOR' | 'ADMIN';
      }
    }
    return { user: sanitizeUser(target), status: 200 as const };
  });
  if ('error' in result) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  await logActivity(req.user!.id, req.user!.fullName, 'Updated user account', result.user.email);
  res.json({ user: result.user });
});

app.patch('/api/admin/courses/:id', requireAuth, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
  const { published, title, subject, description } = req.body || {};
  const course = await mutateDb((db) => {
    const c = db.courses.find((item) => item.id === req.params.id);
    if (!c) return null;
    if (typeof published === 'boolean') c.published = published;
    if (typeof title === 'string' && title.trim()) c.title = title.trim();
    if (typeof subject === 'string' && subject.trim()) c.subject = subject.trim();
    if (typeof description === 'string' && description.trim()) c.description = description.trim();
    return c;
  });
  if (!course) {
    res.status(404).json({ error: 'Course not found.' });
    return;
  }
  await logActivity(req.user!.id, req.user!.fullName, 'Updated course', course.title);
  res.json({ course });
});

app.delete('/api/admin/courses/:id', requireAuth, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
  await mutateDb((db) => {
    db.courses = db.courses.filter((c) => c.id !== req.params.id);
  });
  await logActivity(req.user!.id, req.user!.fullName, 'Deleted course', String(req.params.id));
  res.json({ ok: true });
});

app.delete('/api/admin/question-bank/:id', requireAuth, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
  await mutateDb((db) => {
    db.questionBank = db.questionBank.filter((q) => q.id !== req.params.id);
  });
  res.json({ ok: true });
});

app.patch('/api/admin/settings', requireAuth, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
  const { promoStats, aiConfig, address, tagline } = req.body || {};
  const settings = await mutateDb((db) => {
    if (typeof address === 'string' && address.trim()) db.siteSettings.address = address.trim();
    if (typeof tagline === 'string' && tagline.trim()) db.siteSettings.tagline = tagline.trim();
    if (promoStats && typeof promoStats === 'object') {
      if (typeof promoStats.questionsSolved === 'string') db.siteSettings.promoStats.questionsSolved = promoStats.questionsSolved;
      if (typeof promoStats.quizzesCreated === 'string') db.siteSettings.promoStats.quizzesCreated = promoStats.quizzesCreated;
      if (typeof promoStats.studentSatisfaction === 'string') db.siteSettings.promoStats.studentSatisfaction = promoStats.studentSatisfaction;
    }
    if (aiConfig && typeof aiConfig === 'object') {
      if (typeof aiConfig.defaultModel === 'string') db.siteSettings.aiConfig.defaultModel = aiConfig.defaultModel;
      if (Array.isArray(aiConfig.enabledModels) && aiConfig.enabledModels.length > 0) {
        db.siteSettings.aiConfig.enabledModels = aiConfig.enabledModels;
      }
      if (typeof aiConfig.dailyLimitPerUser === 'number' && aiConfig.dailyLimitPerUser > 0) {
        db.siteSettings.aiConfig.dailyLimitPerUser = aiConfig.dailyLimitPerUser;
      }
    }
    return db.siteSettings;
  });
  await logActivity(req.user!.id, req.user!.fullName, 'Updated site & AI settings', 'System Settings');
  res.json({ siteSettings: settings });
});

app.post('/api/admin/announcements', requireAuth, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
  const { title, body, audience } = req.body || {};
  if (!title || !body) {
    res.status(400).json({ error: 'Announcement title and body are required.' });
    return;
  }
  const announcement = await mutateDb((db) => {
    const item = {
      id: `ann-${crypto.randomUUID()}`,
      title: String(title).trim(),
      body: String(body).trim(),
      audience: (['ALL', 'STUDENT', 'EDUCATOR'].includes(audience) ? audience : 'ALL') as 'ALL' | 'STUDENT' | 'EDUCATOR',
      active: true,
      createdAt: new Date().toISOString(),
    };
    db.announcements.unshift(item);
    return item;
  });
  res.status(201).json({ announcement });
});

app.patch('/api/admin/announcements/:id', requireAuth, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
  const updated = await mutateDb((db) => {
    const item = db.announcements.find((a) => a.id === req.params.id);
    if (!item) return null;
    if (typeof req.body?.active === 'boolean') item.active = req.body.active;
    return item;
  });
  res.json({ announcement: updated });
});

app.delete('/api/admin/announcements/:id', requireAuth, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
  await mutateDb((db) => {
    db.announcements = db.announcements.filter((a) => a.id !== req.params.id);
  });
  res.json({ ok: true });
});

app.post('/api/admin/testimonials', requireAuth, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
  const { name, role, institution, quote, outcome } = req.body || {};
  if (!name || !quote) {
    res.status(400).json({ error: 'Name and quote are required.' });
    return;
  }
  const testimonial = await mutateDb((db) => {
    const item = {
      id: `test-${crypto.randomUUID()}`,
      name: String(name).trim(),
      role: String(role || 'Student').trim(),
      institution: String(institution || 'Bangladesh').trim(),
      quote: String(quote).trim(),
      outcome: String(outcome || 'Verified Platform Learner').trim(),
    };
    db.testimonials.unshift(item);
    return item;
  });
  res.status(201).json({ testimonial });
});

app.delete('/api/admin/testimonials/:id', requireAuth, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
  await mutateDb((db) => {
    db.testimonials = db.testimonials.filter((t) => t.id !== req.params.id);
  });
  res.json({ ok: true });
});

// ---------- VITE / STATIC FRONTEND SERVING ----------
async function startServer() {
  if (!IS_PROD) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EduGenius AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start EduGenius AI server:', err);
  process.exit(1);
});
