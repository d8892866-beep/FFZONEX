import { BRAND_BANNER_URL } from '../data/seedData';

export function LoadingScreen({ label = 'Preparing Storefront' }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-50 bg-[#090A0D] flex flex-col items-center justify-center p-6">
      <div className="relative w-56 sm:w-64 rounded-xl overflow-hidden border border-[#D4AF37]/30 shadow-2xl">
        <img
          src={BRAND_BANNER_URL}
          alt="FFZONEX"
          referrerPolicy="no-referrer"
          className="w-full h-auto object-cover"
        />
      </div>
      <div className="mt-6 w-48 h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full w-1/2 bg-gradient-to-r from-[#D4AF37] to-[#38BDF8] animate-pulse rounded-full" />
      </div>
      <p className="mt-3 text-xs tracking-wider text-zinc-400 font-medium">{label}</p>
    </div>
  );
}
