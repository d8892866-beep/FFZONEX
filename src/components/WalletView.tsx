import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  Upload,
  Wallet as WalletIcon,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { submitDepositAtomic } from '../services/firestoreService';
import { AuthModalMode, DepositMethod } from '../types';
import { compressImageToDataUrl, formatBdt, formatTimestamp } from '../utils/helpers';

interface WalletViewProps {
  onOpenAuth: (mode: AuthModalMode) => void;
}

export function WalletView({ onOpenAuth }: WalletViewProps) {
  const { firebaseUser, profile, wallet } = useAuth();
  const { settings, deposits, transactions } = useStore();

  const [method, setMethod] = useState<DepositMethod>('bKash');
  const [amount, setAmount] = useState('500');
  const [senderNumber, setSenderNumber] = useState('');
  const [trxId, setTrxId] = useState('');
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string>('');
  const [screenshotName, setScreenshotName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const activeNumber =
    method === 'bKash'
      ? settings.bKashNumber
      : method === 'Nagad'
      ? settings.nagadNumber
      : settings.rocketNumber;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageToDataUrl(file);
      setScreenshotDataUrl(compressed);
      setScreenshotName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid screenshot image.');
    }
  };

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !profile) {
      onOpenAuth('login');
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      await submitDepositAtomic({
        user: firebaseUser,
        profile,
        method,
        amount: Number(amount),
        senderNumber,
        trxId,
        screenshotDataUrl: screenshotDataUrl || undefined,
      });
      setSuccess(
        `Deposit request submitted for ${formatBdt(Number(amount))} via ${method}. An admin will verify your TrxID shortly.`
      );
      setSenderNumber('');
      setTrxId('');
      setScreenshotDataUrl('');
      setScreenshotName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit deposit.');
    } finally {
      setBusy(false);
    }
  };

  if (!firebaseUser) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <div className="surface-gold-edge rounded-2xl p-10 text-center space-y-4">
          <WalletIcon className="w-10 h-10 text-[#D4AF37] mx-auto" />
          <h1 className="font-display text-2xl font-bold text-white">FFZONEX Digital Wallet</h1>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            Sign in to deposit BDT via bKash, Nagad, or Rocket, review transaction ledgers, and
            enjoy one-click diamond checkouts.
          </p>
          <button
            onClick={() => onOpenAuth('login')}
            className="btn-gold px-6 py-3 rounded-xl text-sm cursor-pointer"
          >
            Sign In to Access Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Wallet & Deposits</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Manual deposits are verified by admins before wallet balances are credited.
        </p>
      </div>

      {/* Wallet KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="surface-gold-edge rounded-xl p-5 space-y-1">
          <p className="text-xs text-zinc-400">Available Balance</p>
          <p className="font-mono-tabular text-2xl font-bold text-[#FDE68A]">
            {formatBdt(wallet?.balance ?? 0)}
          </p>
        </div>
        <div className="surface-glass rounded-xl p-5 space-y-1">
          <p className="text-xs text-zinc-400">Loyalty Reward Points</p>
          <p className="font-mono-tabular text-2xl font-bold text-sky-400">
            {(wallet?.rewardPoints ?? 0).toLocaleString()} pts
          </p>
        </div>
        <div className="surface-glass rounded-xl p-5 space-y-1">
          <p className="text-xs text-zinc-400">Total Verified Deposits</p>
          <p className="font-mono-tabular text-2xl font-bold text-white">
            {formatBdt(wallet?.totalDeposited ?? 0)}
          </p>
        </div>
        <div className="surface-glass rounded-xl p-5 space-y-1">
          <p className="text-xs text-zinc-400">Total Wallet Spend</p>
          <p className="font-mono-tabular text-2xl font-bold text-zinc-200">
            {formatBdt(wallet?.totalSpent ?? 0)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Add Money Form */}
        <form
          onSubmit={handleSubmitDeposit}
          className="lg:col-span-5 surface-gold-edge rounded-2xl p-6 space-y-5"
        >
          <h2 className="font-display text-xl font-bold text-white">Add Money to Wallet</h2>

          <div className="grid grid-cols-3 gap-2.5">
            {(['bKash', 'Nagad', 'Rocket'] as DepositMethod[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  method === m
                    ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#FDE68A]'
                    : 'bg-[#090A0D] border-white/10 text-zinc-300 hover:border-white/25'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-[#090A0D] border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-zinc-400">Official {method} Send Money Number</p>
                <p className="font-mono-tabular text-lg font-bold text-[#FDE68A] mt-0.5">
                  {activeNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 text-xs text-zinc-200 hover:bg-white/5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <ol className="text-xs text-zinc-400 space-y-1 list-decimal list-inside">
              <li>Open your {method} app and choose Send Money.</li>
              <li>Transfer the exact BDT amount to {activeNumber}.</li>
              <li>Copy the Transaction ID (TrxID) and upload screenshot below.</li>
            </ol>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Amount (BDT)
              </label>
              <input
                type="number"
                min={10}
                max={100000}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-[#090A0D] border border-white/12 rounded-xl px-4 py-2.5 text-sm font-mono-tabular text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Sender Number
              </label>
              <input
                type="tel"
                required
                value={senderNumber}
                onChange={(e) => setSenderNumber(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full bg-[#090A0D] border border-white/12 rounded-xl px-4 py-2.5 text-sm font-mono-tabular text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Transaction ID (TrxID)
            </label>
            <input
              type="text"
              required
              value={trxId}
              onChange={(e) => setTrxId(e.target.value.toUpperCase())}
              placeholder="e.g., BKH8A92F10"
              className="w-full bg-[#090A0D] border border-white/12 rounded-xl px-4 py-2.5 text-sm font-mono-tabular text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Payment Screenshot (JPG / PNG / WebP)
            </label>
            <label className="flex items-center justify-center gap-2.5 w-full py-3 px-4 rounded-xl border border-dashed border-white/20 bg-[#090A0D] hover:border-[#D4AF37]/60 text-xs text-zinc-300 cursor-pointer">
              <Upload className="w-4 h-4 text-[#D4AF37]" />
              <span>{screenshotName || 'Choose payment screenshot'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {screenshotDataUrl && (
              <div className="mt-2.5 rounded-lg overflow-hidden border border-white/10 max-h-40">
                <img
                  src={screenshotDataUrl}
                  alt="Deposit screenshot preview"
                  className="w-full h-36 object-contain bg-black"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full btn-gold py-3 rounded-xl text-sm font-semibold cursor-pointer"
          >
            {busy ? 'Submitting Deposit...' : 'Submit Deposit for Verification'}
          </button>
        </form>

        {/* Deposit History & Wallet Ledger */}
        <div className="lg:col-span-7 space-y-6">
          <div className="surface-glass rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.08]">
              <h2 className="font-display text-base font-semibold text-white">
                Deposit Requests ({deposits.length})
              </h2>
            </div>
            {deposits.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-400">
                No deposits submitted yet.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {deposits.map((dep) => (
                  <div
                    key={dep.id}
                    className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-white">{dep.method}</span>
                        <span className="text-zinc-500">·</span>
                        <span className="font-mono-tabular text-zinc-300">{dep.trxId}</span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        From {dep.senderNumber} · {formatTimestamp(dep.createdAt)}
                      </p>
                      {dep.adminNote && (
                        <p className="text-xs text-zinc-300">Note: {dep.adminNote}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <span className="font-mono-tabular text-sm font-bold text-[#FDE68A]">
                        {formatBdt(dep.amount)}
                      </span>
                      {dep.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                        </span>
                      )}
                      {dep.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#FDE68A]">
                          <Clock className="w-3.5 h-3.5" /> Pending
                        </span>
                      )}
                      {dep.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-400">
                          <XCircle className="w-3.5 h-3.5" /> Rejected
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="surface-glass rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.08]">
              <h2 className="font-display text-base font-semibold text-white">
                Wallet Transaction Ledger ({transactions.length})
              </h2>
            </div>
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-400">
                No wallet transactions recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="px-6 py-3.5 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{tx.description}</p>
                      <p className="text-xs text-zinc-400">
                        {tx.type.toUpperCase()} · {formatTimestamp(tx.createdAt)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`font-mono-tabular text-sm font-bold ${
                          tx.amount >= 0 ? 'text-emerald-400' : 'text-zinc-200'
                        }`}
                      >
                        {tx.amount >= 0 ? `+${formatBdt(tx.amount)}` : formatBdt(tx.amount)}
                      </p>
                      <p className="font-mono-tabular text-xs text-zinc-500">
                        Bal: {formatBdt(tx.balanceAfter)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
