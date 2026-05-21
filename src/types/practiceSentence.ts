export interface PracticeSentence {
  id: string;
  deckId: string;
  sentenceJp: string;
  sentenceEn: string;
  targetParticle: string;
  particleIndex: number;
  distractors: string[];
  sentenceType: 'question' | 'response' | 'statement';
  conversationGroup: number;
  sortOrder: number;
  sourceCardIds: string[];
  createdAt: string;
}

/** Row shape coming from Supabase */
export interface DbPracticeSentence {
  id: string;
  deck_id: string;
  sentence_jp: string;
  sentence_en: string;
  target_particle: string;
  particle_index: number;
  distractors: string[];
  sentence_type: 'question' | 'response' | 'statement';
  conversation_group: number;
  sort_order: number;
  source_card_ids: string[];
  created_at: string;
}

export function dbSentenceToApp(row: DbPracticeSentence): PracticeSentence {
  return {
    id: row.id,
    deckId: row.deck_id,
    sentenceJp: row.sentence_jp,
    sentenceEn: row.sentence_en,
    targetParticle: row.target_particle,
    particleIndex: row.particle_index,
    distractors: row.distractors,
    sentenceType: row.sentence_type,
    conversationGroup: row.conversation_group,
    sortOrder: row.sort_order,
    sourceCardIds: row.source_card_ids ?? [],
    createdAt: row.created_at,
  };
}
