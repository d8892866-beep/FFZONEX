import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Copy,
  Gem,
  ShieldCheck,
  Tag,
  Wallet as WalletIcon,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { SUPPORTED_SERVERS } from '../data/seedData';
import { placeOrderAtomic, validateCouponCode } from '../services/firestoreService';
import { AuthModalMode, PaymentMethod, Product, ServerRegion } from '../types';
import { formatBdt, formatNumber } from '../utils/helpers';

interface OrderModalProps {
  product: Product | null;
  onClose: () => void;
  onOpenAuth: (mode: AuthModalMode) => void;
  onOrderCreated: (orderCode: string) => void;
  onGoToWallet: () => void;
}

export function OrderModal({
  product,
  onClose,
  onOpenAuth,
  onOrderCreated,
  onGoToWallet,
}: OrderModalProps) {
  const { firebaseUser, profile, privateInfo, wallet } = useAuth();
  const { settings } = useStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [playerUid, setPlayerUid] = useState('');
  const [serverRegion, setServerRegion] = useState<ServerRegion>('Bangladesh');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(
    null
  );
  const [couponError, setCouponError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wallet');
  const [paymentTrxId, setPaymentTrxId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedNum, setCopiedNum] = useState(false);

  useEffect(() => {
    if (product) {
      setStep(1);
      setPlayerUid(privateInfo?.savedPlayerUid || '');
      setServerRegion((privateInfo?.savedServer as ServerRegion) || 'Bangladesh');
      setCouponInput('');
      setAppliedCoupon(null);
      setCouponError(null);
      setPaymentMethod('wallet');
      setPaymentTrxId('');
      setError(null);
    }
  }, [product, privateInfo]);

  if (!product) return null;

  const finalPrice = Math.max(0, product.salePriceBdt - (appliedCoupon?.discount ?? 0));

  const getPaymentNumber = (m: PaymentMethod) => {
    if (m === 'bKash') return settings.bKashNumber;
    if (m === 'Nagad') return settings.nagadNumber;
    if (m === 'Rocket') return settings.rocketNumber;
    return '';
  };

  const handleApplyCoupon = async () => {
    setCouponError(null);
    if (!firebaseUser) {
      setCouponError('Please sign in first to validate promo codes.');
      return;
    }
    try {
      const res = await validateCouponCode(couponInput, product.salePriceBdt);
      setAppliedCoupon({ code: res.coupon.code, discount: res.discountAmount });
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError(err instanceof Error ? err.message : 'Invalid promo code');
    }
  };

  const handleCopyNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedNum(true);
    setTimeout(() => setCopiedNum(false), 1800);
  };

  const handleNextToVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const digits = playerUid.trim().replace(/\D/g, '');
    if (digits.length < 5 || digits.length > 20) {
      setError('Enter a valid numeric Free Fire Player UID (5 to 20 digits).');
      return;
    }
    setPlayerUid(digits);
    setStep(2);
  };

  const handleConfirmOrder = async () => {
    if (!firebaseUser || !profile || !wallet) {
      onOpenAuth('login');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { orderCode } = await placeOrderAtomic({
        user: firebaseUser,
        profile,
        wallet,
        product,
        playerUid,
        serverRegion,
        paymentMethod,
        paymentTrxId: paymentMethod !== 'wallet' ? paymentTrxId : undefined,
        couponCode: appliedCoupon?.code,
      });
      onOrderCreated(orderCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-xl surface-gold-edge rounded-2xl overflow-hidden shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <div>
            <p className="text-xs text-[#D4AF37] font-medium">
              Step {step} of 3 · {step === 1 ? 'Player Details' : step === 2 ? 'Verify Order' : 'Payment & Confirm'}
            </p>
            <h2 className="font-display text-lg font-bold text-white mt-0.5">{product.name}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close order modal"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Summary Strip */}
        <div className="px-6 py-3.5 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={product.imageUrl}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-sky-400">
                <Gem className="w-4 h-4 shrink-0" />
                <span className="font-mono-tabular truncate">
                  {formatNumber(product.diamonds)} Diamonds
                </span>
              </div>
              <p className="text-xs text-zinc-400 truncate">{product.category}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="font-mono-tabular text-lg font-bold text-[#FDE68A]">
              {formatBdt(finalPrice)}
            </p>
            {product.discountPercent > 0 && (
              <p className="font-mono-tabular text-xs text-zinc-500 line-through">
                {formatBdt(product.priceBdt)}
              </p>
            )}
          </div>
        </div>

        <div className="p-6 space-y-5">
          {!firebaseUser && (
            <div className="p-4 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-zinc-200 leading-relaxed">
                Sign in to place verified orders, apply promo codes, and track delivery in real time.
              </p>
              <button
                onClick={() => onOpenAuth('login')}
                className="btn-gold px-4 py-2 rounded-lg text-xs whitespace-nowrap shrink-0 cursor-pointer"
              >
                Sign In Now
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleNextToVerify} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Free Fire Player UID
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={playerUid}
                  onChange={(e) => setPlayerUid(e.target.value)}
                  placeholder="Enter numeric UID (e.g., 1849203841)"
                  className="w-full bg-[#090A0D] border border-white/12 rounded-xl px-4 py-3 text-sm font-mono-tabular text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                />
                <p className="mt-1.5 text-xs text-zinc-400">
                  Open Free Fire → Profile → Copy your numeric UID. Password is never required.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Supported Server / Region
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SUPPORTED_SERVERS.map((srv) => (
                    <button
                      type="button"
                      key={srv}
                      onClick={() => setServerRegion(srv)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                        serverRegion === srv
                          ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#FDE68A]'
                          : 'bg-[#090A0D] border-white/10 text-zinc-300 hover:border-white/25'
                      }`}
                    >
                      {srv}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="btn-gold inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm cursor-pointer"
                >
                  Verify Order Details
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="rounded-xl bg-[#090A0D] border border-white/10 divide-y divide-white/[0.06] text-sm">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-zinc-400">Package</span>
                  <span className="font-medium text-white">{product.name}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-zinc-400">Player UID</span>
                  <span className="font-mono-tabular font-semibold text-sky-400">{playerUid}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-zinc-400">Server Region</span>
                  <span className="font-medium text-zinc-200">{serverRegion}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-zinc-400">Package Price</span>
                  <span className="font-mono-tabular text-zinc-200">{formatBdt(product.salePriceBdt)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex items-center justify-between px-4 py-3 text-emerald-400">
                    <span>Promo ({appliedCoupon.code})</span>
                    <span className="font-mono-tabular">-{formatBdt(appliedCoupon.discount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-3.5 bg-white/[0.02]">
                  <span className="font-semibold text-white">Total Payable</span>
                  <span className="font-mono-tabular text-base font-bold text-[#FDE68A]">
                    {formatBdt(finalPrice)}
                  </span>
                </div>
              </div>

              {/* Coupon Input */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Promo / Discount Code
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Enter code (e.g., FFZ10)"
                      className="w-full bg-[#090A0D] border border-white/12 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono-tabular text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-4 py-2.5 rounded-xl border border-[#D4AF37]/40 text-xs font-semibold text-[#FDE68A] hover:bg-[#D4AF37]/10 cursor-pointer whitespace-nowrap"
                  >
                    Apply Code
                  </button>
                </div>
                {couponError && <p className="mt-1.5 text-xs text-red-400">{couponError}</p>}
                {appliedCoupon && (
                  <p className="mt-1.5 text-xs text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Coupon {appliedCoupon.code} applied ({formatBdt(appliedCoupon.discount)} discount)
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/12 text-xs font-medium text-zinc-300 hover:text-white cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Edit UID
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="btn-gold inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm cursor-pointer"
                >
                  Select Payment
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(['wallet', 'bKash', 'Nagad', 'Rocket'] as PaymentMethod[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`py-3 px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                      paymentMethod === m
                        ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#FDE68A]'
                        : 'bg-[#090A0D] border-white/10 text-zinc-300 hover:border-white/25'
                    }`}
                  >
                    {m === 'wallet' ? 'FFZONEX Wallet' : m}
                  </button>
                ))}
              </div>

              {paymentMethod === 'wallet' ? (
                <div className="p-4 rounded-xl bg-[#090A0D] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-xs text-zinc-400">
                      <WalletIcon className="w-4 h-4 text-[#D4AF37]" />
                      Available Wallet Balance
                    </span>
                    <span className="font-mono-tabular text-base font-bold text-white">
                      {formatBdt(wallet?.balance ?? 0)}
                    </span>
                  </div>
                  {(wallet?.balance ?? 0) < finalPrice ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
                      <p className="text-xs text-amber-300">
                        Balance is {formatBdt(finalPrice - (wallet?.balance ?? 0))} short for this order.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onGoToWallet();
                        }}
                        className="text-xs font-semibold text-[#FDE68A] hover:underline cursor-pointer whitespace-nowrap"
                      >
                        Add Money to Wallet →
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      Instant server-verified wallet deduction · +10 Rank Points awarded
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#090A0D] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs text-zinc-400">Send Money ({paymentMethod} Personal)</p>
                      <p className="font-mono-tabular text-base font-bold text-[#FDE68A] mt-0.5">
                        {getPaymentNumber(paymentMethod)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyNumber(getPaymentNumber(paymentMethod))}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 text-xs text-zinc-200 hover:bg-white/5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedNum ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Payment Transaction ID (TrxID)
                    </label>
                    <input
                      type="text"
                      value={paymentTrxId}
                      onChange={(e) => setPaymentTrxId(e.target.value.toUpperCase())}
                      placeholder="Enter TrxID after sending payment"
                      className="w-full bg-[#111318] border border-white/12 rounded-xl px-4 py-2.5 text-sm font-mono-tabular text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                    />
                    <p className="mt-1.5 text-xs text-zinc-400">
                      Orders paid via manual TrxID stay Pending until verified by an admin.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/12 text-xs font-medium text-zinc-300 hover:text-white cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="button"
                  disabled={busy || !firebaseUser}
                  onClick={handleConfirmOrder}
                  className="btn-gold inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm cursor-pointer"
                >
                  {busy ? 'Confirming Order...' : `Confirm Purchase · ${formatBdt(finalPrice)}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
