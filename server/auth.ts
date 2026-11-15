import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { getDb, mutateDb } from './store.ts';
import type { UserRecord, UserRole } from './types.ts';

export interface AuthRequest extends Request {
  user?: UserRecord;
  sessionToken?: string;
}

const loginAttempts = new Map<string, number[]>();
const RATE_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export function hashPassword(password: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const computed = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, 'hex');
  if (computed.length !== expected.length) return false;
  return crypto.timingSafeEqual(computed, expected);
}

export function sanitizeUser(user: UserRecord) {
  return {
    id: user.id,
    fullName: user.fullName,
    displayName: user.displayName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    educationLevel: user.educationLevel,
    address: user.address,
    status: user.status,
    emailVerified: user.emailVerified,
    educatorVerified: user.educatorVerified,
    leaderboardPublic: user.leaderboardPublic,
    learningMinutes: user.learningMinutes,
    aiPreferences: user.aiPreferences,
    createdAt: user.createdAt,
  };
}

export function checkLoginRateLimit(key: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const recent = (loginAttempts.get(key) || []).filter((ts) => now - ts < RATE_WINDOW_MS);
  if (recent.length >= MAX_ATTEMPTS) {
    const oldest = recent[0];
    const retryAfterSec = Math.ceil((RATE_WINDOW_MS - (now - oldest)) / 1000);
    loginAttempts.set(key, recent);
    return { allowed: false, retryAfterSec };
  }
  loginAttempts.set(key, recent);
  return { allowed: true, retryAfterSec: 0 };
}

export function recordFailedLogin(key: string): void {
  const now = Date.now();
  const recent = (loginAttempts.get(key) || []).filter((ts) => now - ts < RATE_WINDOW_MS);
  recent.push(now);
  loginAttempts.set(key, recent);
}

export function clearFailedLogins(key: string): void {
  loginAttempts.delete(key);
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const map: Record<string, string> = {};
  if (!cookieHeader) return map;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) {
      const k = part.slice(0, idx).trim();
      const v = part.slice(idx + 1).trim();
      map[k] = decodeURIComponent(v);
    }
  }
  return map;
}

export function extractSessionToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies.eg_session || null;
}

export async function attachUserIfPresent(req: AuthRequest): Promise<void> {
  const token = extractSessionToken(req);
  if (!token) return;
  const db = await getDb();
  const now = Date.now();
  const session = db.sessions.find((s) => s.token === token && s.expiresAt > now);
  if (!session) return;
  const user = db.users.find((u) => u.id === session.userId);
  if (user && user.status === 'ACTIVE') {
    req.user = user;
    req.sessionToken = token;
  }
}

export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    await attachUserIfPresent(req);
  } catch (err) {
    console.error('Optional auth lookup error:', err);
  }
  next();
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await attachUserIfPresent(req);
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required. Please sign in to continue.' });
      return;
    }
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Authentication verification failed.' });
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Access denied for your current role.' });
      return;
    }
    next();
  };
}

export async function logActivity(actorId: string, actorName: string, action: string, target: string): Promise<void> {
  await mutateDb((db) => {
    db.activityLogs.unshift({
      id: `act-${crypto.randomUUID()}`,
      actorId,
      actorName,
      action,
      target,
      createdAt: new Date().toISOString(),
    });
    if (db.activityLogs.length > 200) {
      db.activityLogs = db.activityLogs.slice(0, 200);
    }
  });
}
