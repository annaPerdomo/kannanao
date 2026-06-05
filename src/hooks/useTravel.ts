'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  dbDeleteShowCard,
  dbSaveShowCard,
  dbUpdateShowCard,
  loadShowCards,
  sb,
} from '@/lib/supabase';
import type {
  CultureCard,
  CultureTopic,
  PhraseSituation,
  ScenarioCategory,
  ShowCard,
  ShowCardCategory,
  TravelDisplayMode,
} from '@/types/travel';

import { SURVIVAL_PHRASES } from './survivalPhrasesData';

const BASE = '/api/travel';

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Scenario Hook ────────────────────────────────────────────────

export interface ScenarioResponse {
  /** User's coached phrase (present after first user input) */
  bestPhrase?: string;
  bestPhraseRomaji?: string;
  bestPhraseEnglish?: string;
  explanation?: string;
  alternative?: string;
  alternativeRomaji?: string;
  alternativeExplanation?: string;
  /** NPC's next line */
  npcJapanese: string;
  npcRomaji: string;
  npcEnglish: string;
  context: string;
  culturalTip?: string;
  /** Hints for what the user might want to say next */
  suggestedResponses: string[];
  isEnding?: boolean;
}

interface ConversationTurn {
  /** What the user typed (English intent) */
  userIntent?: string;
  /** The coached Japanese phrase the AI suggested */
  userJapanese?: string;
  userRomaji?: string;
  userEnglish?: string;
  explanation?: string;
  alternative?: string;
  alternativeRomaji?: string;
  alternativeExplanation?: string;
  /** NPC response */
  npcJapanese: string;
  npcRomaji: string;
  npcEnglish: string;
  context: string;
  culturalTip?: string;
  suggestedResponses: string[];
  isEnding?: boolean;
}

interface HistoryEntry {
  npcJapanese: string;
  npcEnglish: string;
  userIntent: string;
  userJapanese: string;
}

export function useScenario() {
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedPhrases, setSavedPhrases] = useState<
    Array<{ japanese: string; romaji: string; english: string }>
  >([]);

  const startScenario = useCallback(
    async (category: ScenarioCategory, setting?: string, displayMode?: TravelDisplayMode) => {
      setLoading(true);
      setError(null);
      setHistory([]);
      setTurns([]);
      setSavedPhrases([]);

      // Cache the initial NPC greeting by category+setting
      const cacheKey = `travel:scenario:${category}:${setting ?? ''}:${displayMode ?? ''}`;
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const data: ScenarioResponse = JSON.parse(cached);
          setTurns([
            {
              npcJapanese: data.npcJapanese,
              npcRomaji: data.npcRomaji,
              npcEnglish: data.npcEnglish,
              context: data.context,
              culturalTip: data.culturalTip,
              suggestedResponses: data.suggestedResponses ?? [],
              isEnding: data.isEnding,
            },
          ]);
          setLoading(false);
          return;
        }
      } catch {
        /* sessionStorage unavailable */
      }

      try {
        const res = await fetch(`${BASE}/scenario`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
          body: JSON.stringify({ category, setting, history: [], displayMode }),
        });
        if (!res.ok) throw new Error('Failed to start scenario');
        const data: ScenarioResponse = await res.json();
        setTurns([
          {
            npcJapanese: data.npcJapanese,
            npcRomaji: data.npcRomaji,
            npcEnglish: data.npcEnglish,
            context: data.context,
            culturalTip: data.culturalTip,
            suggestedResponses: data.suggestedResponses ?? [],
            isEnding: data.isEnding,
          },
        ]);

        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(data));
        } catch {
          /* full */
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start scenario');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const respond = useCallback(
    async (
      category: ScenarioCategory,
      setting: string,
      userIntent: string,
      displayMode?: TravelDisplayMode,
    ) => {
      const lastTurn = turns[turns.length - 1];
      if (!lastTurn) return;

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${BASE}/scenario`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
          body: JSON.stringify({
            category,
            setting,
            userIntent,
            displayMode,
            history: [
              ...history.slice(-9),
              {
                npcJapanese: lastTurn.npcJapanese,
                npcEnglish: lastTurn.npcEnglish,
                userIntent,
                userJapanese: '(pending)',
              },
            ],
          }),
        });
        if (!res.ok) throw new Error('Failed to continue scenario');
        const data: ScenarioResponse = await res.json();

        const actualJapanese = data.bestPhrase ?? userIntent;

        // Update history with the actual Japanese phrase
        const updatedHistory: HistoryEntry[] = [
          ...history,
          {
            npcJapanese: lastTurn.npcJapanese,
            npcEnglish: lastTurn.npcEnglish,
            userIntent,
            userJapanese: actualJapanese,
          },
        ];
        setHistory(updatedHistory);

        // Add the new turn
        setTurns((prev) => [
          ...prev,
          {
            userIntent,
            userJapanese: data.bestPhrase,
            userRomaji: data.bestPhraseRomaji,
            userEnglish: data.bestPhraseEnglish,
            explanation: data.explanation,
            alternative: data.alternative,
            alternativeRomaji: data.alternativeRomaji,
            alternativeExplanation: data.alternativeExplanation,
            npcJapanese: data.npcJapanese,
            npcRomaji: data.npcRomaji,
            npcEnglish: data.npcEnglish,
            context: data.context,
            culturalTip: data.culturalTip,
            suggestedResponses: data.suggestedResponses ?? [],
            isEnding: data.isEnding,
          },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to continue scenario');
      } finally {
        setLoading(false);
      }
    },
    [turns, history],
  );

  const savePhrase = useCallback(
    (phrase: { japanese: string; romaji: string; english: string }) => {
      setSavedPhrases((prev) => {
        if (prev.some((p) => p.japanese === phrase.japanese)) return prev;
        return [...prev, phrase];
      });
    },
    [],
  );

  const reset = useCallback(() => {
    setTurns([]);
    setHistory([]);
    setError(null);
    setSavedPhrases([]);
  }, []);

  return { turns, loading, error, savedPhrases, startScenario, respond, savePhrase, reset };
}

// ─── Show Cards Hook ──────────────────────────────────────────────

export function useShowCards() {
  const [cards, setCards] = useState<ShowCard[]>(DEFAULT_SHOW_CARDS);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load saved custom cards from DB on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await loadShowCards();
        if (!cancelled && saved.length > 0) {
          setCards((prev) => [...saved, ...prev]);
        }
      } catch {
        // DB load failed — default cards still available
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const generateCard = useCallback(async (message: string, displayMode?: TravelDisplayMode) => {
    const cacheKey = `travel:showcard:${displayMode ?? ''}:${message.trim().toLowerCase()}`;

    // Check sessionStorage cache to avoid duplicate API calls
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        // Return cached card without re-inserting into DB (already saved on first generate)
        const newCard: ShowCard = { id: `custom-${Date.now()}`, ...data, isCustom: true };
        setCards((prev) => [newCard, ...prev]);
        return newCard;
      }
    } catch {
      /* sessionStorage unavailable */
    }

    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/show-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ message, displayMode }),
      });
      if (!res.ok) throw new Error('Failed to generate show card');
      const data = await res.json();

      // Cache to avoid duplicate API calls
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(data));
      } catch {
        /* full */
      }

      // Save to DB. Authenticate the user via getUser() (verified against the
      // Auth server) rather than trusting the user object from getSession().
      const {
        data: { user },
      } = await sb.auth.getUser();
      const userId = user?.id;
      if (userId) {
        const saved = await dbSaveShowCard(data, userId);
        setCards((prev) => [saved, ...prev]);
        return saved;
      }

      // Fallback if no auth (shouldn't happen, but be safe)
      const newCard: ShowCard = { id: `custom-${Date.now()}`, ...data, isCustom: true };
      setCards((prev) => [newCard, ...prev]);
      return newCard;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate card');
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);

  const updateCard = useCallback(
    async (
      id: string,
      patch: Partial<
        Pick<ShowCard, 'english' | 'japanese' | 'romaji' | 'situation' | 'icon' | 'category'>
      >,
    ) => {
      // Optimistic update
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
      try {
        await dbUpdateShowCard(id, patch);
      } catch {
        // Rollback
        const saved = await loadShowCards();
        setCards([...saved, ...DEFAULT_SHOW_CARDS]);
      }
    },
    [],
  );

  const deleteCard = useCallback(async (id: string) => {
    // Optimistic remove
    setCards((prev) => prev.filter((c) => c.id !== id));
    try {
      await dbDeleteShowCard(id);
    } catch {
      // Rollback: reload from DB
      const saved = await loadShowCards();
      setCards([...saved, ...DEFAULT_SHOW_CARDS]);
    }
  }, []);

  const filterByCategory = useCallback(
    (category: ShowCardCategory | 'all') => {
      if (category === 'all') return cards;
      if (category === 'custom') return cards.filter((c) => c.isCustom);
      return cards.filter((c) => c.category === category);
    },
    [cards],
  );

  return {
    cards,
    generating,
    loading,
    error,
    generateCard,
    updateCard,
    deleteCard,
    filterByCategory,
  };
}

// ─── Survival Phrases Hook ────────────────────────────────────────

export function useSurvivalPhrases() {
  const [activeSituation, setActiveSituation] = useState<PhraseSituation | null>(null);

  const phrases = activeSituation
    ? SURVIVAL_PHRASES.filter((p) => p.situation === activeSituation)
    : [];

  const loadPhrases = useCallback((situation: PhraseSituation) => {
    setActiveSituation(situation);
  }, []);

  const reset = useCallback(() => {
    setActiveSituation(null);
  }, []);

  return { phrases, loading: false, error: null, activeSituation, loadPhrases, reset };
}

// ─── Culture Cards Hook ───────────────────────────────────────────

export function useCultureCards() {
  const [activeTopic, setActiveTopic] = useState<CultureTopic | null>(null);

  const getCards = useCallback((topic: CultureTopic | 'all') => {
    if (topic === 'all') return CULTURE_CARDS;
    return CULTURE_CARDS.filter((c) => c.topic === topic);
  }, []);

  return { cards: CULTURE_CARDS, activeTopic, setActiveTopic, getCards };
}

// ─── Default Data ─────────────────────────────────────────────────

const DEFAULT_SHOW_CARDS: ShowCard[] = [
  {
    id: 'default-1',
    category: 'allergies',
    english: "I'm allergic to peanuts",
    japanese: 'ピーナッツアレルギーがあります',
    romaji: 'piinattsu arerugii ga arimasu',
    situation: 'Show to restaurant staff before ordering',
    icon: '🥜',
    isCustom: false,
  },
  {
    id: 'default-2',
    category: 'allergies',
    english: "I can't eat shellfish",
    japanese: '甲殻類が食べられません',
    romaji: 'koukakurui ga taberaremasen',
    situation: 'Show at any seafood restaurant',
    icon: '🦐',
    isCustom: false,
  },
  {
    id: 'default-3',
    category: 'allergies',
    english: 'I am vegetarian',
    japanese: 'ベジタリアンです。肉と魚は食べません',
    romaji: 'bejitarian desu. niku to sakana wa tabemasen',
    situation: 'Show when ordering — Japanese vegetarian dishes may contain dashi (fish stock)',
    icon: '🥬',
    isCustom: false,
  },
  {
    id: 'default-4',
    category: 'directions',
    english: 'Please take me to this address',
    japanese: 'この住所までお願いします',
    romaji: 'kono juusho made onegai shimasu',
    situation: 'Show to taxi driver with the address written below',
    icon: '🚕',
    isCustom: false,
  },
  {
    id: 'default-5',
    category: 'directions',
    english: 'Where is the nearest station?',
    japanese: '一番近い駅はどこですか？',
    romaji: 'ichiban chikai eki wa doko desu ka?',
    situation: 'Show to anyone on the street when lost',
    icon: '🚉',
    isCustom: false,
  },
  {
    id: 'default-6',
    category: 'help',
    english: "I don't speak Japanese. Can you help me?",
    japanese: '日本語が話せません。助けていただけますか？',
    romaji: 'nihongo ga hanasemasen. tasukete itadakemasu ka?',
    situation: "Show when you need help and can't communicate verbally",
    icon: '🙏',
    isCustom: false,
  },
  {
    id: 'default-7',
    category: 'medical',
    english: 'I need a doctor. I feel sick.',
    japanese: '医者に診てもらいたいです。具合が悪いです',
    romaji: 'isha ni mite moraitai desu. guai ga warui desu',
    situation: 'Show at hotel front desk or pharmacy',
    icon: '🏥',
    isCustom: false,
  },
  {
    id: 'default-8',
    category: 'communication',
    english: 'Could you write it down for me?',
    japanese: '書いていただけますか？',
    romaji: 'kaite itadakemasu ka?',
    situation:
      "When someone is trying to tell you something but you can't understand spoken Japanese",
    icon: '✍️',
    isCustom: false,
  },
  {
    id: 'default-9',
    category: 'preferences',
    english: 'No spicy food please',
    japanese: '辛くないものをお願いします',
    romaji: 'karakunai mono wo onegai shimasu',
    situation: 'Show when ordering at any restaurant',
    icon: '🌶️',
    isCustom: false,
  },
  {
    id: 'default-10',
    category: 'directions',
    english: 'I am going to this hotel',
    japanese: 'このホテルに行きたいです',
    romaji: 'kono hoteru ni ikitai desu',
    situation: 'Show to taxi driver or helpful passerby, with hotel name/address visible',
    icon: '🏨',
    isCustom: false,
  },
  {
    id: 'default-11',
    category: 'help',
    english: 'I am lost. Can you show me on this map?',
    japanese: '道に迷っています。地図で教えていただけますか？',
    romaji: 'michi ni mayotte imasu. chizu de oshiete itadakemasu ka?',
    situation: 'Show with your phone map open so they can point',
    icon: '🗺️',
    isCustom: false,
  },
  {
    id: 'default-12',
    category: 'communication',
    english: 'Could you speak more slowly?',
    japanese: 'もっとゆっくり話していただけますか？',
    romaji: 'motto yukkuri hanashite itadakemasu ka?',
    situation: 'When someone is trying to help but speaking too fast',
    icon: '🐢',
    isCustom: false,
  },
];

const CULTURE_CARDS: CultureCard[] = [
  {
    id: 'culture-1',
    topic: 'trains',
    title: 'Quiet on the Train',
    icon: '🤫',
    rule: 'Do not talk on the phone or talk loudly on trains',
    explanation:
      "Japanese trains are remarkably quiet. Phone calls are taboo, and even conversations should be kept to a whisper. You'll see signs showing a phone with an X through it. Many Japanese people will stare if you break this rule.",
    phrases: [
      {
        japanese: 'マナーモード',
        romaji: 'manaa moodo',
        english: 'Manner mode (silent mode on your phone)',
      },
      {
        japanese: 'すみません',
        romaji: 'sumimasen',
        english: 'Excuse me (when squeezing past people)',
      },
    ],
    importance: 'essential',
  },
  {
    id: 'culture-2',
    topic: 'trains',
    title: 'Priority Seats',
    icon: '💺',
    rule: 'Give up priority seats (yuu-sen-seki) to elderly, pregnant, or disabled passengers',
    explanation:
      "Priority seats are clearly marked in a different color (usually blue or grey). Even if the train is empty, some Japanese people avoid sitting there. If it's crowded and you're in one, offer it to those who need it.",
    phrases: [
      { japanese: '優先席', romaji: 'yuusen seki', english: 'Priority seat' },
      { japanese: 'どうぞ', romaji: 'douzo', english: 'Please (go ahead / take it)' },
    ],
    importance: 'essential',
  },
  {
    id: 'culture-3',
    topic: 'restaurants',
    title: 'No Tipping',
    icon: '💴',
    rule: 'Never tip in Japan — it can be seen as insulting',
    explanation:
      'Tipping implies the worker needs charity or that the service wasn\'t already included in the price. Some staff will chase you down the street to return money you "accidentally" left behind. The price on the menu is what you pay.',
    phrases: [
      {
        japanese: 'ごちそうさまでした',
        romaji: 'gochisousama deshita',
        english: 'Thank you for the meal (said when leaving)',
      },
      {
        japanese: 'おいしかったです',
        romaji: 'oishikatta desu',
        english: 'It was delicious (best compliment you can give)',
      },
    ],
    importance: 'essential',
  },
  {
    id: 'culture-4',
    topic: 'restaurants',
    title: 'Entering a Restaurant',
    icon: '🍜',
    rule: 'Wait to be seated. Say "sumimasen" to get attention.',
    explanation:
      'Staff will greet you with "irasshaimase!" (welcome!). You don\'t need to respond. Wait at the entrance until shown to a seat. To call a waiter, say "sumimasen" or press the call button on your table (many restaurants have these).',
    phrases: [
      {
        japanese: 'いらっしゃいませ',
        romaji: 'irasshaimase',
        english: 'Welcome! (staff will say this to you)',
      },
      { japanese: '一人です', romaji: 'hitori desu', english: 'One person (table for one)' },
      { japanese: '二人です', romaji: 'futari desu', english: 'Two people (table for two)' },
    ],
    importance: 'essential',
  },
  {
    id: 'culture-5',
    topic: 'general',
    title: 'Shoes Off Indoors',
    icon: '👟',
    rule: 'Remove shoes when entering homes, many restaurants, temples, and fitting rooms',
    explanation:
      "If you see a raised floor (genkan) at an entrance, or a row of shoes, take yours off. There's usually a shoe shelf or plastic bag. Some places provide slippers. Socks are fine — barefoot in certain traditional spaces.",
    phrases: [
      {
        japanese: '靴を脱いでください',
        romaji: 'kutsu wo nuide kudasai',
        english: 'Please remove your shoes (you might see this sign)',
      },
      { japanese: 'スリッパ', romaji: 'surippa', english: 'Slippers' },
    ],
    importance: 'essential',
  },
  {
    id: 'culture-6',
    topic: 'general',
    title: 'Bowing',
    icon: '🙇',
    rule: "A small head nod is enough for tourists — you don't need to do a full bow",
    explanation:
      "Japanese people don't expect foreigners to bow perfectly. A slight head nod when saying thank you or excuse me is appreciated and shows respect. The deeper the bow, the more formal/apologetic it is. Don't bow while walking!",
    phrases: [
      {
        japanese: 'ありがとうございます',
        romaji: 'arigatou gozaimasu',
        english: 'Thank you very much',
      },
      { japanese: 'すみません', romaji: 'sumimasen', english: "Excuse me / I'm sorry" },
    ],
    importance: 'recommended',
  },
  {
    id: 'culture-7',
    topic: 'onsen',
    title: 'Onsen (Hot Spring) Rules',
    icon: '♨️',
    rule: 'Wash THOROUGHLY before entering the bath. No swimsuits. Small towel stays out of water.',
    explanation:
      "Onsens are shared baths — you must be completely clean before entering. Shower/scrub at the washing stations first. Enter naked (they're gender-separated). Your small towel can go on your head but never in the water. Tattoos may be prohibited at some places.",
    phrases: [
      { japanese: '温泉', romaji: 'onsen', english: 'Hot spring bath' },
      { japanese: 'タトゥーOKですか？', romaji: 'tatuu OK desu ka?', english: 'Are tattoos OK?' },
      { japanese: '露天風呂', romaji: 'rotenburo', english: 'Outdoor bath' },
    ],
    importance: 'essential',
  },
  {
    id: 'culture-8',
    topic: 'shrines',
    title: 'Shrine & Temple Etiquette',
    icon: '⛩️',
    rule: "Wash hands at the water basin. Don't walk in the center of the torii gate path.",
    explanation:
      'The center of the path is reserved for the gods. Walk to the side. At the water basin (temizuya): rinse left hand, then right, then pour water into your left hand to rinse your mouth (spit discreetly). Toss a coin, bow twice, clap twice, bow once.',
    phrases: [
      { japanese: '神社', romaji: 'jinja', english: 'Shinto shrine' },
      { japanese: 'お寺', romaji: 'otera', english: 'Buddhist temple' },
      { japanese: 'おみくじ', romaji: 'omikuji', english: 'Fortune slip (fun to try!)' },
    ],
    importance: 'recommended',
  },
  {
    id: 'culture-9',
    topic: 'general',
    title: 'Trash Cans Are Rare',
    icon: '🗑️',
    rule: 'Carry your trash with you — public bins are almost nonexistent',
    explanation:
      "After the 1995 sarin gas attacks, most public trash cans were removed. You'll find bins at convenience stores (for items bought there) and train stations. Most Japanese people carry a small bag for trash. Vending machines have a bottle recycling bin next to them.",
    phrases: [
      {
        japanese: 'ゴミ箱はどこですか？',
        romaji: 'gomibako wa doko desu ka?',
        english: 'Where is the trash can?',
      },
      { japanese: 'コンビニ', romaji: 'konbini', english: 'Convenience store (always has a bin)' },
    ],
    importance: 'recommended',
  },
  {
    id: 'culture-10',
    topic: 'taboos',
    title: 'Chopstick Rules',
    icon: '🥢',
    rule: 'Never stick chopsticks upright in rice. Never pass food chopstick-to-chopstick.',
    explanation:
      'Sticking chopsticks in rice resembles funeral incense rituals. Passing food between chopsticks mimics a cremation ceremony. Both are deeply taboo. Rest chopsticks on the hashioki (rest) or across your bowl. Use the serving end to take from shared plates.',
    phrases: [
      { japanese: 'お箸', romaji: 'ohashi', english: 'Chopsticks' },
      { japanese: 'フォーク', romaji: 'fooku', english: "Fork (it's OK to ask!)" },
      { japanese: 'スプーン', romaji: 'supuun', english: 'Spoon' },
    ],
    importance: 'essential',
  },
  {
    id: 'culture-11',
    topic: 'shopping',
    title: 'Money Tray',
    icon: '💰',
    rule: "Place cash on the small tray at the register — don't hand it directly to the cashier",
    explanation:
      "Most shops have a small plastic tray by the register. Place your bills/coins there rather than in the cashier's hand. They'll give you change the same way. This isn't rude — it's the polite norm. Credit cards are increasingly accepted but carry cash as backup.",
    phrases: [
      {
        japanese: 'カードで払えますか？',
        romaji: 'kaado de haraemasu ka?',
        english: 'Can I pay by card?',
      },
      {
        japanese: '現金のみ',
        romaji: 'genkin nomi',
        english: 'Cash only (you might see this sign)',
      },
      {
        japanese: 'レシートいりません',
        romaji: 'reshiito irimasen',
        english: "I don't need a receipt",
      },
    ],
    importance: 'recommended',
  },
  {
    id: 'culture-12',
    topic: 'gestures',
    title: 'The "Me?" Gesture',
    icon: '👈',
    rule: 'Japanese people point to their nose (not chest) when referring to themselves',
    explanation:
      'If someone points to their nose, they\'re asking "me?" In the West we point to our chest. It\'s a small cultural difference but understanding it prevents confusion. Also: waving your hand in front of your face means "no" or "I can\'t" — not "it smells bad."',
    phrases: [
      { japanese: '私', romaji: 'watashi', english: 'Me / I' },
      {
        japanese: '大丈夫です',
        romaji: 'daijoubu desu',
        english: "I'm fine / It's OK / No thanks",
      },
    ],
    importance: 'nice_to_know',
  },
  {
    id: 'culture-13',
    topic: 'general',
    title: 'Convenience Stores Are Amazing',
    icon: '🏪',
    rule: 'Konbini (7-Eleven, Lawson, FamilyMart) are your best friend — ATMs, food, tickets, WiFi',
    explanation:
      'Japanese convenience stores are nothing like Western ones. They have: international ATMs, surprisingly good hot food, clean bathrooms, WiFi, event tickets, package shipping, phone chargers, and even laundry services. Open 24/7. Learn to love them.',
    phrases: [
      { japanese: 'コンビニ', romaji: 'konbini', english: 'Convenience store' },
      {
        japanese: '温めますか？',
        romaji: 'atatamemasu ka?',
        english: 'Shall I heat it up? (staff will ask for bento/onigiri)',
      },
      {
        japanese: 'お箸つけますか？',
        romaji: 'ohashi tsukemasu ka?',
        english: 'Do you want chopsticks? (staff will ask)',
      },
    ],
    importance: 'recommended',
  },
  {
    id: 'culture-14',
    topic: 'taboos',
    title: "Don't Eat While Walking",
    icon: '🚶',
    rule: 'Eating while walking is considered rude in most situations',
    explanation:
      'Find a bench or stand near where you bought food to eat it. Street food areas (like Nishiki Market in Kyoto) are exceptions, but even there some shops provide a standing area. Ice cream is generally acceptable while walking. Drinking from vending machines next to them is normal.',
    phrases: [
      {
        japanese: 'ここで食べてもいいですか？',
        romaji: 'koko de tabete mo ii desu ka?',
        english: 'Can I eat here?',
      },
      { japanese: 'テイクアウト', romaji: 'teiku auto', english: 'Takeout / To go' },
    ],
    importance: 'recommended',
  },
];
