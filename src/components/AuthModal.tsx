import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, KeyRound, ShieldCheck, X } from 'lucide-react';
import { apiRequest, setStoredToken } from '../lib/api';
import { EDUCATION_LEVELS, type EducationLevel, type User } from '../types';
import { Logo } from './Logo';

interface AuthModalProps {
  open: boolean;
  initialTab: 'login' | 'register' | 'forgot' | 'admin-setup';
  needsAdminSetup: boolean;
  onClose: () => void;
  onAuthenticated: (user: User, verificationPreviewCode?: string) => void;
}

export function AuthModal({
  open,
  initialTab,
  needsAdminSetup,
  onClose,
  onAuthenticated,
}: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'register' | 'forgot' | 'admin-setup'>(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Register state
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [educationLevel, setEducationLevel] = useState<EducationLevel>('Higher Secondary (HSC)');
  const [role, setRole] = useState<'STUDENT' | 'EDUCATOR'>('STUDENT');

  // Forgot / Reset state
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetRequested, setResetRequested] = useState(false);

  // Super Admin One-Time Bootstrap state
  const [adminName, setAdminName] = useState('Website Administrator');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminAddress, setAdminAddress] = useState('Gaibandha Circular Road, Gaibandha, Bangladesh.');

  if (!open) return null;

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);
    try {
      const data = await apiRequest<{ user: User; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, password: loginPassword, rememberMe }),
      });
      setStoredToken(data.token, rememberMe);
      onAuthenticated(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    if (regPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest<{ user: User; token: string; verificationPreviewCode?: string }>(
        '/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({
            fullName,
            email: regEmail,
            phone,
            password: regPassword,
            confirmPassword,
            educationLevel,
            role,
          }),
        }
      );
      setStoredToken(data.token, false);
      onAuthenticated(data.user, data.verificationPreviewCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);
    try {
      const data = await apiRequest<{ message: string; resetPreviewCode?: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: forgotEmail }),
      });
      setResetRequested(true);
      setInfoMessage(
        data.resetPreviewCode
          ? `${data.message} Verification code: ${data.resetPreviewCode}`
          : data.message
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not request password reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiRequest<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email: forgotEmail, code: resetCode, newPassword }),
      });
      setInfoMessage(data.message);
      setResetRequested(false);
      setTab('login');
      setLoginEmail(forgotEmail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSetup = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiRequest<{ user: User; token: string }>('/api/admin/bootstrap', {
        method: 'POST',
        body: JSON.stringify({
          fullName: adminName,
          email: adminEmail,
          password: adminPassword,
          address: adminAddress,
        }),
      });
      setStoredToken(data.token, true);
      onAuthenticated(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin setup failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E1B4B]/60 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Account Authentication"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white border border-[#1E1B4B]/10 shadow-2xl p-6 sm:p-8 my-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg text-[#1E1B4B]/60 hover:text-[#1E1B4B] hover:bg-[#1E1B4B]/5 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <Logo size="md" showTagline />
        </div>

        {/* Mode Switcher */}
        {tab !== 'forgot' && tab !== 'admin-setup' && (
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#F8FAFC] border border-[#1E1B4B]/10 mb-6">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setError('');
              }}
              className={`py-2 text-sm font-semibold rounded-lg transition-colors ${
                tab === 'login' ? 'bg-white text-[#1E1B4B] shadow-sm' : 'text-[#1E1B4B]/60 hover:text-[#1E1B4B]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setError('');
              }}
              className={`py-2 text-sm font-semibold rounded-lg transition-colors ${
                tab === 'register' ? 'bg-white text-[#1E1B4B] shadow-sm' : 'text-[#1E1B4B]/60 hover:text-[#1E1B4B]'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl bg-[#1E1B4B]/5 border border-[#1E1B4B]/20 px-4 py-3 text-sm text-[#1E1B4B]">
            {error}
          </div>
        )}
        {infoMessage && (
          <div className="mb-4 rounded-xl bg-[#10B981]/10 border border-[#10B981]/30 px-4 py-3 text-sm text-[#1E1B4B]">
            {infoMessage}
          </div>
        )}

        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-[#1E1B4B] focus:outline-none focus:border-[#4338CA]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3.5 py-2.5 pr-10 text-sm text-[#1E1B4B] focus:outline-none focus:border-[#4338CA]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1E1B4B]/50 hover:text-[#1E1B4B]"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="inline-flex items-center gap-2 text-[#1E1B4B]/75 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#1E1B4B]/30 text-[#4338CA]"
                />
                <span>Remember me for 30 days</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setTab('forgot');
                  setForgotEmail(loginEmail);
                  setError('');
                }}
                className="font-semibold text-[#4338CA] hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#4338CA] hover:bg-[#1E1B4B] text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In to EduGenius AI'}
            </button>

            {needsAdminSetup && (
              <div className="pt-4 mt-4 border-t border-[#1E1B4B]/10 flex items-center justify-between text-xs text-[#1E1B4B]/70">
                <span>Initial installation detected (no Super Admin configured yet).</span>
                <button
                  type="button"
                  onClick={() => {
                    setTab('admin-setup');
                    setError('');
                  }}
                  className="font-semibold text-[#7C3AED] hover:underline whitespace-nowrap shrink-0"
                >
                  Setup Super Admin
                </button>
              </div>
            )}
          </form>
        )}

        {tab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('STUDENT')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-colors ${
                  role === 'STUDENT'
                    ? 'border-[#4338CA] bg-[#4338CA]/8 text-[#4338CA]'
                    : 'border-[#1E1B4B]/15 text-[#1E1B4B]/70'
                }`}
              >
                Register as Student
              </button>
              <button
                type="button"
                onClick={() => setRole('EDUCATOR')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-colors ${
                  role === 'EDUCATOR'
                    ? 'border-[#7C3AED] bg-[#7C3AED]/8 text-[#7C3AED]'
                    : 'border-[#1E1B4B]/15 text-[#1E1B4B]/70'
                }`}
              >
                Register as Educator
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ariful Islam"
                  className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-sm text-[#1E1B4B] focus:outline-none focus:border-[#4338CA]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+880 17XX-XXXXXX"
                  className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-sm text-[#1E1B4B] focus:outline-none focus:border-[#4338CA]"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-sm text-[#1E1B4B] focus:outline-none focus:border-[#4338CA]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1">Education Level</label>
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

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-sm text-[#1E1B4B] focus:outline-none focus:border-[#4338CA]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1">Confirm Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-sm text-[#1E1B4B] focus:outline-none focus:border-[#4338CA]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#4338CA] hover:bg-[#1E1B4B] text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {loading ? 'Creating account...' : `Create ${role === 'EDUCATOR' ? 'Educator' : 'Student'} Account`}
            </button>
          </form>
        )}

        {tab === 'forgot' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[#1E1B4B] font-semibold text-base">
              <KeyRound className="w-5 h-5 text-[#4338CA]" />
              <span>Reset Your Password</span>
            </div>
            {!resetRequested ? (
              <form onSubmit={handleRequestReset} className="space-y-3">
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Enter your registered email"
                  className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-[#1E1B4B]"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#4338CA] text-white text-sm font-semibold"
                >
                  {loading ? 'Sending...' : 'Request Reset Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleConfirmReset} className="space-y-3">
                <input
                  type="text"
                  required
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  placeholder="6-digit reset code"
                  className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-[#1E1B4B]"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (6+ characters)"
                  className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-[#1E1B4B]"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#4338CA] text-white text-sm font-semibold"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            )}
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setError('');
              }}
              className="text-xs font-semibold text-[#4338CA] hover:underline"
            >
              Back to Sign In
            </button>
          </div>
        )}

        {tab === 'admin-setup' && needsAdminSetup && (
          <form onSubmit={handleAdminSetup} className="space-y-3.5">
            <div className="flex items-center gap-2 text-[#1E1B4B] font-bold text-base">
              <ShieldCheck className="w-5 h-5 text-[#7C3AED]" />
              <span>First-Time Super Admin Installation</span>
            </div>
            <p className="text-xs text-[#1E1B4B]/70 leading-relaxed">
              Create the primary Super Admin account for EduGenius AI. This setup lock permanently disables itself once completed.
            </p>
            <div>
              <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1">Administrator Name</label>
              <input
                type="text"
                required
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-sm text-[#1E1B4B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1">Admin Email</label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@edugenius.ai"
                className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-sm text-[#1E1B4B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1">Secure Admin Password (8+ chars)</label>
              <input
                type="password"
                required
                minLength={8}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Choose a strong password"
                className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-sm text-[#1E1B4B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E1B4B]/80 mb-1">Official Address</label>
              <input
                type="text"
                required
                value={adminAddress}
                onChange={(e) => setAdminAddress(e.target.value)}
                className="w-full rounded-xl border border-[#1E1B4B]/15 bg-[#F8FAFC] px-3 py-2 text-sm text-[#1E1B4B]"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setTab('login')}
                className="text-xs font-semibold text-[#1E1B4B]/70 hover:text-[#1E1B4B]"
              >
                Back to Sign In
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#1E1B4B] text-white text-sm font-semibold transition-colors"
              >
                {loading ? 'Provisioning...' : 'Complete Super Admin Setup'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
