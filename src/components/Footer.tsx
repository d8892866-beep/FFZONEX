import { useStore } from '../context/StoreContext';
import { BRAND_BANNER_URL } from '../data/seedData';
import { ActiveView } from '../types';

interface FooterProps {
  onNavigate: (view: ActiveView) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const { settings } = useStore();

  return (
    <footer className="border-t border-white/[0.08] bg-[#07080B] mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-5 space-y-4">
          <div className="flex items-center gap-3">
            <img
              src={settings.logoUrl || BRAND_BANNER_URL}
              alt="FFZONEX"
              referrerPolicy="no-referrer"
              className="h-10 w-16 rounded-md object-cover border border-[#D4AF37]/35"
            />
            <div>
              <p className="font-display text-lg font-bold text-gold-metallic">
                {settings.brandName || 'FFZONEX'}
              </p>
              <p className="text-[11px] tracking-widest text-zinc-400">
                {settings.tagline}
              </p>
            </div>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-sm">
            Premium Free Fire diamond and membership marketplace with verified manual wallet
            deposits, instant UID checkout, and live order tracking.
          </p>
        </div>

        <div className="md:col-span-3 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Marketplace
          </h3>
          <ul className="space-y-2 text-xs text-zinc-400">
            <li>
              <button onClick={() => onNavigate('store')} className="hover:text-white cursor-pointer">
                Diamond Top-Up Store
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate('track')} className="hover:text-white cursor-pointer">
                Live Order Tracking
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate('wallet')} className="hover:text-white cursor-pointer">
                bKash / Nagad / Rocket Wallet
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate('support')} className="hover:text-white cursor-pointer">
                Customer Support Desk
              </button>
            </li>
          </ul>
        </div>

        <div className="md:col-span-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Connect & Support
          </h3>
          <p className="text-xs text-zinc-400">
            {settings.contactEmail} · {settings.contactPhone}
          </p>
          <div className="flex flex-wrap gap-3 text-xs">
            <a
              href={settings.facebookUrl}
              target="_blank"
              rel="noreferrer"
              className="text-zinc-300 hover:text-[#FDE68A]"
            >
              Facebook
            </a>
            <span className="text-zinc-600">·</span>
            <a
              href={settings.discordUrl}
              target="_blank"
              rel="noreferrer"
              className="text-zinc-300 hover:text-[#FDE68A]"
            >
              Discord
            </a>
            <span className="text-zinc-600">·</span>
            <a
              href={settings.telegramUrl}
              target="_blank"
              rel="noreferrer"
              className="text-zinc-300 hover:text-[#FDE68A]"
            >
              Telegram
            </a>
            <span className="text-zinc-600">·</span>
            <a
              href={settings.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="text-zinc-300 hover:text-[#FDE68A]"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} FFZONEX. All rights reserved.</p>
          <p>UID-only delivery · Free Fire is a trademark of Garena.</p>
        </div>
      </div>
    </footer>
  );
}
