import { useState } from 'react';
import { Search } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Product } from '../types';
import { ProductCard } from './ProductCard';

interface StoreViewProps {
  onSelectProduct: (product: Product) => void;
}

export function StoreView({ onSelectProduct }: StoreViewProps) {
  const { categories, products } = useStore();
  const [selectedCat, setSelectedCat] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'diamonds_desc'>('featured');

  const categoryTabs = ['All', ...categories.filter((c) => c.active).map((c) => c.name)];

  const filtered = products
    .filter((p) => (selectedCat === 'All' ? true : p.category === selectedCat))
    .filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'price_asc') return a.salePriceBdt - b.salePriceBdt;
      if (sortBy === 'diamonds_desc') return b.diamonds - a.diamonds;
      return a.sortOrder - b.sortOrder;
    });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">
            Free Fire Diamond Top-Up Store
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            All prices verified in BDT. Instant UID delivery across 6 supported game regions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search packages..."
              className="bg-[#111318] border border-white/12 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-[#111318] border border-white/12 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-[#D4AF37]"
          >
            <option value="featured">Sort: Featured</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="diamonds_desc">Diamonds: High to Low</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {categoryTabs.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCat(cat)}
            className={`px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              selectedCat === cat
                ? 'btn-gold'
                : 'bg-[#111318] border border-white/10 text-zinc-300 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="surface-glass rounded-xl p-12 text-center space-y-2">
          <p className="text-base font-semibold text-white">No matching packages found</p>
          <p className="text-xs text-zinc-400">Try clearing your search or selecting another category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((prod) => (
            <ProductCard key={prod.id} product={prod} onSelect={onSelectProduct} />
          ))}
        </div>
      )}
    </div>
  );
}
