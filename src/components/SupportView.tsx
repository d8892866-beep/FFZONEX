import React, { useState } from 'react';
import { Headphones, Mail, MessageSquare, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { createSupportTicket, replySupportTicket } from '../services/firestoreService';
import { AuthModalMode, SupportTicket } from '../types';
import { formatTimestamp } from '../utils/helpers';

interface SupportViewProps {
  onOpenAuth: (mode: AuthModalMode) => void;
}

export function SupportView({ onOpenAuth }: SupportViewProps) {
  const { firebaseUser, profile } = useAuth();
  const { settings, tickets } = useStore();

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<SupportTicket['category']>('Order Issue');
  const [orderCode, setOrderCode] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !profile) {
      onOpenAuth('login');
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const code = await createSupportTicket({
        user: firebaseUser,
        profile,
        subject,
        category,
        orderCode,
        message,
      });
      setNotice(`Support ticket ${code} opened. Our team responds promptly.`);
      setSubject('');
      setOrderCode('');
      setMessage('');
    } finally {
      setBusy(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !profile || !activeTicket || !replyText.trim()) return;
    setBusy(true);
    try {
      await replySupportTicket({
        ticket: activeTicket,
        senderId: firebaseUser.uid,
        senderName: profile.displayName,
        isAdmin: false,
        message: replyText,
      });
      setReplyText('');
    } finally {
      setBusy(false);
    }
  };

  const currentTicket = activeTicket
    ? tickets.find((t) => t.id === activeTicket.id) || activeTicket
    : tickets[0] || null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Customer Support Desk</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Open a real-time ticket linked to your Order ID or reach our verified channels.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <a
            href={`mailto:${settings.contactEmail}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/12 text-zinc-200 hover:border-[#D4AF37]"
          >
            <Mail className="w-3.5 h-3.5 text-[#D4AF37]" />
            {settings.contactEmail}
          </a>
          <a
            href={settings.whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/12 text-zinc-200 hover:border-[#D4AF37]"
          >
            <Headphones className="w-3.5 h-3.5 text-emerald-400" />
            WhatsApp Support
          </a>
        </div>
      </div>

      {!firebaseUser ? (
        <div className="surface-gold-edge rounded-2xl p-10 text-center space-y-4">
          <MessageSquare className="w-10 h-10 text-[#D4AF37] mx-auto" />
          <h2 className="font-display text-xl font-bold text-white">Sign in to Submit a Ticket</h2>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            Authenticated tickets tie directly to your orders and wallet deposits for rapid
            resolution.
          </p>
          <button
            onClick={() => onOpenAuth('login')}
            className="btn-gold px-6 py-3 rounded-xl text-sm cursor-pointer"
          >
            Sign In Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Open New Ticket */}
          <form
            onSubmit={handleCreate}
            className="lg:col-span-5 surface-gold-edge rounded-2xl p-6 space-y-4"
          >
            <h2 className="font-display text-lg font-bold text-white">Open Support Ticket</h2>

            {notice && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200">
                {notice}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SupportTicket['category'])}
                className="w-full bg-[#090A0D] border border-white/12 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="Order Issue">Order Issue</option>
                <option value="Deposit Verification">Deposit Verification</option>
                <option value="Account & VIP">Account & VIP</option>
                <option value="General Inquiry">General Inquiry</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Order ID (Optional)
              </label>
              <input
                type="text"
                value={orderCode}
                onChange={(e) => setOrderCode(e.target.value.toUpperCase())}
                placeholder="e.g., FFZ-82910-ABCD"
                className="w-full bg-[#090A0D] border border-white/12 rounded-xl px-4 py-2.5 text-sm font-mono-tabular text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Subject</label>
              <input
                type="text"
                required
                minLength={3}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your request"
                className="w-full bg-[#090A0D] border border-white/12 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Message</label>
              <textarea
                required
                minLength={5}
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Include Player UID, TrxID, or details..."
                className="w-full bg-[#090A0D] border border-white/12 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full btn-gold py-3 rounded-xl text-sm font-semibold cursor-pointer"
            >
              {busy ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </form>

          {/* Ticket History & Conversation */}
          <div className="lg:col-span-7 space-y-6">
            <div className="surface-glass rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/[0.08]">
                <h2 className="font-display text-base font-semibold text-white">
                  Your Tickets ({tickets.length})
                </h2>
              </div>
              {tickets.length === 0 ? (
                <div className="p-8 text-center text-sm text-zinc-400">
                  You have no support tickets yet.
                </div>
              ) : (
                <div className="divide-y divide-white/[0.06]">
                  {tickets.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTicket(t)}
                      className={`w-full px-6 py-4 flex items-center justify-between gap-4 text-left cursor-pointer ${
                        currentTicket?.id === t.id ? 'bg-white/[0.05]' : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{t.subject}</p>
                        <p className="text-xs text-zinc-400 font-mono-tabular">
                          {t.ticketCode} · {t.category} · {formatTimestamp(t.createdAt)}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-[#FDE68A] uppercase shrink-0">
                        {t.status.replace('_', ' ')}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {currentTicket && (
              <div className="surface-glass rounded-2xl p-6 space-y-4">
                <div className="flex items-start justify-between gap-4 pb-3 border-b border-white/[0.08]">
                  <div>
                    <p className="font-mono-tabular text-xs text-[#D4AF37]">
                      {currentTicket.ticketCode}
                    </p>
                    <h3 className="font-display text-lg font-bold text-white">
                      {currentTicket.subject}
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-sky-400 uppercase">
                    {currentTicket.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  <div className="p-3.5 rounded-xl bg-[#090A0D] border border-white/10">
                    <p className="text-xs text-zinc-400 mb-1">
                      You · {formatTimestamp(currentTicket.createdAt)}
                    </p>
                    <p className="text-sm text-zinc-200 whitespace-pre-wrap">
                      {currentTicket.message}
                    </p>
                  </div>

                  {currentTicket.replies?.map((rep, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border ${
                        rep.isAdmin
                          ? 'bg-[#D4AF37]/10 border-[#D4AF37]/30'
                          : 'bg-[#090A0D] border-white/10'
                      }`}
                    >
                      <p className="text-xs text-zinc-400 mb-1">
                        {rep.isAdmin ? `${rep.senderName} (Support)` : rep.senderName} ·{' '}
                        {formatTimestamp(rep.sentAt)}
                      </p>
                      <p className="text-sm text-zinc-100 whitespace-pre-wrap">{rep.message}</p>
                    </div>
                  ))}
                </div>

                {currentTicket.status !== 'closed' && (
                  <form onSubmit={handleReply} className="flex gap-2 pt-2">
                    <input
                      type="text"
                      required
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a reply..."
                      className="flex-1 bg-[#090A0D] border border-white/12 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                    />
                    <button
                      type="submit"
                      disabled={busy}
                      className="btn-gold inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Send
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
