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

export interface TravelAnalyticsData {
  overview: {
    totalEvents: number;
    uniqueUsers: number;
  };
  featureBreakdown: { feature: string; count: number }[];
  eventsOverTime: { date: string; count: number }[];
  users: {
    userId: string;
    username: string;
    displayName: string | null;
    totalEvents: number;
    featuresUsed: number;
    lastActiveAt: string | null;
  }[];
  scenarioBreakdown: { category: string; count: number }[];
}

export interface KotobaBubbleAnalyticsData {
  overview: {
    totalDecksWithContent: number;
    totalSentences: number;
    totalSessions: number;
    totalXpEarned: number;
    totalMeaningPeeks: number;
  };
  decks: {
    deckId: string;
    deckName: string;
    deckOwner: string;
    total: number;
    questions: number;
    responses: number;
    statements: number;
  }[];
  users: {
    userId: string;
    username: string;
    displayName: string | null;
    totalSessions: number;
    totalCorrect: number;
    totalStudied: number;
    accuracy: number | null;
    totalXp: number;
  }[];
}

export interface MemberActivityEntry {
  userId: string;
  username: string;
  displayName: string | null;
  /** Entitlement tier — independent of being in a group. */
  accountType: 'organizer' | 'member';
  organizerId: string | null;
  totalSessions: number;
  recentSessions: number;
  totalCardsStudied: number;
  accuracy: number | null;
  totalDurationMins: number;
  lastActiveAt: string | null;
}
