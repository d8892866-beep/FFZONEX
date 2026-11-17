import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  Clock,
  Headphones,
  ShieldCheck,
  Star,
  Wallet,
  Zap,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { BRAND_BANNER_URL, CUSTOMER_REVIEWS } from '../data/seedData';
import { ActiveView, Product } from '../types';
import { ProductCard } from './ProductCard';

interface HomePageProps {
  onSelectProduct: (product: Product) => void;
  onNavigate: (view: ActiveView) => void;
}

export function HomePage({ onSelectProduct, onNavigate }: HomePageProps) {
  const { settings, categories, products } = useStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [countdownText, setCountdownText] = useState('');

  useEffect(() => {
    if (!settings.flashSaleActive || !settings.flashSaleEndsAt) return;
    const updateTimer = () => {
      const diff = new Date(settings.flashSaleEndsAt).getTime() - Date.now();
      if (diff <= 0) {
        setCountdownText('Ends Soon');
        return;
      }
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdownText(
        `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(
          2,
          '0'
        )}s`
      );
    };
    updateTimer();
    const id = setInterval(updateTimer, 1000);
    return () => clearInterval(id);
  }, [settings.flashSaleActive, settings.flashSaleEndsAt]);

  const activeCategoryNames = ['All', ...categories.filter((c) => c.active).map((c) => c.name)];
  const visibleProducts = products
    .filter((p) => (selectedCategory === 'All' ? true : p.category === selectedCategory))
    .slice(0, 6);

  return (
    <div className="space-y-20 pb-16">
      {/* Slim Flash Sale / Announcement Strip */}
      {settings.flashSaleActive && (
        <div className="border-b border-[#D4AF37]/20 bg-[#111318]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <p className="text-zinc-200 font-medium">{settings.flashSaleTitle}</p>
            <div className="flex items-center gap-3 font-mono-tabular text-[#FDE68A]">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                {countdownText || 'Live Now'}
              </span>
              <button
                onClick={() => onNavigate('store')}
                className="text-sky-400 hover:underline font-sans font-semibold cursor-pointer"
              >
                Shop Offers →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Split Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
            <p className="text-xs font-semibold tracking-[0.18em] text-[#D4AF37]">
              {settings.tagline || 'TOP UP • PLAY MORE • WIN BIGGER'}
            </p>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-silver-metallic leading-[1.1] text-balance">
              Instant Free Fire Diamonds & VIP Passes
            </h1>
            <p className="text-base text-zinc-300 leading-relaxed max-w-xl">
              Official Player UID top-up marketplace engineered for Bangladesh and global servers.
              Fund your wallet securely with bKash, Nagad, or Rocket and track every order live.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button
                onClick={() => onNavigate('store')}
                className="btn-gold inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm cursor-pointer whitespace-nowrap"
              >
                Browse Top-Up Store
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate('track')}
                className="px-6 py-3.5 rounded-xl border border-white/15 text-sm font-medium text-zinc-200 hover:text-white hover:border-[#D4AF37]/50 transition-colors cursor-pointer whitespace-nowrap"
              >
                Track Live Order
              </button>
            </div>

            {/* Clean inline trust stats */}
            <div className="pt-4 border-t border-white/[0.08] grid grid-cols-3 gap-4 max-w-md">
              <div>
                <p className="font-mono-tabular text-xl font-bold text-white">1–5 min</p>
                <p className="text-xs text-zinc-400">Avg UID Delivery</p>
              </div>
              <div>
                <p className="font-mono-tabular text-xl font-bold text-sky-400">6 Regions</p>
                <p className="text-xs text-zinc-400">Supported Servers</p>
              </div>
              <div>
                <p className="font-mono-tabular text-xl font-bold text-[#FDE68A]">100%</p>
                <p className="text-xs text-zinc-400">UID Only · No Pass</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-full rounded-2xl overflow-hidden border border-[#D4AF37]/30 bg-[#0D0F14] shadow-2xl">
              <img
                src={settings.heroBannerUrl || BRAND_BANNER_URL}
                alt="FFZONEX Free Fire Top-Up Platform"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover min-h-[280px]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Featured Catalog with Category Tabs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Diamond Packs & Memberships
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              Select a package to enter your Player UID and confirm in seconds.
            </p>
          </div>
          <button
            onClick={() => onNavigate('store')}
            className="text-sm font-semibold text-[#FDE68A] hover:underline self-start md:self-auto cursor-pointer whitespace-nowrap"
          >
            View All Packages →
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {activeCategoryNames.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'btn-gold'
                  : 'bg-[#111318] border border-white/10 text-zinc-300 hover:text-white hover:border-white/25'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleProducts.map((prod) => (
            <ProductCard key={prod.id} product={prod} onSelect={onSelectProduct} />
          ))}
        </div>
      </section>

      {/* How to Order + Why Choose FFZONEX */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="surface-gold-edge rounded-2xl p-6 sm:p-10 space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-5">
              <h2 className="font-display text-2xl font-bold text-white">
                How Top-Up Works
              </h2>
              <div className="space-y-4">
                {[
                  {
                    step: '01',
                    title: 'Choose Diamond Pack or Membership',
                    desc: 'Pick from Free Fire Diamonds, Weekly/Monthly VIP Passes, or Level Up Crates.',
                  },
                  {
                    step: '02',
                    title: 'Enter Numeric Player UID & Server',
                    desc: 'Provide your Free Fire Player ID and select Bangladesh, Singapore, or global region.',
                  },
                  {
                    step: '03',
                    title: 'Pay via Wallet, bKash, Nagad, or Rocket',
                    desc: 'Apply promo codes and pay directly from your verified FFZONEX wallet or mobile banking.',
                  },
                  {
                    step: '04',
                    title: 'Track Real-Time Delivery',
                    desc: 'Receive a unique Order ID (FFZ-...) and watch live status updates until diamonds arrive.',
                  },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-4">
                    <span className="font-mono-tabular text-sm font-bold text-[#D4AF37] pt-0.5">
                      {item.step}.
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <h2 className="font-display text-2xl font-bold text-white">
                Why Players Trust FFZONEX
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    icon: Zap,
                    title: 'Rapid Processing',
                    desc: 'Automated wallet checkout routes orders directly to the delivery queue.',
                  },
                  {
                    icon: ShieldCheck,
                    title: 'Zero-Trust Security',
                    desc: 'Server-verified pricing, duplicate TrxID locks, and no account passwords ever.',
                  },
                  {
                    icon: Wallet,
                    title: 'BDT Mobile Wallet',
                    desc: 'Deposit via bKash, Nagad, or Rocket with transparent admin ledger verification.',
                  },
                  {
                    icon: Headphones,
                    title: '24/7 Ticket Support',
                    desc: 'Direct support desk linked to your Order IDs and VIP priority rank.',
                  },
                ].map((feat) => {
                  const Icon = feat.icon;
                  return (
                    <div
                      key={feat.title}
                      className="p-4 rounded-xl bg-[#090A0D] border border-white/[0.08] space-y-2"
                    >
                      <Icon className="w-5 h-5 text-[#D4AF37]" />
                      <h3 className="text-sm font-semibold text-white">{feat.title}</h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">{feat.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Reviews */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
            Verified Player Feedback
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Rated by Free Fire guild leaders and competitive squad captains.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CUSTOMER_REVIEWS.map((rev) => (
            <div key={rev.name} className="surface-glass rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-1 text-[#D4AF37]">
                {Array.from({ length: rev.rating }).map((_, idx) => (
                  <Star key={idx} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="text-sm text-zinc-200 leading-relaxed">"{rev.quote}"</p>
              <div className="pt-3 border-t border-white/[0.06]">
                <p className="text-sm font-semibold text-white">{rev.name}</p>
                <p className="text-xs text-zinc-400">{rev.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ & Support CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-4">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Need help with a pending deposit, Player UID check, or VIP tier upgrade? Reach our
              support desk anytime.
            </p>
            <button
              onClick={() => onNavigate('support')}
              className="btn-gold inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm cursor-pointer"
            >
              <Headphones className="w-4 h-4" />
              Open Support Desk
            </button>
          </div>

          <div className="lg:col-span-7 space-y-3">
            {settings.faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={faq.question}
                  className="surface-glass rounded-xl overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left cursor-pointer"
                  >
                    <span className="text-sm font-semibold text-white">{faq.question}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${
                        isOpen ? 'rotate-180 text-[#D4AF37]' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-xs text-zinc-300 leading-relaxed border-t border-white/[0.06] pt-3">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
