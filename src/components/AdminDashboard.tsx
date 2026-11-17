import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  limit,
  onSnapshot,
  query,
  Timestamp,
} from 'firebase/firestore';
import {
  BarChart3,
  Check,
  Eye,
  Plus,
  Search,
  Shield,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { PRODUCT_IMAGES } from '../data/seedData';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  adminAddRoleUser,
  adminDeleteProduct,
  adminReviewDepositAtomic,
  adminSaveCategory,
  adminSaveCoupon,
  adminSaveProduct,
  adminSaveStoreSettings,
  adminToggleUserBlock,
  adminUpdateOrderStatusAtomic,
  adminUpdateUserDetails,
  replySupportTicket,
} from '../services/firestoreService';
import {
  AdminRole,
  AdminUser,
  AuditLog,
  Coupon,
  Deposit,
  Order,
  OrderStatus,
  Product,
  StoreSettings,
  SupportTicket,
  TicketStatus,
  UserProfile,
  Wallet,
  WalletTransaction,
} from '../types';
import { formatBdt, formatTimestamp } from '../utils/helpers';

type AdminTab =
  | 'overview'
  | 'orders'
  | 'deposits'
  | 'products'
  | 'users'
  | 'marketing'
  | 'website'
  | 'support';

function sortCreatedDesc<T extends { createdAt?: Timestamp }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => {
    const ta = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
    const tb = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
    return tb - ta;
  });
}

export function AdminDashboard() {
  const { firebaseUser, isAdmin } = useAuth();
  const { settings, categories, products } = useStore();

  const [tab, setTab] = useState<AdminTab>('overview');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allWallets, setAllWallets] = useState<Record<string, Wallet>>({});
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [allDeposits, setAllDeposits] = useState<Deposit[]>([]);
  const [allTx, setAllTx] = useState<WalletTransaction[]>([]);
  const [allCoupons, setAllCoupons] = useState<Coupon[]>([]);
  const [allTickets, setAllTickets] = useState<SupportTicket[]>([]);
  const [allAdmins, setAllAdmins] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [notice, setNotice] = useState<string | null>(null);
  const [errNotice, setErrNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Filters
  const [orderSearch, setOrderSearch] = useState('');
  const [orderDateFilter, setOrderDateFilter] = useState('');
  const [orderNoteDrafts, setOrderNoteDrafts] = useState<Record<string, string>>({});
  const [userSearch, setUserSearch] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [previewScreenshot, setPreviewScreenshot] = useState<string | null>(null);
  const [depositNoteDrafts, setDepositNoteDrafts] = useState<Record<string, string>>({});

  // Product Form
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');

  // Coupon Form
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState<'percent' | 'fixed'>('percent');
  const [couponVal, setCouponVal] = useState('10');
  const [couponMin, setCouponMin] = useState('100');
  const [couponMax, setCouponMax] = useState('50');
  const [couponLimit, setCouponLimit] = useState('100');

  // Website Settings Form
  const [settingsDraft, setSettingsDraft] = useState<StoreSettings>(settings);
  const [newFaqQ, setNewFaqQ] = useState('');
  const [newFaqA, setNewFaqA] = useState('');

  // Support reply
  const [ticketReplyDrafts, setTicketReplyDrafts] = useState<Record<string, string>>({});

  // Add Admin User
  const [newAdminUid, setNewAdminUid] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<AdminRole>('manager');

  useEffect(() => {
    setSettingsDraft(settings);
  }, [settings]);

  useEffect(() => {
    if (!isAdmin || !firebaseUser) return;

    const u1 = onSnapshot(
      collection(db, 'users'),
      (s) => setAllUsers(sortCreatedDesc(s.docs.map((d) => d.data() as UserProfile))),
      (e) => handleFirestoreError(e, OperationType.LIST, 'users')
    );

    const u2 = onSnapshot(
      collection(db, 'wallets'),
      (s) => {
        const map: Record<string, Wallet> = {};
        s.docs.forEach((d) => {
          map[d.id] = d.data() as Wallet;
        });
        setAllWallets(map);
      },
      (e) => handleFirestoreError(e, OperationType.LIST, 'wallets')
    );

    const u3 = onSnapshot(
      collection(db, 'orders'),
      (s) =>
        setAllOrders(
          sortCreatedDesc(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, 'id'>) })))
        ),
      (e) => handleFirestoreError(e, OperationType.LIST, 'orders')
    );

    const u4 = onSnapshot(
      collection(db, 'deposits'),
      (s) =>
        setAllDeposits(
          sortCreatedDesc(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Deposit, 'id'>) })))
        ),
      (e) => handleFirestoreError(e, OperationType.LIST, 'deposits')
    );

    const u5 = onSnapshot(
      query(collection(db, 'transactions'), limit(100)),
      (s) =>
        setAllTx(
          sortCreatedDesc(
            s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WalletTransaction, 'id'>) }))
          )
        ),
      (e) => handleFirestoreError(e, OperationType.LIST, 'transactions')
    );

    const u6 = onSnapshot(
      collection(db, 'coupons'),
      (s) => setAllCoupons(s.docs.map((d) => d.data() as Coupon)),
      (e) => handleFirestoreError(e, OperationType.LIST, 'coupons')
    );

    const u7 = onSnapshot(
      collection(db, 'supportTickets'),
      (s) =>
        setAllTickets(
          sortCreatedDesc(
            s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SupportTicket, 'id'>) }))
          )
        ),
      (e) => handleFirestoreError(e, OperationType.LIST, 'supportTickets')
    );

    const u8 = onSnapshot(
      collection(db, 'adminUsers'),
      (s) => setAllAdmins(s.docs.map((d) => d.data() as AdminUser)),
      (e) => handleFirestoreError(e, OperationType.LIST, 'adminUsers')
    );

    const u9 = onSnapshot(
      query(collection(db, 'auditLogs'), limit(80)),
      (s) =>
        setAuditLogs(
          sortCreatedDesc(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AuditLog, 'id'>) })))
        ),
      (e) => handleFirestoreError(e, OperationType.LIST, 'auditLogs')
    );

    return () => {
      u1();
      u2();
      u3();
      u4();
      u5();
      u6();
      u7();
      u8();
      u9();
    };
  }, [isAdmin, firebaseUser]);

  // Analytics calculations
  const stats = useMemo(() => {
    const completedOrders = allOrders.filter((o) => o.status === 'completed');
    const pendingOrders = allOrders.filter(
      (o) => o.status === 'pending' || o.status === 'processing'
    );
    const totalRevenue = allOrders
      .filter((o) => o.status !== 'cancelled' && o.status !== 'refunded')
      .reduce((sum, o) => sum + o.finalPrice, 0);
    const totalDeposits = allDeposits
      .filter((d) => d.status === 'approved')
      .reduce((sum, d) => sum + d.amount, 0);

    // 7-day sales chart data
    const dailySeries: { label: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      const val = allOrders
        .filter((o) => o.status !== 'cancelled' && o.status !== 'refunded')
        .filter((o) => o.createdAt?.toDate().toISOString().slice(0, 10) === key)
        .reduce((sum, o) => sum + o.finalPrice, 0);
      dailySeries.push({ label, value: val });
    }

    // 6-month revenue chart data
    const monthlySeries: { label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short' });
      const val = allOrders
        .filter((o) => o.status !== 'cancelled' && o.status !== 'refunded')
        .filter((o) => o.createdAt?.toDate().toISOString().slice(0, 7) === ym)
        .reduce((sum, o) => sum + o.finalPrice, 0);
      monthlySeries.push({ label, value: val });
    }

    return {
      totalRevenue,
      totalUsers: allUsers.length,
      totalOrders: allOrders.length,
      pendingOrders: pendingOrders.length,
      completedOrders: completedOrders.length,
      totalDeposits,
      dailySeries,
      monthlySeries,
    };
  }, [allOrders, allDeposits, allUsers]);

  if (!isAdmin || !firebaseUser) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center space-y-3">
        <Shield className="w-10 h-10 text-red-400 mx-auto" />
        <h1 className="font-display text-2xl font-bold text-white">Protected Admin Route</h1>
        <p className="text-sm text-zinc-400">
          Verified administrator permissions are required to access FFZONEX operations.
        </p>
      </div>
    );
  }

  const runAction = async (fn: () => Promise<void>, okMsg: string) => {
    setBusy(true);
    setNotice(null);
    setErrNotice(null);
    try {
      await fn();
      setNotice(okMsg);
    } catch (err) {
      setErrNotice(err instanceof Error ? err.message : 'Operation failed.');
    } finally {
      setBusy(false);
    }
  };

  const filteredOrders = allOrders.filter((o) => {
    const q = orderSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      o.orderCode.toLowerCase().includes(q) ||
      o.playerUid.toLowerCase().includes(q) ||
      (o.userDisplayName || '').toLowerCase().includes(q);
    const matchesDate =
      !orderDateFilter ||
      o.createdAt?.toDate().toISOString().slice(0, 10) === orderDateFilter;
    return matchesSearch && matchesDate;
  });

  const filteredUsers = allUsers.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      u.displayName.toLowerCase().includes(q) ||
      u.uid.toLowerCase().includes(q) ||
      u.referralCode.toLowerCase().includes(q)
    );
  });

  const maxDaily = Math.max(100, ...stats.dailySeries.map((s) => s.value));
  const maxMonthly = Math.max(100, ...stats.monthlySeries.map((s) => s.value));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-sky-400">
            Role-Verified Console · {firebaseUser.email}
          </p>
          <h1 className="font-display text-3xl font-bold text-white mt-0.5">
            FFZONEX Admin Command Center
          </h1>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono-tabular text-zinc-300">
          <span>Pending Orders: {stats.pendingOrders}</span>
          <span>·</span>
          <span>
            Pending Deposits: {allDeposits.filter((d) => d.status === 'pending').length}
          </span>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200">
          {notice}
        </div>
      )}
      {errNotice && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-200">
          {errNotice}
        </div>
      )}

      {/* Admin Module Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(
          [
            { id: 'overview', label: 'Analytics' },
            { id: 'orders', label: `Orders (${allOrders.length})` },
            {
              id: 'deposits',
              label: `Deposits (${allDeposits.filter((d) => d.status === 'pending').length} pending)`,
            },
            { id: 'products', label: `Products (${products.length})` },
            { id: 'users', label: `Users (${allUsers.length})` },
            { id: 'marketing', label: 'Marketing & Coupons' },
            { id: 'website', label: 'Website Settings' },
            { id: 'support', label: `Support & Logs (${allTickets.length})` },
          ] as { id: AdminTab; label: string }[]
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

      {/* OVERVIEW & CHARTS */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {[
              { label: 'Total Revenue', val: formatBdt(stats.totalRevenue), color: 'text-[#FDE68A]' },
              { label: 'Total Users', val: String(stats.totalUsers), color: 'text-white' },
              { label: 'Total Orders', val: String(stats.totalOrders), color: 'text-white' },
              { label: 'Pending Orders', val: String(stats.pendingOrders), color: 'text-sky-400' },
              {
                label: 'Completed Orders',
                val: String(stats.completedOrders),
                color: 'text-emerald-400',
              },
              {
                label: 'Verified Deposits',
                val: formatBdt(stats.totalDeposits),
                color: 'text-[#FDE68A]',
              },
            ].map((k) => (
              <div key={k.label} className="surface-glass rounded-xl p-4 space-y-1">
                <p className="text-xs text-zinc-400">{k.label}</p>
                <p className={`font-mono-tabular text-xl font-bold ${k.color}`}>{k.val}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Sales Chart */}
            <div className="surface-glass rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#D4AF37]" />
                <h2 className="font-display text-base font-semibold text-white">
                  Daily Sales (Last 7 Days)
                </h2>
              </div>
              <div className="h-48 flex items-end gap-3 pt-4">
                {stats.dailySeries.map((bar) => {
                  const heightPct = Math.max(4, Math.round((bar.value / maxDaily) * 100));
                  return (
                    <div key={bar.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                      <span className="font-mono-tabular text-[10px] text-zinc-400">
                        {bar.value > 0 ? formatBdt(bar.value) : '—'}
                      </span>
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-[#B08D26] to-[#FDE68A]"
                        style={{ height: `${heightPct}%` }}
                      />
                      <span className="text-xs text-zinc-400">{bar.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Monthly Revenue Chart */}
            <div className="surface-glass rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-sky-400" />
                <h2 className="font-display text-base font-semibold text-white">
                  Monthly Revenue (Last 6 Months)
                </h2>
              </div>
              <div className="h-48 flex items-end gap-3 pt-4">
                {stats.monthlySeries.map((bar) => {
                  const heightPct = Math.max(4, Math.round((bar.value / maxMonthly) * 100));
                  return (
                    <div key={bar.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                      <span className="font-mono-tabular text-[10px] text-zinc-400">
                        {bar.value > 0 ? formatBdt(bar.value) : '—'}
                      </span>
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-sky-700 to-sky-400"
                        style={{ height: `${heightPct}%` }}
                      />
                      <span className="text-xs text-zinc-400">{bar.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="surface-glass rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.08]">
              <h2 className="font-display text-base font-semibold text-white">
                Recent Wallet Ledger Activity
              </h2>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {allTx.slice(0, 10).map((tx) => (
                <div key={tx.id} className="px-6 py-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="text-white font-medium">{tx.description}</p>
                    <p className="text-zinc-400">
                      User {tx.userId.slice(0, 8)} · {formatTimestamp(tx.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`font-mono-tabular font-bold ${
                      tx.amount >= 0 ? 'text-emerald-400' : 'text-zinc-200'
                    }`}
                  >
                    {tx.amount >= 0 ? `+${formatBdt(tx.amount)}` : formatBdt(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ORDERS MANAGEMENT */}
      {tab === 'orders' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search by Order ID, Player UID, or Player Name..."
                className="w-full bg-[#111318] border border-white/12 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <input
              type="date"
              value={orderDateFilter}
              onChange={(e) => setOrderDateFilter(e.target.value)}
              className="bg-[#111318] border border-white/12 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div className="surface-glass rounded-2xl overflow-hidden">
            <div className="divide-y divide-white/[0.06]">
              {filteredOrders.map((ord) => (
                <div key={ord.id} className="p-5 space-y-3">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-mono-tabular font-bold text-[#FDE68A]">
                          {ord.orderCode}
                        </span>
                        <span className="text-zinc-500">·</span>
                        <span className="font-semibold text-white">{ord.productName}</span>
                        <span className="text-zinc-500">·</span>
                        <span className="font-mono-tabular text-sky-400">
                          UID {ord.playerUid} ({ord.serverRegion})
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        User: {ord.userDisplayName || ord.userId} · Method: {ord.paymentMethod}{' '}
                        {ord.paymentTrxId ? `(${ord.paymentTrxId})` : ''} ·{' '}
                        {formatTimestamp(ord.createdAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono-tabular text-sm font-bold text-white mr-2">
                        {formatBdt(ord.finalPrice)}
                      </span>
                      <select
                        value={ord.status}
                        disabled={busy}
                        onChange={(e) =>
                          runAction(
                            () =>
                              adminUpdateOrderStatusAtomic({
                                adminUser: firebaseUser,
                                order: ord,
                                newStatus: e.target.value as OrderStatus,
                                adminNote: orderNoteDrafts[ord.id] ?? ord.adminNote ?? '',
                              }),
                            `Order ${ord.orderCode} updated to ${e.target.value}.`
                          )
                        }
                        className="bg-[#090A0D] border border-white/15 rounded-lg px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-[#D4AF37]"
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="refunded">Refunded (Credit Wallet)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={orderNoteDrafts[ord.id] ?? ord.adminNote ?? ''}
                      onChange={(e) =>
                        setOrderNoteDrafts((prev) => ({ ...prev, [ord.id]: e.target.value }))
                      }
                      placeholder="Add admin delivery/refund note..."
                      className="flex-1 bg-[#090A0D] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-[#D4AF37]"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        runAction(
                          () =>
                            adminUpdateOrderStatusAtomic({
                              adminUser: firebaseUser,
                              order: ord,
                              newStatus: ord.status,
                              adminNote: orderNoteDrafts[ord.id] ?? '',
                            }),
                          `Note saved on ${ord.orderCode}.`
                        )
                      }
                      className="px-3 py-1.5 rounded-lg border border-white/15 text-xs text-zinc-200 hover:bg-white/5 cursor-pointer"
                    >
                      Save Note
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DEPOSIT MANAGEMENT */}
      {tab === 'deposits' && (
        <div className="surface-glass rounded-2xl overflow-hidden">
          <div className="divide-y divide-white/[0.06]">
            {allDeposits.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-400">No deposit requests yet.</div>
            ) : (
              allDeposits.map((dep) => (
                <div key={dep.id} className="p-5 space-y-3">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-bold text-[#FDE68A] font-mono-tabular">
                          {formatBdt(dep.amount)}
                        </span>
                        <span className="text-zinc-500">·</span>
                        <span className="font-semibold text-white">{dep.method}</span>
                        <span className="text-zinc-500">·</span>
                        <span className="font-mono-tabular text-sky-400">TrxID: {dep.trxId}</span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        User: {dep.userDisplayName || dep.userId} · Sender: {dep.senderNumber} ·{' '}
                        {formatTimestamp(dep.createdAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {dep.screenshotDataUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewScreenshot(dep.screenshotDataUrl || null)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 text-xs text-zinc-200 hover:bg-white/5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Screenshot
                        </button>
                      )}
                      {dep.status === 'pending' ? (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              runAction(
                                () =>
                                  adminReviewDepositAtomic({
                                    adminUser: firebaseUser,
                                    deposit: dep,
                                    decision: 'approved',
                                    adminNote: depositNoteDrafts[dep.id] || 'Verified by admin',
                                  }),
                                `Approved ৳${dep.amount} deposit for ${dep.trxId}.`
                              )
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Approve & Credit
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              runAction(
                                () =>
                                  adminReviewDepositAtomic({
                                    adminUser: firebaseUser,
                                    deposit: dep,
                                    decision: 'rejected',
                                    adminNote:
                                      depositNoteDrafts[dep.id] || 'TrxID could not be verified',
                                  }),
                                `Rejected deposit ${dep.trxId}.`
                              )
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-500 text-xs font-semibold text-white cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </>
                      ) : (
                        <span
                          className={`text-xs font-semibold uppercase ${
                            dep.status === 'approved' ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {dep.status}
                        </span>
                      )}
                    </div>
                  </div>
                  {dep.status === 'pending' && (
                    <input
                      type="text"
                      value={depositNoteDrafts[dep.id] || ''}
                      onChange={(e) =>
                        setDepositNoteDrafts((p) => ({ ...p, [dep.id]: e.target.value }))
                      }
                      placeholder="Optional verification note..."
                      className="w-full bg-[#090A0D] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-[#D4AF37]"
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* PRODUCT & CATEGORY MANAGEMENT */}
      {tab === 'products' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-display text-xl font-bold text-white">Catalog Management</h2>
            <button
              onClick={() =>
                setEditingProduct({
                  name: '',
                  category: categories[0]?.name || 'Free Fire Diamonds',
                  diamonds: 115,
                  priceBdt: 95,
                  discountPercent: 10,
                  imageUrl: PRODUCT_IMAGES.diamonds,
                  description: '',
                  badgeText: 'Instant',
                  available: true,
                  featured: false,
                  sortOrder: products.length + 1,
                })
              }
              className="btn-gold inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          </div>

          {editingProduct && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runAction(
                  async () => {
                    await adminSaveProduct(firebaseUser, {
                      id: editingProduct.id,
                      name: editingProduct.name || '',
                      category: editingProduct.category || 'Free Fire Diamonds',
                      diamonds: Number(editingProduct.diamonds || 0),
                      priceBdt: Number(editingProduct.priceBdt || 1),
                      discountPercent: Number(editingProduct.discountPercent || 0),
                      imageUrl: editingProduct.imageUrl || PRODUCT_IMAGES.diamonds,
                      description: editingProduct.description || '',
                      badgeText: editingProduct.badgeText || '',
                      available: editingProduct.available ?? true,
                      featured: editingProduct.featured ?? false,
                      sortOrder: Number(editingProduct.sortOrder || 1),
                    });
                    setEditingProduct(null);
                  },
                  `Saved product ${editingProduct.name}.`
                );
              }}
              className="surface-gold-edge rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              <input
                required
                placeholder="Product Name"
                value={editingProduct.name || ''}
                onChange={(e) => setEditingProduct((p) => ({ ...p, name: e.target.value }))}
                className="bg-[#090A0D] border border-white/12 rounded-xl px-3.5 py-2.5 text-sm text-white"
              />
              <select
                value={editingProduct.category || ''}
                onChange={(e) => setEditingProduct((p) => ({ ...p, category: e.target.value }))}
                className="bg-[#090A0D] border border-white/12 rounded-xl px-3.5 py-2.5 text-sm text-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                required
                placeholder="Diamonds"
                value={editingProduct.diamonds ?? 0}
                onChange={(e) =>
                  setEditingProduct((p) => ({ ...p, diamonds: Number(e.target.value) }))
                }
                className="bg-[#090A0D] border border-white/12 rounded-xl px-3.5 py-2.5 text-sm font-mono-tabular text-white"
              />
              <input
                type="number"
                required
                min={1}
                placeholder="Base Price (BDT)"
                value={editingProduct.priceBdt ?? 0}
                onChange={(e) =>
                  setEditingProduct((p) => ({ ...p, priceBdt: Number(e.target.value) }))
                }
                className="bg-[#090A0D] border border-white/12 rounded-xl px-3.5 py-2.5 text-sm font-mono-tabular text-white"
              />
              <input
                type="number"
                min={0}
                max={95}
                placeholder="Discount %"
                value={editingProduct.discountPercent ?? 0}
                onChange={(e) =>
                  setEditingProduct((p) => ({ ...p, discountPercent: Number(e.target.value) }))
                }
                className="bg-[#090A0D] border border-white/12 rounded-xl px-3.5 py-2.5 text-sm font-mono-tabular text-white"
              />
              <select
                value={editingProduct.imageUrl || PRODUCT_IMAGES.diamonds}
                onChange={(e) => setEditingProduct((p) => ({ ...p, imageUrl: e.target.value }))}
                className="bg-[#090A0D] border border-white/12 rounded-xl px-3.5 py-2.5 text-sm text-white"
              >
                <option value={PRODUCT_IMAGES.diamonds}>Artwork: Diamonds Pack</option>
                <option value={PRODUCT_IMAGES.weekly}>Artwork: Weekly Pass</option>
                <option value={PRODUCT_IMAGES.monthly}>Artwork: Monthly Crown</option>
                <option value={PRODUCT_IMAGES.levelup}>Artwork: Level Up Crate</option>
                <option value={PRODUCT_IMAGES.bundle}>Artwork: Collector Vault</option>
              </select>
              <input
                placeholder="Badge Text (e.g. Popular)"
                value={editingProduct.badgeText || ''}
                onChange={(e) => setEditingProduct((p) => ({ ...p, badgeText: e.target.value }))}
                className="bg-[#090A0D] border border-white/12 rounded-xl px-3.5 py-2.5 text-sm text-white"
              />
              <input
                placeholder="Description"
                value={editingProduct.description || ''}
                onChange={(e) => setEditingProduct((p) => ({ ...p, description: e.target.value }))}
                className="sm:col-span-2 bg-[#090A0D] border border-white/12 rounded-xl px-3.5 py-2.5 text-sm text-white"
              />
              <div className="flex items-center gap-4 text-xs text-zinc-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.available ?? true}
                    onChange={(e) =>
                      setEditingProduct((p) => ({ ...p, available: e.target.checked }))
                    }
                  />
                  Available
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.featured ?? false}
                    onChange={(e) =>
                      setEditingProduct((p) => ({ ...p, featured: e.target.checked }))
                    }
                  />
                  Featured
                </label>
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-xl border border-white/15 text-xs text-zinc-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="btn-gold px-5 py-2 rounded-xl text-xs cursor-pointer"
                >
                  Save Product
                </button>
              </div>
            </form>
          )}

          <div className="surface-glass rounded-2xl overflow-hidden divide-y divide-white/[0.06]">
            {products.map((prod) => (
              <div
                key={prod.id}
                className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={prod.imageUrl}
                    alt={prod.name}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-lg object-cover border border-white/10"
                  />
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {prod.name}{' '}
                      <span className="text-xs font-normal text-zinc-400">({prod.category})</span>
                    </p>
                    <p className="text-xs font-mono-tabular text-zinc-400">
                      {prod.diamonds} Diamonds · {formatBdt(prod.salePriceBdt)} ({prod.discountPercent}% off) ·{' '}
                      {prod.available ? 'Active' : 'Disabled'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingProduct(prod)}
                    className="px-3 py-1.5 rounded-lg border border-white/15 text-xs text-zinc-200 hover:bg-white/5 cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() =>
                      runAction(
                        () => adminDeleteProduct(firebaseUser, prod.id, prod.name),
                        `Deleted ${prod.name}.`
                      )
                    }
                    className="p-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Category Creator */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runAction(
                async () => {
                  await adminSaveCategory(firebaseUser, {
                    name: catName,
                    slug: catSlug || catName.toLowerCase().replace(/\s+/g, '-'),
                    sortOrder: categories.length + 1,
                    active: true,
                  });
                  setCatName('');
                  setCatSlug('');
                },
                `Category ${catName} saved.`
              );
            }}
            className="surface-glass rounded-2xl p-5 flex flex-wrap items-center gap-3"
          >
            <span className="text-xs font-semibold text-zinc-300">Add Category:</span>
            <input
              required
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="Category Name"
              className="bg-[#090A0D] border border-white/12 rounded-xl px-3.5 py-2 text-xs text-white"
            />
            <input
              value={catSlug}
              onChange={(e) => setCatSlug(e.target.value)}
              placeholder="slug (optional)"
              className="bg-[#090A0D] border border-white/12 rounded-xl px-3.5 py-2 text-xs text-white"
            />
            <button type="submit" disabled={busy} className="btn-gold px-4 py-2 rounded-xl text-xs cursor-pointer">
              Save Category
            </button>
          </form>
        </div>
      )}

      {/* USER MANAGEMENT */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search users by name, UID, or referral code..."
              className="w-full bg-[#111318] border border-white/12 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          {editingUser && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runAction(
                  async () => {
                    await adminUpdateUserDetails(firebaseUser, editingUser.uid, {
                      displayName: editingUser.displayName,
                      vipTier: editingUser.vipTier,
                      rankPoints: editingUser.rankPoints,
                    });
                    setEditingUser(null);
                  },
                  `Updated user ${editingUser.displayName}.`
                );
              }}
              className="surface-gold-edge rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
            >
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Display Name</label>
                <input
                  value={editingUser.displayName}
                  onChange={(e) =>
                    setEditingUser((u) => (u ? { ...u, displayName: e.target.value } : u))
                  }
                  className="w-full bg-[#090A0D] border border-white/12 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">VIP Tier</label>
                <select
                  value={editingUser.vipTier}
                  onChange={(e) =>
                    setEditingUser((u) =>
                      u ? { ...u, vipTier: e.target.value as UserProfile['vipTier'] } : u
                    )
                  }
                  className="w-full bg-[#090A0D] border border-white/12 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="Bronze">Bronze</option>
                  <option value="Silver">Silver</option>
                  <option value="Gold">Gold</option>
                  <option value="Diamond">Diamond</option>
                  <option value="Grandmaster">Grandmaster</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Rank Points</label>
                <input
                  type="number"
                  value={editingUser.rankPoints}
                  onChange={(e) =>
                    setEditingUser((u) => (u ? { ...u, rankPoints: Number(e.target.value) } : u))
                  }
                  className="w-full bg-[#090A0D] border border-white/12 rounded-xl px-3 py-2 text-xs font-mono-tabular text-white"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-gold px-4 py-2 rounded-xl text-xs cursor-pointer">
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-2 rounded-xl border border-white/15 text-xs text-zinc-300 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="surface-glass rounded-2xl overflow-hidden divide-y divide-white/[0.06]">
            {filteredUsers.map((u) => {
              const uWallet = allWallets[u.uid];
              const uOrdersCount = allOrders.filter((o) => o.userId === u.uid).length;
              return (
                <div
                  key={u.uid}
                  className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {u.displayName}{' '}
                      <span className="text-xs font-normal text-[#FDE68A]">
                        · {u.vipTier} ({u.rankPoints} pts)
                      </span>
                      {u.isBlocked && (
                        <span className="ml-2 text-xs text-red-400 font-semibold">BLOCKED</span>
                      )}
                    </p>
                    <p className="text-xs font-mono-tabular text-zinc-400">
                      UID: {u.uid} · Wallet: {formatBdt(uWallet?.balance ?? 0)} · Orders:{' '}
                      {uOrdersCount} · Ref: {u.referralCode}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingUser(u)}
                      className="px-3 py-1.5 rounded-lg border border-white/15 text-xs text-zinc-200 hover:bg-white/5 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        runAction(
                          () => adminToggleUserBlock(firebaseUser, u, !u.isBlocked),
                          `${u.isBlocked ? 'Unblocked' : 'Blocked'} ${u.displayName}.`
                        )
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                        u.isBlocked
                          ? 'bg-emerald-600 text-white'
                          : 'border border-red-500/40 text-red-300 hover:bg-red-500/10'
                      }`}
                    >
                      {u.isBlocked ? 'Unblock' : 'Block'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MARKETING & COUPONS */}
      {tab === 'marketing' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runAction(
                async () => {
                  await adminSaveCoupon(firebaseUser, {
                    code: couponCode,
                    discountType: couponType,
                    discountValue: Number(couponVal),
                    minOrderAmount: Number(couponMin),
                    maxDiscount: Number(couponMax),
                    active: true,
                    usageLimit: Number(couponLimit),
                  });
                  setCouponCode('');
                },
                `Saved coupon ${couponCode.toUpperCase()}.`
              );
            }}
            className="surface-gold-edge rounded-2xl p-6 space-y-4"
          >
            <h2 className="font-display text-lg font-bold text-white">Create / Update Coupon</h2>
            <div className="grid grid-cols-2 gap-3">
              <input
                required
                placeholder="Code (e.g. EID20)"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="bg-[#090A0D] border border-white/12 rounded-xl px-3.5 py-2.5 text-sm font-mono-tabular text-white"
              />
              <select
                value={couponType}
                onChange={(e) => setCouponType(e.target.value as 'percent' | 'fixed')}
                className="bg-[#090A0D] border border-white/12 rounded-xl px-3.5 py-2.5 text-sm text-white"
              >
                <option value="percent">Percent (%)</option>
                <option value="fixed">Fixed (BDT)</option>
              </select>
              <input
                type="number"
                required
                placeholder="Discount Value"
                value={couponVal}
                onChange={(e) => setCouponVal(e.target.value)}
                className="bg-[#090A0D] border border-white/12 rounded-xl px-3.5 py-2.5 text-sm font-mono-tabular text-white"
              />
              <input
                type="number"
                required
                placeholder="Min Order (BDT)"
                value={couponMin}
                onChange={(e) => setCouponMin(e.target.value)}
                className="bg-[#090A0D] border border-white/12 rounded-xl px-3.5 py-2.5 text-sm font-mono-tabular text-white"
              />
              <input
                type="number"
                required
                placeholder="Max Discount (BDT)"
                value={couponMax}
                onChange={(e) => setCouponMax(e.target.value)}
                className="bg-[#090A0D] border border-white/12 rounded-xl px-3.5 py-2.5 text-sm font-mono-tabular text-white"
              />
              <input
                type="number"
                required
                placeholder="Usage Limit"
                value={couponLimit}
                onChange={(e) => setCouponLimit(e.target.value)}
                className="bg-[#090A0D] border border-white/12 rounded-xl px-3.5 py-2.5 text-sm font-mono-tabular text-white"
              />
            </div>
            <button type="submit" disabled={busy} className="btn-gold px-5 py-2.5 rounded-xl text-xs cursor-pointer">
              Save Coupon
            </button>
          </form>

          <div className="surface-glass rounded-2xl overflow-hidden divide-y divide-white/[0.06]">
            <div className="px-6 py-4 border-b border-white/[0.08]">
              <h2 className="font-display text-base font-semibold text-white">
                Active & Past Coupons ({allCoupons.length})
              </h2>
            </div>
            {allCoupons.map((c) => (
              <div key={c.code} className="px-6 py-3.5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-mono-tabular text-sm font-bold text-[#FDE68A]">{c.code}</p>
                  <p className="text-zinc-400">
                    {c.discountType === 'percent' ? `${c.discountValue}%` : `৳${c.discountValue}`} off
                    · Used {c.usageCount}/{c.usageLimit}
                  </p>
                </div>
                <button
                  onClick={() =>
                    runAction(
                      () =>
                        adminSaveCoupon(firebaseUser, {
                          ...c,
                          active: !c.active,
                        }),
                      `Toggled coupon ${c.code}.`
                    )
                  }
                  className={`px-3 py-1 rounded-lg font-semibold cursor-pointer ${
                    c.active
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {c.active ? 'Active' : 'Disabled'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WEBSITE & SETTINGS MANAGEMENT */}
      {tab === 'website' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runAction(
              () => adminSaveStoreSettings(firebaseUser, settingsDraft),
              'Website settings published.'
            );
          }}
          className="surface-gold-edge rounded-2xl p-6 space-y-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-white">
              Storefront & Payment Numbers
            </h2>
            <label className="flex items-center gap-2 text-xs font-semibold text-amber-300 cursor-pointer">
              <input
                type="checkbox"
                checked={settingsDraft.maintenanceMode}
                onChange={(e) =>
                  setSettingsDraft((s) => ({ ...s, maintenanceMode: e.target.checked }))
                }
              />
              Enable Maintenance Mode
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Logo URL</label>
              <input
                value={settingsDraft.logoUrl}
                onChange={(e) => setSettingsDraft((s) => ({ ...s, logoUrl: e.target.value }))}
                className="w-full bg-[#090A0D] border border-white/12 rounded-xl px-3.5 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Hero Banner URL</label>
              <input
                value={settingsDraft.heroBannerUrl}
                onChange={(e) =>
                  setSettingsDraft((s) => ({ ...s, heroBannerUrl: e.target.value }))
                }
                className="w-full bg-[#090A0D] border border-white/12 rounded-xl px-3.5 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Announcement</label>
              <input
                value={settingsDraft.announcement}
                onChange={(e) =>
                  setSettingsDraft((s) => ({ ...s, announcement: e.target.value }))
                }
                className="w-full bg-[#090A0D] border border-white/12 rounded-xl px-3.5 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">bKash Number</label>
              <input
                value={settingsDraft.bKashNumber}
                onChange={(e) =>
                  setSettingsDraft((s) => ({ ...s, bKashNumber: e.target.value }))
                }
                className="w-full bg-[#090A0D] border border-white/12 rounded-xl px-3.5 py-2 text-xs font-mono-tabular text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Nagad Number</label>
              <input
                value={settingsDraft.nagadNumber}
                onChange={(e) =>
                  setSettingsDraft((s) => ({ ...s, nagadNumber: e.target.value }))
                }
                className="w-full bg-[#090A0D] border border-white/12 rounded-xl px-3.5 py-2 text-xs font-mono-tabular text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Rocket Number</label>
              <input
                value={settingsDraft.rocketNumber}
                onChange={(e) =>
                  setSettingsDraft((s) => ({ ...s, rocketNumber: e.target.value }))
                }
                className="w-full bg-[#090A0D] border border-white/12 rounded-xl px-3.5 py-2 text-xs font-mono-tabular text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Flash Sale Title</label>
              <input
                value={settingsDraft.flashSaleTitle}
                onChange={(e) =>
                  setSettingsDraft((s) => ({ ...s, flashSaleTitle: e.target.value }))
                }
                className="w-full bg-[#090A0D] border border-white/12 rounded-xl px-3.5 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Contact Email</label>
              <input
                value={settingsDraft.contactEmail}
                onChange={(e) =>
                  setSettingsDraft((s) => ({ ...s, contactEmail: e.target.value }))
                }
                className="w-full bg-[#090A0D] border border-white/12 rounded-xl px-3.5 py-2 text-xs text-white"
              />
            </div>
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 text-xs text-zinc-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsDraft.flashSaleActive}
                  onChange={(e) =>
                    setSettingsDraft((s) => ({ ...s, flashSaleActive: e.target.checked }))
                  }
                />
                Flash Sale Countdown Active
              </label>
            </div>
          </div>

          {/* FAQ Editor */}
          <div className="space-y-3 pt-4 border-t border-white/[0.08]">
            <h3 className="text-sm font-semibold text-white">FAQ Items</h3>
            {settingsDraft.faqs.map((f, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-[#090A0D] border border-white/10 flex items-start justify-between gap-3 text-xs"
              >
                <div>
                  <p className="font-semibold text-white">{f.question}</p>
                  <p className="text-zinc-400 mt-0.5">{f.answer}</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSettingsDraft((s) => ({
                      ...s,
                      faqs: s.faqs.filter((_, i) => i !== idx),
                    }))
                  }
                  className="text-red-400 hover:underline shrink-0 cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ))}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                placeholder="New FAQ Question"
                value={newFaqQ}
                onChange={(e) => setNewFaqQ(e.target.value)}
                className="bg-[#090A0D] border border-white/12 rounded-xl px-3 py-2 text-xs text-white"
              />
              <input
                placeholder="Answer"
                value={newFaqA}
                onChange={(e) => setNewFaqA(e.target.value)}
                className="bg-[#090A0D] border border-white/12 rounded-xl px-3 py-2 text-xs text-white"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newFaqQ.trim() || !newFaqA.trim()) return;
                  setSettingsDraft((s) => ({
                    ...s,
                    faqs: [...s.faqs, { question: newFaqQ.trim(), answer: newFaqA.trim() }],
                  }));
                  setNewFaqQ('');
                  setNewFaqA('');
                }}
                className="px-3 py-2 rounded-xl border border-white/15 text-xs text-zinc-200 hover:bg-white/5 cursor-pointer"
              >
                + Add FAQ
              </button>
            </div>
          </div>

          <button type="submit" disabled={busy} className="btn-gold px-6 py-3 rounded-xl text-sm cursor-pointer">
            Publish Storefront Settings
          </button>
        </form>
      )}

      {/* SUPPORT TICKETS, ADMIN ROLES & AUDIT LOGS */}
      {tab === 'support' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Support Tickets */}
            <div className="lg:col-span-7 surface-glass rounded-2xl overflow-hidden divide-y divide-white/[0.06]">
              <div className="px-6 py-4 border-b border-white/[0.08]">
                <h2 className="font-display text-base font-semibold text-white">
                  Customer Support Tickets ({allTickets.length})
                </h2>
              </div>
              {allTickets.map((t) => (
                <div key={t.id} className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {t.subject}{' '}
                        <span className="font-mono-tabular text-xs text-[#D4AF37]">
                          ({t.ticketCode})
                        </span>
                      </p>
                      <p className="text-xs text-zinc-400">
                        {t.userDisplayName || t.userId} · {t.category}{' '}
                        {t.orderCode ? `· Order ${t.orderCode}` : ''}
                      </p>
                    </div>
                    <select
                      value={t.status}
                      onChange={(e) =>
                        runAction(
                          () =>
                            replySupportTicket({
                              ticket: t,
                              senderId: firebaseUser.uid,
                              senderName: firebaseUser.displayName || 'FFZONEX Admin',
                              isAdmin: true,
                              message: `Status updated to ${e.target.value}.`,
                              newStatus: e.target.value as TicketStatus,
                            }),
                          `Ticket ${t.ticketCode} marked ${e.target.value}.`
                        )
                      }
                      className="bg-[#090A0D] border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <p className="text-xs text-zinc-300 bg-[#090A0D] p-3 rounded-lg border border-white/[0.06]">
                    {t.message}
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={ticketReplyDrafts[t.id] || ''}
                      onChange={(e) =>
                        setTicketReplyDrafts((p) => ({ ...p, [t.id]: e.target.value }))
                      }
                      placeholder="Reply to player..."
                      className="flex-1 bg-[#090A0D] border border-white/12 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                    <button
                      onClick={() => {
                        const msg = ticketReplyDrafts[t.id];
                        if (!msg?.trim()) return;
                        runAction(async () => {
                          await replySupportTicket({
                            ticket: t,
                            senderId: firebaseUser.uid,
                            senderName: firebaseUser.displayName || 'FFZONEX Admin',
                            isAdmin: true,
                            message: msg,
                            newStatus: 'in_progress',
                          });
                          setTicketReplyDrafts((p) => ({ ...p, [t.id]: '' }));
                        }, `Replied to ${t.ticketCode}.`);
                      }}
                      className="btn-gold px-3.5 py-1.5 rounded-lg text-xs cursor-pointer"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Admin RBAC & Audit Logs */}
            <div className="lg:col-span-5 space-y-6">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  runAction(
                    async () => {
                      await adminAddRoleUser(firebaseUser, {
                        uid: newAdminUid,
                        email: newAdminEmail,
                        displayName: newAdminName,
                        role: newAdminRole,
                      });
                      setNewAdminUid('');
                      setNewAdminEmail('');
                      setNewAdminName('');
                    },
                    `Added admin role for ${newAdminEmail}.`
                  );
                }}
                className="surface-glass rounded-2xl p-5 space-y-3"
              >
                <h3 className="font-display text-base font-semibold text-white">
                  Assign Admin Role ({allAdmins.length})
                </h3>
                <input
                  required
                  placeholder="Firebase User UID"
                  value={newAdminUid}
                  onChange={(e) => setNewAdminUid(e.target.value)}
                  className="w-full bg-[#090A0D] border border-white/12 rounded-lg px-3 py-2 text-xs font-mono-tabular text-white"
                />
                <input
                  required
                  type="email"
                  placeholder="User Email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="w-full bg-[#090A0D] border border-white/12 rounded-lg px-3 py-2 text-xs text-white"
                />
                <div className="flex gap-2">
                  <input
                    required
                    placeholder="Display Name"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    className="flex-1 bg-[#090A0D] border border-white/12 rounded-lg px-3 py-2 text-xs text-white"
                  />
                  <select
                    value={newAdminRole}
                    onChange={(e) => setNewAdminRole(e.target.value as AdminRole)}
                    className="bg-[#090A0D] border border-white/12 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="manager">Manager</option>
                    <option value="moderator">Moderator</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
                <button type="submit" className="btn-gold px-4 py-2 rounded-lg text-xs cursor-pointer">
                  Grant Admin Access
                </button>
              </form>

              <div className="surface-glass rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-white/[0.08]">
                  <h3 className="font-display text-base font-semibold text-white">
                    Immutable Audit Logs ({auditLogs.length})
                  </h3>
                </div>
                <div className="max-h-96 overflow-y-auto divide-y divide-white/[0.06]">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="px-5 py-3 text-xs space-y-0.5">
                      <p className="font-mono-tabular font-semibold text-[#FDE68A]">{log.action}</p>
                      <p className="text-zinc-300">{log.details}</p>
                      <p className="text-zinc-500">
                        {log.actorEmail || log.actorId} · {formatTimestamp(log.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Screenshot Preview Modal */}
      {previewScreenshot && (
        <div
          onClick={() => setPreviewScreenshot(null)}
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
        >
          <div className="max-w-2xl w-full bg-[#111318] border border-white/15 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">
                Submitted Payment Screenshot
              </span>
              <button
                onClick={() => setPreviewScreenshot(null)}
                className="text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>
            <img
              src={previewScreenshot}
              alt="Payment Verification Screenshot"
              className="w-full max-h-[75vh] object-contain rounded-lg bg-black"
            />
          </div>
        </div>
      )}
    </div>
  );
}
