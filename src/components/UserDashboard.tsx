import React, { useEffect, useState } from 'react';
import {
  Award,
  Bell,
  CheckCircle2,
  Copy,
  Gift,
  KeyRound,
  LogOut,
  Shield,
  Trophy,
  User as UserIcon,
  Wallet as WalletIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { SUPPORTED_SERVERS } from '../data/seedData';
import {
  claimDailyRewardAtomic,
  markNotificationRead,
  updateUserProfile,
} from '../services/firestoreService';
import { ActiveView, ServerRegion } from '../types';
import {
  formatBdt,
  formatTimestamp,
  getNextVipThreshold,
} from '../utils/helpers';

interface UserDashboardProps {
  onNavigate: (view: ActiveView) => void;
}

type DashTab = 'overview' | 'orders' | 'referrals' | 'notifications' | 'profile';

export function UserDashboard({ onNavigate }: UserDashboardProps) {
  const {
    firebaseUser,
    profile,
    privateInfo,
    wallet,
    isAdmin,
    changeUserPassword,
    logout,
  } = useAuth();
  const { orders, transactions, notifications, referrals, leaderboard } = useStore();

  const [tab, setTab] = useState<DashTab>('overview');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  // Profile form state
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [phone, setPhone] = useState('');
  const [savedPlayerUid, setSavedPlayerUid] = useState('');
  const [savedServer, setSavedServer] = useState<ServerRegion>('Bangladesh');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setPhotoURL(profile.photoURL || '');
    }
    if (privateInfo) {
      setPhone(privateInfo.phone || '');
      setSavedPlayerUid(privateInfo.savedPlayerUid || '');
      setSavedServer((privateInfo.savedServer as ServerRegion) || 'Bangladesh');
    }
  }, [profile, privateInfo]);

  if (!firebaseUser || !profile || !wallet) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center text-zinc-400">
        Loading your player dashboard...
      </div>
    );
  }

  const completedCount = orders.filter((o) => o.status === 'completed').length;
  const pendingCount = orders.filter((o) => o.status === 'pending' || o.status === 'processing').length;
  const nextTier = getNextVipThreshold(profile.vipTier);
  const progressPct = nextTier.next
    ? Math.min(100, Math.round((profile.rankPoints / nextTier.pointsNeeded) * 100))
    : 100;

  const todayKey = new Date().toISOString().slice(0, 10);
  const claimedToday = profile.lastDailyClaimAt?.slice(0, 10) === todayKey;

  const handleClaimDaily = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const pts = await claimDailyRewardAtomic(firebaseUser.uid, profile, wallet);
      setFeedback({ type: 'ok', text: `Claimed +${pts} Daily Check-In Rank & Loyalty Points.` });
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Claim failed.' });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      await updateUserProfile(firebaseUser.uid, {
        displayName,
        photoURL,
        phone,
        savedPlayerUid,
        savedServer,
      });
      setFeedback({ type: 'ok', text: 'Profile and saved Free Fire UID updated.' });
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Update failed.' });
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setFeedback({ type: 'err', text: 'Password must be at least 6 characters.' });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      await changeUserPassword(newPassword);
      setNewPassword('');
      setFeedback({ type: 'ok', text: 'Password updated successfully.' });
    } catch (err) {
      setFeedback({
        type: 'err',
        text:
          err instanceof Error
            ? err.message
            : 'Re-authenticate recently before changing password.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleCopyRef = () => {
    navigator.clipboard.writeText(profile.referralCode);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 1800);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header Banner */}
      <div className="surface-gold-edge rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {profile.photoURL ? (
            <img
              src={profile.photoURL}
              alt={profile.displayName}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-full object-cover border-2 border-[#D4AF37]"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#181B24] border-2 border-[#D4AF37]/60 flex items-center justify-center text-xl font-bold text-[#FDE68A]">
              {profile.displayName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-2xl font-bold text-white">{profile.displayName}</h1>
              <span className="text-xs font-semibold text-[#FDE68A]">
                · {profile.vipTier} VIP
              </span>
              {isAdmin && (
                <button
                  onClick={() => onNavigate('admin')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400 hover:underline cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Open Admin Panel
                </button>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {privateInfo?.email || firebaseUser.email} · Referral Code:{' '}
              <span className="font-mono-tabular text-zinc-200">{profile.referralCode}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => onNavigate('wallet')}
            className="btn-gold inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs cursor-pointer"
          >
            <WalletIcon className="w-4 h-4" />
            Add Money
          </button>
          <button
            onClick={() => logout()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/12 text-xs font-medium text-zinc-300 hover:text-white cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs ${
            feedback.type === 'ok'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              : 'bg-red-500/10 border-red-500/30 text-red-200'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(
          [
            { id: 'overview', label: 'Overview' },
            { id: 'orders', label: `Orders (${orders.length})` },
            { id: 'referrals', label: 'Referrals & Leaderboard' },
            {
              id: 'notifications',
              label: `Notifications (${notifications.filter((n) => !n.read).length})`,
            },
            { id: 'profile', label: 'Profile & Security' },
          ] as { id: DashTab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
              tab === t.id
                ? 'btn-gold'
                : 'bg-[#111318] border border-white/10 text-zinc-300 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="surface-glass rounded-xl p-5 space-y-1">
              <p className="text-xs text-zinc-400">Wallet Balance</p>
              <p className="font-mono-tabular text-2xl font-bold text-[#FDE68A]">
                {formatBdt(wallet.balance)}
              </p>
            </div>
            <div className="surface-glass rounded-xl p-5 space-y-1">
              <p className="text-xs text-zinc-400">Total Orders</p>
              <p className="font-mono-tabular text-2xl font-bold text-white">{orders.length}</p>
            </div>
            <div className="surface-glass rounded-xl p-5 space-y-1">
              <p className="text-xs text-zinc-400">Completed Orders</p>
              <p className="font-mono-tabular text-2xl font-bold text-emerald-400">
                {completedCount}
              </p>
            </div>
            <div className="surface-glass rounded-xl p-5 space-y-1">
              <p className="text-xs text-zinc-400">Pending / Processing</p>
              <p className="font-mono-tabular text-2xl font-bold text-sky-400">{pendingCount}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* VIP Progression */}
            <div className="surface-glass rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Award className="w-5 h-5 text-[#D4AF37]" />
                  <h2 className="font-display text-lg font-bold text-white">
                    VIP Tier · {profile.vipTier}
                  </h2>
                </div>
                <span className="font-mono-tabular text-sm font-semibold text-sky-400">
                  {profile.rankPoints} Rank Pts
                </span>
              </div>
              <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#D4AF37] to-[#38BDF8] rounded-full transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-xs text-zinc-400">
                {nextTier.next
                  ? `${Math.max(0, nextTier.pointsNeeded - profile.rankPoints)} more points to reach ${nextTier.next} VIP Tier.`
                  : 'Maximum Grandmaster VIP Tier unlocked.'}
              </p>
            </div>

            {/* Daily Check-In Reward */}
            <div className="surface-gold-edge rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[#FDE68A]">
                  <Gift className="w-5 h-5" />
                  <h2 className="font-display text-lg font-bold text-white">Daily Check-In</h2>
                </div>
                <p className="text-xs text-zinc-300">
                  Current Streak:{' '}
                  <span className="font-mono-tabular font-bold text-white">
                    {profile.dailyStreak} days
                  </span>{' '}
                  · Earn +25 Loyalty & Rank Points daily.
                </p>
              </div>
              <button
                type="button"
                disabled={claimedToday || busy}
                onClick={handleClaimDaily}
                className="btn-gold px-5 py-2.5 rounded-xl text-xs whitespace-nowrap shrink-0 cursor-pointer"
              >
                {claimedToday ? 'Claimed Today' : 'Claim +25 Points'}
              </button>
            </div>
          </div>

          {/* Active Promo Codes */}
          <div className="surface-glass rounded-2xl p-6 space-y-3">
            <h2 className="font-display text-base font-semibold text-white">
              Available Promo Codes
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#090A0D] border border-white/10 flex items-center justify-between">
                <div>
                  <p className="font-mono-tabular font-bold text-[#FDE68A]">FFZ10</p>
                  <p className="text-zinc-400">10% off up to ৳50 (Min order ৳100)</p>
                </div>
                <button
                  onClick={() => onNavigate('store')}
                  className="text-sky-400 hover:underline cursor-pointer"
                >
                  Use in Store
                </button>
              </div>
              <div className="p-3.5 rounded-xl bg-[#090A0D] border border-white/10 flex items-center justify-between">
                <div>
                  <p className="font-mono-tabular font-bold text-[#FDE68A]">BOOYAH25</p>
                  <p className="text-zinc-400">Flat ৳25 off (Min order ৳200)</p>
                </div>
                <button
                  onClick={() => onNavigate('store')}
                  className="text-sky-400 hover:underline cursor-pointer"
                >
                  Use in Store
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="surface-glass rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-white">Recent Orders</h2>
              <button
                onClick={() => onNavigate('track')}
                className="text-xs text-[#FDE68A] hover:underline cursor-pointer"
              >
                Full Tracker →
              </button>
            </div>
            {orders.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-400">No orders yet.</div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {orders.map((ord) => (
                  <div key={ord.id} className="px-6 py-3.5 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono-tabular text-sm font-semibold text-white">
                        {ord.orderCode} · {ord.productName}
                      </p>
                      <p className="text-xs text-zinc-400">
                        UID {ord.playerUid} · {formatTimestamp(ord.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono-tabular text-sm font-bold text-[#FDE68A]">
                        {formatBdt(ord.finalPrice)}
                      </p>
                      <p className="text-xs uppercase text-sky-400">{ord.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="surface-glass rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.08]">
              <h2 className="font-display text-base font-semibold text-white">
                Transaction History
              </h2>
            </div>
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-400">No transactions yet.</div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {transactions.map((tx) => (
                  <div key={tx.id} className="px-6 py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{tx.description}</p>
                      <p className="text-xs text-zinc-400">{formatTimestamp(tx.createdAt)}</p>
                    </div>
                    <span
                      className={`font-mono-tabular text-sm font-bold shrink-0 ${
                        tx.amount >= 0 ? 'text-emerald-400' : 'text-zinc-200'
                      }`}
                    >
                      {tx.amount >= 0 ? `+${tx.amount}` : tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'referrals' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-6">
            <div className="surface-gold-edge rounded-2xl p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-white">Your Referral Code</h2>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Share your referral code with squad members. You earn +50 Rank Points for every new
                player who registers with your code.
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-[#090A0D] border border-white/15 rounded-xl px-4 py-3 font-mono-tabular text-base font-bold text-[#FDE68A]">
                  {profile.referralCode}
                </div>
                <button
                  type="button"
                  onClick={handleCopyRef}
                  className="btn-gold inline-flex items-center gap-1.5 px-4 py-3 rounded-xl text-xs cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                  {copiedRef ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-zinc-400">
                Total Referred Players:{' '}
                <span className="font-mono-tabular text-white font-semibold">
                  {referrals.length}
                </span>
              </p>
            </div>

            <div className="surface-glass rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/[0.08]">
                <h3 className="font-display text-base font-semibold text-white">
                  Referred Players
                </h3>
              </div>
              {referrals.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-400">
                  No referrals recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-white/[0.06]">
                  {referrals.map((r) => (
                    <div key={r.id} className="px-6 py-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-white">{r.referredDisplayName}</p>
                        <p className="text-zinc-400">{formatTimestamp(r.createdAt)}</p>
                      </div>
                      <span className="font-mono-tabular text-emerald-400 font-semibold">
                        +{r.bonusPoints} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 surface-glass rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.08] flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#D4AF37]" />
              <h2 className="font-display text-base font-semibold text-white">
                Top Players & Referral Leaderboard
              </h2>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {leaderboard.map((entry, idx) => (
                <div
                  key={entry.uid}
                  className="px-6 py-3.5 flex items-center justify-between gap-4 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono-tabular w-6 text-xs font-bold text-[#D4AF37]">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-white">{entry.displayName}</p>
                      <p className="text-xs text-zinc-400">
                        {entry.vipTier} VIP · {entry.referralCount} Referrals
                      </p>
                    </div>
                  </div>
                  <span className="font-mono-tabular text-sm font-bold text-sky-400">
                    {entry.rankPoints} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'notifications' && (
        <div className="surface-glass rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.08] flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="font-display text-base font-semibold text-white">
              Notification Center
            </h2>
          </div>
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-400">No notifications yet.</div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-6 py-4 flex items-start justify-between gap-4 ${
                    n.read ? 'opacity-70' : 'bg-white/[0.02]'
                  }`}
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">{n.title}</p>
                    <p className="text-xs text-zinc-300">{n.message}</p>
                    <p className="text-xs text-zinc-500">
                      {n.category.toUpperCase()} · {formatTimestamp(n.createdAt)}
                    </p>
                  </div>
                  {!n.read ? (
                    <button
                      onClick={() => markNotificationRead(n.id)}
                      className="text-xs text-[#FDE68A] hover:underline shrink-0 cursor-pointer"
                    >
                      Mark Read
                    </button>
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <form onSubmit={handleSaveProfile} className="surface-glass rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-[#D4AF37]" />
              <h2 className="font-display text-lg font-bold text-white">
                Profile & Saved Game UID
              </h2>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[#090A0D] border border-white/12 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Profile Photo URL
              </label>
              <input
                type="url"
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                placeholder="https://..."
                className="w-full bg-[#090A0D] border border-white/12 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Phone Number (Private)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+8801XXXXXXXXX"
                className="w-full bg-[#090A0D] border border-white/12 rounded-xl px-4 py-2.5 text-sm font-mono-tabular text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Saved Free Fire UID
                </label>
                <input
                  type="text"
                  value={savedPlayerUid}
                  onChange={(e) => setSavedPlayerUid(e.target.value.replace(/\D/g, ''))}
                  placeholder="1849203841"
                  className="w-full bg-[#090A0D] border border-white/12 rounded-xl px-4 py-2.5 text-sm font-mono-tabular text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Default Server
                </label>
                <select
                  value={savedServer}
                  onChange={(e) => setSavedServer(e.target.value as ServerRegion)}
                  className="w-full bg-[#090A0D] border border-white/12 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                >
                  {SUPPORTED_SERVERS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="btn-gold px-5 py-2.5 rounded-xl text-xs cursor-pointer"
            >
              Save Profile Changes
            </button>
          </form>

          <form onSubmit={handlePasswordChange} className="surface-glass rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#D4AF37]" />
              <h2 className="font-display text-lg font-bold text-white">Change Password</h2>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Update your account password (applies to Email/Password accounts; Google-only accounts
              manage credentials via Google).
            </p>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                New Password
              </label>
              <input
                type="password"
                minLength={6}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full bg-[#090A0D] border border-white/12 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2.5 rounded-xl border border-[#D4AF37]/40 text-xs font-semibold text-[#FDE68A] hover:bg-[#D4AF37]/10 cursor-pointer"
            >
              Update Password
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
