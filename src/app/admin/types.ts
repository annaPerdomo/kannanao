export interface EmbedDeckStat {
  deckId: string;
  deckName: string;
  deckEmoji: string;
  deckOwner: string;
  totalCards: number;
  sessions: number;
  completions: number;
  completionRate: number | null;
  avgCardsFlipped: number | null;
  avgDurationSeconds: number | null;
  topDropOffCard: number | null;
  cardDifficulty: { cardIndex: number; flips: number }[];
  lastViewedAt: string | null;
}

export interface EmbedAnalyticsData {
  overview: {
    totalSessions: number;
    totalCompletions: number;
  };
  referrers: { source: string; sessions: number }[];
  sessionsOverTime: { date: string; sessions: number }[];
  decks: EmbedDeckStat[];
}

export interface MemberActivityEntry {
  userId: string;
  username: string;
  displayName: string | null;
  totalSessions: number;
  recentSessions: number;
  totalCardsStudied: number;
  accuracy: number | null;
  totalDurationMins: number;
  lastActiveAt: string | null;
}
