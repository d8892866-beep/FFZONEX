import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, PackageCheck, RefreshCw, Search, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { AuthModalMode, Order, OrderStatus } from '../types';
import { formatBdt, formatNumber, formatTimestamp } from '../utils/helpers';

interface TrackOrderViewProps {
  initialOrderCode?: string | null;
  onOpenAuth: (mode: AuthModalMode) => void;
}

export function TrackOrderView({ initialOrderCode, onOpenAuth }: TrackOrderViewProps) {
  const { firebaseUser } = useAuth();
  const { orders } = useStore();
  const [searchTerm, setSearchTerm] = useState(initialOrderCode || '');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (initialOrderCode) {
      setSearchTerm(initialOrderCode);
      const found = orders.find((o) => o.orderCode === initialOrderCode);
      if (found) setSelectedOrder(found);
    }
  }, [initialOrderCode, orders]);

  useEffect(() => {
    if (!selectedOrder && orders.length > 0) {
      setSelectedOrder(orders[0]);
    } else if (selectedOrder) {
      const updated = orders.find((o) => o.id === selectedOrder.id);
      if (updated) setSelectedOrder(updated);
    }
  }, [orders, selectedOrder]);

  const filteredOrders = orders.filter((o) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      o.orderCode.toLowerCase().includes(q) ||
      o.playerUid.toLowerCase().includes(q) ||
      o.productName.toLowerCase().includes(q)
    );
  });

  const renderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400">
            <RefreshCw className="w-3.5 h-3.5" />
            Processing
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FDE68A]">
            <Clock className="w-3.5 h-3.5" />
            Pending
          </span>
        );
      case 'refunded':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400">
            <PackageCheck className="w-3.5 h-3.5" />
            Refunded
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-400">
            <XCircle className="w-3.5 h-3.5" />
            Cancelled
          </span>
        );
    }
  };

  const stepIndex = (status: OrderStatus) => {
    if (status === 'pending') return 1;
    if (status === 'processing') return 2;
    if (status === 'completed') return 3;
    return 0;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Live Order Tracking</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Search by Order ID or Free Fire Player UID to monitor real-time fulfillment status.
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Order ID or Player UID..."
            className="w-full bg-[#111318] border border-white/12 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono-tabular text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
          />
        </div>
      </div>

      {!firebaseUser ? (
        <div className="surface-gold-edge rounded-2xl p-10 text-center space-y-4">
          <h2 className="font-display text-xl font-semibold text-white">
            Sign in to view your real-time orders
          </h2>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            For Player UID privacy and security, order history and live fulfillment updates are
            protected per account.
          </p>
          <button
            onClick={() => onOpenAuth('login')}
            className="btn-gold px-6 py-3 rounded-xl text-sm cursor-pointer"
          >
            Sign In to Track Orders
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Selected Order Live Pipeline */}
          <div className="lg:col-span-5 surface-gold-edge rounded-2xl p-6 space-y-6">
            {selectedOrder ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-zinc-400">Order Reference</p>
                    <h2 className="font-mono-tabular text-xl font-bold text-white mt-0.5">
                      {selectedOrder.orderCode}
                    </h2>
                  </div>
                  {renderStatusBadge(selectedOrder.status)}
                </div>

                {/* Progress Steps */}
                {selectedOrder.status === 'cancelled' || selectedOrder.status === 'refunded' ? (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-200 space-y-1">
                    <p className="font-semibold">
                      Order {selectedOrder.status.toUpperCase()}
                    </p>
                    <p>
                      {selectedOrder.adminNote ||
                        'This order was halted. Any wallet refund is credited directly to your FFZONEX Wallet.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 pt-2">
                    {[
                      { step: 1, title: 'Order Placed', sub: 'Price verified & queued' },
                      { step: 2, title: 'Processing Top-Up', sub: 'Validating UID & region' },
                      { step: 3, title: 'Diamonds Delivered', sub: 'Credited to Player UID' },
                    ].map((s) => {
                      const active = stepIndex(selectedOrder.status) >= s.step;
                      return (
                        <div key={s.step} className="flex items-start gap-3">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono-tabular font-bold shrink-0 border ${
                              active
                                ? 'bg-[#D4AF37] text-[#090A0D] border-[#D4AF37]'
                                : 'bg-[#090A0D] text-zinc-500 border-white/15'
                            }`}
                          >
                            {s.step}
                          </div>
                          <div>
                            <p
                              className={`text-sm font-semibold ${
                                active ? 'text-white' : 'text-zinc-500'
                              }`}
                            >
                              {s.title}
                            </p>
                            <p className="text-xs text-zinc-400">{s.sub}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="pt-4 border-t border-white/[0.08] space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Package</span>
                    <span className="text-white font-medium">{selectedOrder.productName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Diamonds</span>
                    <span className="font-mono-tabular text-sky-400 font-semibold">
                      {formatNumber(selectedOrder.diamonds)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Player UID</span>
                    <span className="font-mono-tabular text-white">{selectedOrder.playerUid}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Server Region</span>
                    <span className="text-zinc-200">{selectedOrder.serverRegion}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Payment Method</span>
                    <span className="text-zinc-200">{selectedOrder.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Total Paid</span>
                    <span className="font-mono-tabular font-bold text-[#FDE68A]">
                      {formatBdt(selectedOrder.finalPrice)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Created</span>
                    <span className="text-zinc-300">{formatTimestamp(selectedOrder.createdAt)}</span>
                  </div>
                  {selectedOrder.adminNote && (
                    <div className="pt-2 border-t border-white/[0.06]">
                      <p className="text-zinc-400">Admin Note:</p>
                      <p className="text-zinc-200 mt-0.5">{selectedOrder.adminNote}</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-sm text-zinc-400">
                Select an order from the list to inspect live status.
              </div>
            )}
          </div>

          {/* Orders List */}
          <div className="lg:col-span-7 surface-glass rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-white">
                Your Orders ({filteredOrders.length})
              </h2>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="p-10 text-center text-sm text-zinc-400">
                No orders match your search.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {filteredOrders.map((ord) => (
                  <button
                    key={ord.id}
                    type="button"
                    onClick={() => setSelectedOrder(ord)}
                    className={`w-full px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                      selectedOrder?.id === ord.id ? 'bg-white/[0.05]' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono-tabular text-sm font-bold text-white">
                          {ord.orderCode}
                        </span>
                        <span className="text-xs text-zinc-500">·</span>
                        <span className="text-xs text-zinc-300">{ord.productName}</span>
                      </div>
                      <p className="text-xs text-zinc-400 font-mono-tabular">
                        UID {ord.playerUid} · {ord.serverRegion} · {formatTimestamp(ord.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      <span className="font-mono-tabular text-sm font-semibold text-[#FDE68A]">
                        {formatBdt(ord.finalPrice)}
                      </span>
                      {renderStatusBadge(ord.status)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
