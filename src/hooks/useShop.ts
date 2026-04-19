'use client';

import { useCallback, useEffect, useState } from 'react';
import { sb } from '@/lib/supabase';
import type { ShopItem, CardBorderStyle, CelebTheme, BuddyConfig, UserPurchase, UserEquipped } from '@/types/shop';

// ─── Shop catalog ────────────────────────────────────────────────────────────

export const SHOP_ITEMS: ShopItem[] = [
  // ── Themes ──
  { key: 'theme_sakura',   name: 'Sakura',       description: 'Classic kawaii pink & lavender',           category: 'theme', price: 0,    preview: '#F472B6', emoji: '🌸' },
  { key: 'theme_murasaki', name: 'Murasaki',     description: 'Dreamy violet & pink',                    category: 'theme', price: 0,    preview: '#A78BFA', emoji: '💜' },
  { key: 'theme_yuki',     name: 'Yuki',         description: 'Frosty sky blue & violet',                category: 'theme', price: 0,    preview: '#38BDF8', emoji: '❄️' },
  { key: 'theme_ocean',    name: 'Ocean Blue',   description: 'Deep blue seas & teal waves',             category: 'theme', price: 500,  preview: '#60A5FA', emoji: '🌊' },
  { key: 'theme_forest',   name: 'Forest Green', description: 'Lush green canopy & emerald accents',     category: 'theme', price: 1200, preview: '#4ADE80', emoji: '🌲' },
  { key: 'theme_sunset',   name: 'Sunset Orange',description: 'Warm golden hour glow',                   category: 'theme', price: 2500, preview: '#FB923C', emoji: '🌅' },
  { key: 'theme_lavender', name: 'Lavender',     description: 'Soft purple fields & delicate pink',      category: 'theme', price: 4000, preview: '#C084FC', emoji: '💐' },
  { key: 'theme_midnight', name: 'Midnight',     description: 'Cool slate & starlit blue',               category: 'theme', price: 6000, preview: '#475569', emoji: '🌙' },
  { key: 'theme_matcha',   name: 'Matcha',       description: 'Earthy green tea & fresh lime',           category: 'theme', price: 9000, preview: '#84CC16', emoji: '🍵' },
  { key: 'theme_rosegold', name: 'Rose Gold',    description: 'Elegant rose & warm amber shimmer',       category: 'theme', price: 15000, preview: '#FB7185', emoji: '🌹' },

  // ── Card borders ──
  { key: 'border_none',       name: 'Default',         description: 'Clean, no extra border',                       category: 'card_border', price: 0,    preview: 'none',                                          emoji: '📋' },
  { key: 'border_golden',     name: 'Golden Frame',    description: 'Luxurious gold border with warm glow',         category: 'card_border', price: 300,  preview: 'linear-gradient(135deg, #FFD700, #FFA500)',     emoji: '✨' },
  { key: 'border_rainbow',    name: 'Rainbow',         description: 'Shifting rainbow gradient border',             category: 'card_border', price: 800,  preview: 'linear-gradient(135deg, #FF6B6B, #FECA57, #48DBFB, #FF9FF3)', emoji: '🌈' },
  { key: 'border_sakura',     name: 'Cherry Blossom',  description: 'Soft pink petals with gentle glow',            category: 'card_border', price: 1500, preview: 'linear-gradient(135deg, #FFC0CB, #FF69B4)',     emoji: '🌸' },
  { key: 'border_starry',     name: 'Starry Night',    description: 'Deep blue with twinkling star shimmer',        category: 'card_border', price: 2500, preview: 'linear-gradient(135deg, #191970, #4169E1)',     emoji: '🌃' },
  { key: 'border_neon',       name: 'Neon Glow',       description: 'Electric neon cyan with bright glow',          category: 'card_border', price: 4000, preview: 'linear-gradient(135deg, #00FFFF, #FF00FF)',     emoji: '💡' },
  { key: 'border_watercolor', name: 'Watercolor',      description: 'Soft pastel watercolor wash',                  category: 'card_border', price: 6000, preview: 'linear-gradient(135deg, #A8E6CF, #DCEDC1, #FFD3B6, #FFAAA5)', emoji: '🎨' },
  { key: 'border_origami',    name: 'Origami',         description: 'Geometric paper-fold pattern in warm tones',   category: 'card_border', price: 8500, preview: 'linear-gradient(135deg, #E8D5B7, #F5E6CC, #D4A574)', emoji: '🦢' },
  { key: 'border_dragon',     name: 'Dragon Scale',    description: 'Fiery red & gold with blazing glow',           category: 'card_border', price: 12000, preview: 'linear-gradient(135deg, #8B0000, #FF4500, #FFD700)', emoji: '🐉' },

  // ── Celebrations ──
  { key: 'celeb_hearts',       name: 'Heart Burst',     description: 'Fill the screen with cascading hearts!',        category: 'celebration', price: 2000,  emoji: '💖' },
  { key: 'celeb_stars',        name: 'Star Shower',     description: 'A golden rain of twinkling stars',              category: 'celebration', price: 5000,  emoji: '⭐' },
  { key: 'celeb_bunnies',      name: 'Bunny Parade',    description: 'Adorable bunnies hop across your screen',       category: 'celebration', price: 12000, emoji: '🐰' },
  { key: 'celeb_rainbow',      name: 'Rainbow Pop',     description: 'Explode with all the colors of the rainbow',    category: 'celebration', price: 25000, emoji: '🌈' },
  { key: 'celeb_sparkle_pink', name: 'Sparkle Pink',    description: 'Dreamy pink sparkles and glitter cascade',      category: 'celebration', price: 40000, emoji: '✨' },
  { key: 'celeb_galaxy',       name: 'Galaxy Burst',    description: 'Deep space fireworks with cosmic shimmer',      category: 'celebration', price: 60000, emoji: '🌌' },

  // ── Study Buddies ──
  { key: 'buddy_bunny',    name: 'Bunny',     description: 'An adorable bunny hopping with encouragement', category: 'study_buddy', price: 8000,   emoji: '🐰' },
  { key: 'buddy_penguin',  name: 'Penguin',   description: 'A cool penguin who loves learning!',           category: 'study_buddy', price: 20000,  emoji: '🐧' },
  { key: 'buddy_panda',    name: 'Panda',     description: 'A gentle panda with wise study vibes',         category: 'study_buddy', price: 40000,  emoji: '🐼' },
  { key: 'buddy_fox',      name: 'Fox',       description: 'A clever fox that keeps you sharp!',           category: 'study_buddy', price: 65000,  emoji: '🦊' },
  { key: 'buddy_pink_cat', name: 'Pink Cat',  description: 'A cheerful pink kitty that cheers you on!',   category: 'study_buddy', price: 100000, emoji: '🐱' },

  // ── Coming Soon ──
  { key: 'theme_cottagecore', name: 'Cottagecore',     description: 'Cozy countryside warmth — coming soon!',        category: 'theme',       price: 0, preview: '#D2B48C', emoji: '🧸', comingSoon: true },
  { key: 'theme_galaxy',     name: 'Galaxy',          description: 'Deep space sparkles — coming soon!',            category: 'theme',       price: 0, preview: '#6B21A8', emoji: '🪐', comingSoon: true },
  { key: 'border_crystal',   name: 'Crystal Ice',     description: 'Shimmering frozen crystal edges — coming soon!', category: 'card_border', price: 0, preview: 'linear-gradient(135deg, #E0F7FA, #80DEEA, #B2EBF2)', emoji: '💎', comingSoon: true },
  { key: 'border_floral',    name: 'Floral Garden',   description: 'Blooming flower frame — coming soon!',          category: 'card_border', price: 0, preview: 'linear-gradient(135deg, #F8BBD0, #CE93D8, #F48FB1)', emoji: '🌺', comingSoon: true },
];

/** Map item key → CSS styles for card borders */
export const CARD_BORDER_STYLES: Record<string, CardBorderStyle> = {
  border_none: {},
  border_golden: {
    border: '2.5px solid #FFD700',
    boxShadow: '0 0 12px rgba(255, 215, 0, 0.35), inset 0 0 6px rgba(255, 215, 0, 0.10)',
  },
  border_rainbow: {
    border: '2.5px solid transparent',
    background: 'linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #FF6B6B, #FECA57, #48DBFB, #FF9FF3, #FF6B6B) border-box',
    boxShadow: '0 0 14px rgba(255, 107, 107, 0.20)',
  },
  border_sakura: {
    border: '2.5px solid #FF69B4',
    boxShadow: '0 0 16px rgba(255, 105, 180, 0.30), 0 0 32px rgba(255, 192, 203, 0.15)',
  },
  border_starry: {
    border: '2.5px solid #4169E1',
    boxShadow: '0 0 14px rgba(65, 105, 225, 0.35), 0 0 28px rgba(25, 25, 112, 0.15)',
  },
  border_neon: {
    border: '2px solid #00FFFF',
    boxShadow: '0 0 8px #00FFFF, 0 0 20px rgba(0, 255, 255, 0.3), 0 0 40px rgba(255, 0, 255, 0.1)',
  },
  border_watercolor: {
    border: '3px solid transparent',
    background: 'linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #A8E6CF, #DCEDC1, #FFD3B6, #FFAAA5) border-box',
    boxShadow: '0 0 12px rgba(168, 230, 207, 0.25)',
  },
  border_origami: {
    border: '3px solid #D4A574',
    boxShadow: '0 0 10px rgba(212, 165, 116, 0.25), inset 0 0 4px rgba(232, 213, 183, 0.15)',
  },
  border_dragon: {
    border: '2.5px solid #FF4500',
    boxShadow: '0 0 12px rgba(255, 69, 0, 0.35), 0 0 24px rgba(139, 0, 0, 0.20), 0 0 4px rgba(255, 215, 0, 0.3)',
  },
};

/** Map celebration item key → CelebTheme config (colors + emoji set) */
export const CELEBRATION_THEMES: Record<string, CelebTheme> = {
  celeb_hearts:       { colors: ['#FF69B4', '#FF1493', '#FFB6C1', '#FF4D94'], emojis: ['💖', '💗', '💕', '❤️', '💝'] },
  celeb_stars:        { colors: ['#FFD700', '#FFA500', '#FFEC3D', '#FFB300'], emojis: ['⭐', '🌟', '✨', '💫', '🌠'] },
  celeb_bunnies:      { colors: ['#FFB6C1', '#DDA0DD', '#F8BBD0', '#FF69B4'], emojis: ['🐰', '🐇', '🌸', '💐', '🥕'] },
  celeb_rainbow:      { colors: ['#FF6B6B', '#FFA500', '#FFD700', '#4ADE80', '#38BDF8', '#818CF8'], emojis: ['🌈', '🎨', '🦋', '🌊', '🌟'] },
  celeb_sparkle_pink: { colors: ['#FF69B4', '#FF1493', '#C084FC', '#F472B6', '#FB7185'], emojis: ['✨', '💖', '🌸', '🦩', '💅'] },
  celeb_galaxy:       { colors: ['#6B21A8', '#4338CA', '#0EA5E9', '#818CF8', '#C084FC'], emojis: ['🌌', '🪐', '⭐', '🚀', '💫'] },
};

/** Map buddy item key → config with emoji and reaction text */
export const BUDDY_CONFIG: Record<string, BuddyConfig> = {
  buddy_pink_cat: { emoji: '🐱', reactions: { correct: 'Nyaa~ Perfect!', wrong: 'Mew… try again!', idle: '♪ zzZ~' } },
  buddy_bunny:    { emoji: '🐰', reactions: { correct: 'Hop hop hooray!', wrong: 'Oops, one more time!', idle: '~munches carrot~' } },
  buddy_penguin:  { emoji: '🐧', reactions: { correct: 'Cool! Nailed it!', wrong: 'Brrr, not quite…', idle: '~waddles~' } },
  buddy_panda:    { emoji: '🐼', reactions: { correct: 'Bamboo-tiful!', wrong: 'Hmm, keep going!', idle: '~noms bamboo~' } },
  buddy_fox:      { emoji: '🦊', reactions: { correct: 'Clever answer!', wrong: 'Almost, think again!', idle: '~curls up~' } },
};

/** Map theme item key → ColorScheme value used by the app */
export const THEME_KEY_TO_SCHEME: Record<string, string> = {
  theme_sakura:   'sakura',
  theme_murasaki: 'murasaki',
  theme_yuki:     'yuki',
  theme_ocean:    'ocean',
  theme_forest:   'forest',
  theme_sunset:   'sunset',
  theme_lavender: 'lavender',
  theme_midnight: 'midnight',
  theme_matcha:   'matcha',
  theme_rosegold: 'rosegold',
};

// Free items that every user owns by default
const FREE_ITEM_KEYS = SHOP_ITEMS.filter((i) => i.price === 0 && !i.comingSoon).map((i) => i.key);

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useShop() {
  const supabase = sb;
  const [purchases, setPurchases] = useState<UserPurchase[]>([]);
  const [equipped, setEquipped] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShopData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [{ data: purchaseRows }, { data: equippedRows }] = await Promise.all([
      supabase.from('user_purchases').select('*').eq('user_id', user.id),
      supabase.from('user_equipped').select('*').eq('user_id', user.id),
    ]);

    if (purchaseRows) setPurchases(purchaseRows);
    if (equippedRows) {
      const map: Record<string, string> = {};
      equippedRows.forEach((row: UserEquipped) => { map[row.slot] = row.item_key; });
      setEquipped(map);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchShopData(); }, [fetchShopData]);

  /** Check if a user owns a given item (purchased or free) */
  const ownsItem = useCallback(
    (itemKey: string): boolean => {
      if (FREE_ITEM_KEYS.includes(itemKey)) return true;
      return purchases.some((p) => p.item_key === itemKey);
    },
    [purchases],
  );

  /** Purchase an item — deducts XP via total_xp_spent, inserts purchase, auto-equips */
  const purchaseItem = useCallback(
    async (itemKey: string, spendableXp: number): Promise<{ error: string | null }> => {
      const item = SHOP_ITEMS.find((i) => i.key === itemKey);
      if (!item) return { error: 'Item not found' };
      if (ownsItem(itemKey)) return { error: 'Already owned' };
      if (spendableXp < item.price) return { error: 'Not enough XP' };

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: 'Not authenticated' };

      // Optimistic update
      const prevPurchases = [...purchases];
      const prevEquipped = { ...equipped };
      const newPurchase: UserPurchase = { id: 'temp', item_key: itemKey, purchased_at: new Date().toISOString() };
      setPurchases((prev) => [...prev, newPurchase]);
      setEquipped((prev) => ({ ...prev, [item.category]: itemKey }));

      try {
        // 1. Deduct XP — increment total_xp_spent
        const { error: xpErr } = await supabase.rpc('increment_xp_spent', {
          p_user_id: user.id,
          p_amount: item.price,
        });
        // If the RPC doesn't exist, fall back to a manual update
        if (xpErr) {
          const { data: prog } = await supabase
            .from('user_progress')
            .select('total_xp_spent')
            .eq('user_id', user.id)
            .single();
          const currentSpent = prog?.total_xp_spent ?? 0;
          const { error: updateErr } = await supabase
            .from('user_progress')
            .update({ total_xp_spent: currentSpent + item.price })
            .eq('user_id', user.id);
          if (updateErr) throw updateErr;
        }

        // 2. Insert purchase
        const { error: purchaseErr } = await supabase
          .from('user_purchases')
          .insert({ user_id: user.id, item_key: itemKey });
        if (purchaseErr) throw purchaseErr;

        // 3. Auto-equip
        const { error: equipErr } = await supabase
          .from('user_equipped')
          .upsert(
            { user_id: user.id, slot: item.category, item_key: itemKey },
            { onConflict: 'user_id,slot' },
          );
        if (equipErr) throw equipErr;

        // Refresh to get real IDs
        await fetchShopData();
        setError(null);
        return { error: null };
      } catch (err) {
        // Rollback
        setPurchases(prevPurchases);
        setEquipped(prevEquipped);
        const msg = err instanceof Error ? err.message : 'Purchase failed';
        setError(msg);
        return { error: msg };
      }
    },
    [purchases, equipped, ownsItem, supabase, fetchShopData],
  );

  /** Equip an owned item in its category slot */
  const equipItem = useCallback(
    async (itemKey: string): Promise<{ error: string | null }> => {
      const item = SHOP_ITEMS.find((i) => i.key === itemKey);
      if (!item) return { error: 'Item not found' };
      if (!ownsItem(itemKey)) return { error: 'Item not owned' };

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: 'Not authenticated' };

      const prevEquipped = { ...equipped };
      setEquipped((prev) => ({ ...prev, [item.category]: itemKey }));

      try {
        const { error: err } = await supabase
          .from('user_equipped')
          .upsert(
            { user_id: user.id, slot: item.category, item_key: itemKey },
            { onConflict: 'user_id,slot' },
          );
        if (err) throw err;
        setError(null);
        return { error: null };
      } catch (err) {
        setEquipped(prevEquipped);
        const msg = err instanceof Error ? err.message : 'Equip failed';
        setError(msg);
        return { error: msg };
      }
    },
    [equipped, ownsItem, supabase],
  );

  /** Unequip an item slot (reverts to default) */
  const unequipItem = useCallback(
    async (slot: string): Promise<{ error: string | null }> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: 'Not authenticated' };

      const prevEquipped = { ...equipped };
      setEquipped((prev) => {
        const next = { ...prev };
        delete next[slot];
        return next;
      });

      try {
        const { error: err } = await supabase
          .from('user_equipped')
          .delete()
          .eq('user_id', user.id)
          .eq('slot', slot);
        if (err) throw err;
        setError(null);
        return { error: null };
      } catch (err) {
        setEquipped(prevEquipped);
        const msg = err instanceof Error ? err.message : 'Unequip failed';
        setError(msg);
        return { error: msg };
      }
    },
    [equipped, supabase],
  );

  return {
    purchases,
    equipped,
    loading,
    error,
    ownsItem,
    purchaseItem,
    equipItem,
    unequipItem,
    refetch: fetchShopData,
  };
}
