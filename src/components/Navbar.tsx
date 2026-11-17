import { useState } from 'react';
import { Bell, Menu, Shield, User as UserIcon, Wallet, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { BRAND_BANNER_URL } from '../data/seedData';
import { ActiveView, AuthModalMode } from '../types';
import { formatBdt } from '../utils/helpers';

interface NavbarProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  onOpenAuth: (mode: AuthModalMode) => void;
}

export function Navbar({ activeView, onNavigate, onOpenAuth }: NavbarProps) {
  const { firebaseUser, wallet, isAdmin } = useAuth();
  const { settings, unreadNotifications } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks: { id: ActiveView; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'store', label: 'Top-Up Store' },
    { id: 'track', label: 'Track Order' },
    { id: 'wallet', label: 'Wallet' },
    { id: 'support', label: 'Support' },
  ];

  const handleNav = (view: ActiveView) => {
    onNavigate(view);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#090A0D]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Identity with uploaded FFZONEX logo */}
        <button
          onClick={() => handleNav('home')}
          className="flex items-center gap-3 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] rounded-md"
        >
          <div className="h-9 w-14 rounded-md overflow-hidden border border-[#D4AF37]/40 bg-black shrink-0">
            <img
              src={settings.logoUrl || BRAND_BANNER_URL}
              alt="FFZONEX Logo"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center"
            />
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-gold-metallic">
            {settings.brandName || 'FFZONEX'}
          </span>
        </button>

        {/* Zone 2: 5 concise single-line nav links */}
        <nav className="hidden lg:flex items-center gap-7">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => handleNav(link.id)}
              className={`text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer pb-0.5 border-b-2 ${
                activeView === link.id
                  ? 'text-[#FDE68A] border-[#D4AF37]'
                  : 'text-zinc-300 border-transparent hover:text-white'
              }`}
            >
              {link.label}
            </button>
          ))}
          {firebaseUser && (
            <button
              onClick={() => handleNav('dashboard')}
              className={`text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer pb-0.5 border-b-2 ${
                activeView === 'dashboard'
                  ? 'text-[#FDE68A] border-[#D4AF37]'
                  : 'text-zinc-300 border-transparent hover:text-white'
              }`}
            >
              Dashboard
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => handleNav('admin')}
              className={`inline-flex items-center gap-1.5 text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer pb-0.5 border-b-2 ${
                activeView === 'admin'
                  ? 'text-[#38BDF8] border-[#38BDF8]'
                  : 'text-sky-400 border-transparent hover:text-sky-300'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Admin
            </button>
          )}
        </nav>

        {/* Zone 3: Single Primary Action Zone */}
        <div className="flex items-center gap-3 shrink-0">
          {firebaseUser ? (
            <button
              onClick={() => handleNav('dashboard')}
              className="btn-gold inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Wallet className="w-4 h-4" />
              <span className="font-mono-tabular">{formatBdt(wallet?.balance ?? 0)}</span>
              {unreadNotifications > 0 && (
                <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-[#090A0D] bg-white/40 px-1.5 py-0.5 rounded">
                  <Bell className="w-3 h-3" />
                  {unreadNotifications}
                </span>
              )}
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-3 shrink-0">
              <button
                onClick={() => onOpenAuth('login')}
                className="text-sm font-medium text-zinc-200 hover:text-white px-3 py-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Login
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="btn-gold px-4 py-2 rounded-lg text-sm whitespace-nowrap shrink-0 cursor-pointer"
              >
                Register
              </button>
            </div>
          )}

          <button
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className="lg:hidden p-2 rounded-lg border border-white/10 text-zinc-200 hover:text-white cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-white/[0.08] bg-[#0D0F14] px-4 py-4 space-y-2">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => handleNav(link.id)}
              className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer ${
                activeView === link.id
                  ? 'bg-[#D4AF37]/15 text-[#FDE68A]'
                  : 'text-zinc-300 hover:bg-white/5'
              }`}
            >
              {link.label}
            </button>
          ))}
          {firebaseUser && (
            <button
              onClick={() => handleNav('dashboard')}
              className="flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-200 hover:bg-white/5 cursor-pointer"
            >
              <UserIcon className="w-4 h-4 text-[#D4AF37]" />
              My Dashboard
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => handleNav('admin')}
              className="flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-sky-400 hover:bg-white/5 cursor-pointer"
            >
              <Shield className="w-4 h-4" />
              Admin Panel
            </button>
          )}
          {!firebaseUser && (
            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={() => {
                  setMobileOpen(false);
                  onOpenAuth('login');
                }}
                className="flex-1 py-2.5 rounded-lg border border-white/15 text-sm font-medium text-zinc-200 cursor-pointer"
              >
                Login
              </button>
              <button
                onClick={() => {
                  setMobileOpen(false);
                  onOpenAuth('register');
                }}
                className="flex-1 py-2.5 rounded-lg btn-gold text-sm cursor-pointer"
              >
                Register
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
