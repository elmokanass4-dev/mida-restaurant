import React, { useState } from 'react';
import { Restaurant, Category, Dish, Language, OrderItem } from '../../types';
import { getTranslation } from '../../i18n/translations';
import { Search, Plus, Utensils, Flame, Sparkles, Check } from 'lucide-react';

interface Props {
  restaurant: Restaurant;
  categories: Category[];
  dishes: Dish[];
  language: Language;
  activeTableNumber?: number;
  onOpenDish: (dish: Dish) => void;
  onQuickAdd: (dish: Dish) => void;
  onViewCategory: (catId: string) => void;
}

export const CustomerHome: React.FC<Props> = ({
  restaurant,
  categories,
  dishes,
  language,
  activeTableNumber,
  onOpenDish,
  onQuickAdd,
  onViewCategory
}) => {
  const t = getTranslation(language);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [justAddedDishId, setJustAddedDishId] = useState<string | null>(null);

  // Featured dish (e.g. The Heirloom Burger)
  const featuredDish = dishes.find((d) => d.isFeatured && d.categoryId === 'cat-burgers') || dishes[0];

  // Filtered dishes
  const filteredDishes = dishes.filter((dish) => {
    const matchesCategory = selectedCategory === 'all' || dish.categoryId === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesCategory;
    const nameMatch = (dish.name[language] || dish.name.fr).toLowerCase().includes(q);
    const descMatch = (dish.description[language] || dish.description.fr).toLowerCase().includes(q);
    return matchesCategory && (nameMatch || descMatch);
  });

  const handleQuickAddClick = (dish: Dish, e: React.MouseEvent) => {
    e.stopPropagation();
    if (dish.modifierGroups.some((g) => g.required)) {
      // Must open modal to choose required choices
      onOpenDish(dish);
    } else {
      onQuickAdd(dish);
      setJustAddedDishId(dish.id);
      setTimeout(() => setJustAddedDishId(null), 1200);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Table session indicator if active */}
      {activeTableNumber && (
        <div className="mx-4 mt-2 p-2.5 px-4 rounded-2xl bg-amber-950/40 border border-amber-600/40 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <Utensils size={15} className="text-amber-400" />
            <span className="font-semibold">
              {t.tableSessionNotice} Table #{activeTableNumber}
            </span>
          </div>
          <span className="text-[11px] text-amber-400/90 font-medium bg-amber-900/50 px-2 py-0.5 rounded-full">
            Prise de commande active
          </span>
        </div>
      )}

      {/* Greetings section matching reference image */}
      <div className="px-5 pt-2">
        <div className="text-neutral-400 text-xs sm:text-sm font-medium tracking-wide">
          {t.welcomeBack} !
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5 font-sans leading-tight">
          {t.cravingHeadline}
        </h1>

        {/* Search bar matching reference design */}
        <div className="relative mt-4">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 bg-neutral-900/90 border border-neutral-800/90 rounded-2xl text-xs sm:text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/80 transition-colors shadow-inner"
          />
        </div>
      </div>

      {/* Featured Hero Card (Matches The Heirloom Burger in user photo) */}
      {featuredDish && (
        <div className="px-5">
          <div
            onClick={() => onOpenDish(featuredDish)}
            className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#2a131b] via-[#1b0c13] to-[#12070c] border border-amber-600/35 p-4 sm:p-5 shadow-2xl shadow-black/80 cursor-pointer group hover:border-amber-500/60 transition-all"
          >
            {/* Ambient gold/amber glow */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-32 bg-amber-500/15 blur-3xl pointer-events-none rounded-full" />

            {/* Food Image */}
            <div className="relative h-48 sm:h-56 w-full rounded-2xl overflow-hidden mb-3 bg-black/40">
              <img
                src={featuredDish.image}
                alt={featuredDish.name[language] || featuredDish.name.fr}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-amber-500/30 text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                <Flame size={12} className="text-amber-400" />
                <span>{restaurant.name} Exclusive</span>
              </div>
            </div>

            {/* Title & Description */}
            <div className="space-y-1.5">
              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white uppercase font-sans">
                {featuredDish.name[language] || featuredDish.name.fr}
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed line-clamp-2">
                {featuredDish.description[language] || featuredDish.description.fr}
              </p>
            </div>

            {/* Price and CTA button */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-amber-950/50">
              <span className="text-xl sm:text-2xl font-black text-white tabular-nums tracking-tight">
                {featuredDish.priceMAD} <span className="text-amber-400 text-sm font-bold">MAD</span>
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDish(featuredDish);
                }}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-extrabold text-xs uppercase tracking-wide flex items-center gap-1.5 shadow-lg shadow-amber-950/40 active:scale-95 transition-all"
              >
                <span>{t.addToOrder}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Pills Slider */}
      <div className="px-5">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-amber-600 text-black font-bold shadow-md shadow-amber-950/30'
                : 'bg-neutral-900/80 text-neutral-400 border border-neutral-800 hover:text-white'
            }`}
          >
            Tous les délices
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-amber-600 text-black font-bold shadow-md shadow-amber-950/30'
                  : 'bg-neutral-900/80 text-neutral-400 border border-neutral-800 hover:text-white'
              }`}
            >
              {cat.name[language] || cat.name.fr}
            </button>
          ))}
        </div>
      </div>

      {/* EXPLORE OUR MENU Grid (Matching 2-column cards in user image) */}
      <div className="px-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-neutral-300 font-sans">
            {t.exploreMenu}
          </h2>
          <span className="text-[11px] text-amber-400 font-medium">
            {filteredDishes.length} créations
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {filteredDishes.map((dish) => {
            const isAdded = justAddedDishId === dish.id;
            return (
              <div
                key={dish.id}
                onClick={() => onOpenDish(dish)}
                className={`relative rounded-2xl bg-[#170c12]/90 border border-amber-950/50 p-3 flex flex-col justify-between hover:border-amber-600/40 transition-all cursor-pointer group shadow-lg ${
                  !dish.isAvailable ? 'opacity-65' : ''
                }`}
              >
                {/* Food Image */}
                <div className="relative h-28 sm:h-32 w-full rounded-xl overflow-hidden bg-black/50 mb-2">
                  <img
                    src={dish.image}
                    alt={dish.name[language] || dish.name.fr}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {!dish.isAvailable && (
                    <div className="absolute inset-0 bg-black/75 flex items-center justify-center p-1 text-center">
                      <span className="text-[10px] font-bold text-red-300 uppercase tracking-tight bg-red-950/80 px-2 py-0.5 rounded border border-red-800">
                        {t.soldOut}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="space-y-1">
                  <h3 className="font-bold text-xs sm:text-sm text-white uppercase font-sans line-clamp-1">
                    {dish.name[language] || dish.name.fr}
                  </h3>
                  <p className="text-[11px] text-neutral-400 line-clamp-1 leading-snug">
                    {dish.description[language] || dish.description.fr}
                  </p>
                </div>

                {/* Bottom Row: Price + Add Button */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-neutral-800/80">
                  <span className="text-xs sm:text-sm font-bold text-amber-400 tabular-nums">
                    {dish.priceMAD} MAD
                  </span>

                  <button
                    type="button"
                    disabled={!dish.isAvailable}
                    onClick={(e) => handleQuickAddClick(dish, e)}
                    aria-label={`Ajouter ${dish.name[language] || dish.name.fr}`}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-black font-bold transition-all ${
                      isAdded
                        ? 'bg-emerald-400 scale-110'
                        : 'bg-amber-500 hover:bg-amber-400 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed'
                    }`}
                  >
                    {isAdded ? <Check size={14} strokeWidth={3} /> : <Plus size={15} strokeWidth={3} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
