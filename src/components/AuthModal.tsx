import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, Mail, User as UserIcon, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BRAND_BANNER_URL } from '../data/seedData';
import { AuthModalMode } from '../types';

interface AuthModalProps {
  mode: AuthModalMode;
  onClose: () => void;
  onSwitchMode: (mode: AuthModalMode) => void;
}

export function AuthModal({ mode, onClose, onSwitchMode }: AuthModalProps) {
  const { signInWithGoogle, loginWithEmail, registerWithEmail, sendResetEmail } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!mode) return null;

  const formatAuthError = (err: unknown): string => {
    const raw = err instanceof Error ? err.message : String(err);
    if (raw.includes('auth/operation-not-allowed')) {
      return 'Email/Password sign-in is not yet enabled in the Firebase Console (Authentication → Sign-in method → Email/Password). Use "Continue with Google" below for instant verified access, or enable Email/Password in Firebase Console.';
    }
    if (raw.includes('auth/invalid-credential') || raw.includes('auth/wrong-password')) {
      return 'Invalid email or password. Please verify your credentials.';
    }
    if (raw.includes('auth/email-already-in-use')) {
      return 'An account with this email already exists. Try signing in instead.';
    }
    if (raw.includes('auth/weak-password')) {
      return 'Password must be at least 6 characters long.';
    }
    if (raw.includes('auth/popup-closed-by-user')) {
      return 'Google sign-in popup was closed before completing.';
    }
    return raw;
  };

  const handleGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle(referralCode);
      onClose();
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
        onClose();
      } else if (mode === 'register') {
        if (!name.trim()) throw new Error('Please enter your display name.');
        await registerWithEmail({ name, email, password, referralCode });
        setNotice(
          'Account created and verification email sent. Please check your inbox and verify your email before placing orders.'
        );
      } else if (mode === 'forgot') {
        await sendResetEmail(email);
        setNotice('Password reset instructions have been sent to your email address.');
      }
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md surface-gold-edge rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <img
              src={BRAND_BANNER_URL}
              alt="FFZONEX"
              referrerPolicy="no-referrer"
              className="h-8 w-12 rounded object-cover border border-[#D4AF37]/40"
            />
            <h2 className="font-display text-lg font-bold text-white">
              {mode === 'login' && 'Sign In to FFZONEX'}
              {mode === 'register' && 'Create FFZONEX Account'}
              {mode === 'forgot' && 'Reset Password'}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-200 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {notice && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 leading-relaxed">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{notice}</span>
            </div>
          )}

          {mode !== 'forgot' && (
            <>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={busy}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white text-zinc-950 font-semibold text-sm hover:bg-zinc-100 transition-colors cursor-pointer disabled:opacity-60"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.39 0 3.41 2.69 1.52 6.6l3.68 2.85C6.07 6.84 8.79 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.51-1.14 2.79-2.4 3.65l3.71 2.88c2.17-2 3.71-4.94 3.71-8.77z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.2 14.55c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09L1.52 7.52C.55 9.46 0 11.67 0 14s.55 4.54 1.52 6.48l3.68-2.93z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.71-2.88c-1.08.72-2.45 1.16-4.22 1.16-3.21 0-5.93-1.84-6.8-4.45l-3.68 2.93C3.41 21.31 7.39 24 12 24z"
                  />
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3 text-xs text-zinc-500">
                <div className="h-px flex-1 bg-white/10" />
                <span>or use email</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Player / Display Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Tanvir Gaming"
                    className="w-full bg-[#090A0D] border border-white/12 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="player@example.com"
                  className="w-full bg-[#090A0D] border border-white/12 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-zinc-300">Password</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => onSwitchMode('forgot')}
                      className="text-xs text-[#D4AF37] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full bg-[#090A0D] border border-white/12 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Referral Code (Optional)
                </label>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="e.g., FFZ82K91A"
                  className="w-full bg-[#090A0D] border border-white/12 rounded-xl px-4 py-2.5 text-sm font-mono-tabular text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full btn-gold py-3 rounded-xl text-sm font-semibold cursor-pointer"
            >
              {busy
                ? 'Processing...'
                : mode === 'login'
                ? 'Sign In'
                : mode === 'register'
                ? 'Create Account'
                : 'Send Reset Link'}
            </button>
          </form>

          <div className="pt-2 border-t border-white/[0.08] text-center text-xs text-zinc-400">
            {mode === 'login' && (
              <>
                New to FFZONEX?{' '}
                <button
                  onClick={() => onSwitchMode('register')}
                  className="text-[#FDE68A] font-semibold hover:underline cursor-pointer"
                >
                  Create an account
                </button>
              </>
            )}
            {mode === 'register' && (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => onSwitchMode('login')}
                  className="text-[#FDE68A] font-semibold hover:underline cursor-pointer"
                >
                  Sign in here
                </button>
              </>
            )}
            {mode === 'forgot' && (
              <button
                onClick={() => onSwitchMode('login')}
                className="text-[#FDE68A] font-semibold hover:underline cursor-pointer"
              >
                Back to Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
