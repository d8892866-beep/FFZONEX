import { useState } from 'react';
import { Gem, ShoppingBag } from 'lucide-react';
import { Product } from '../types';
import { formatBdt, formatNumber } from '../utils/helpers';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <article className="group surface-glass rounded-xl overflow-hidden flex flex-col transition-transform duration-200 hover:-translate-y-0.5 hover:border-[#D4AF37]/40">
      <div className="relative aspect-[4/3] bg-[#0C0E12] overflow-hidden border-b border-white/[0.06]">
        {!imgError && product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#13161E] to-[#090A0D] p-4 text-center">
            <Gem className="w-10 h-10 text-sky-400 mb-2" />
            <span className="text-xs font-medium text-zinc-400">{product.name}</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#090A0D]/90 to-transparent pointer-events-none" />
        <div className="absolute bottom-3 left-3.5 right-3.5 flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1.5 font-mono-tabular font-semibold text-sky-300">
            <Gem className="w-3.5 h-3.5 text-sky-400" />
            {formatNumber(product.diamonds)} Diamonds
          </span>
          {product.discountPercent > 0 && (
            <span className="font-mono-tabular font-semibold text-[#FDE68A]">
              -{product.discountPercent}%
            </span>
          )}
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="truncate">{product.category}</span>
            {product.badgeText && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#D4AF37] font-medium shrink-0">{product.badgeText}</span>
              </>
            )}
          </div>
          <h3 className="font-display text-base font-semibold text-white leading-snug">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono-tabular text-lg font-bold text-[#FDE68A]">
                {formatBdt(product.salePriceBdt)}
              </span>
              {product.discountPercent > 0 && (
                <span className="font-mono-tabular text-xs text-zinc-500 line-through">
                  {formatBdt(product.priceBdt)}
                </span>
              )}
            </div>
            <p
              className={`text-xs font-medium ${
                product.available ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {product.available ? 'In Stock · Instant' : 'Unavailable'}
            </p>
          </div>

          <button
            type="button"
            disabled={!product.available}
            onClick={() => onSelect(product)}
            className="btn-gold inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Purchase
          </button>
        </div>
      </div>
    </article>
  );
}
