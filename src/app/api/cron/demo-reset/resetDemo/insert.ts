import type { SupabaseClient } from '@supabase/supabase-js';

import {
  type DemoSeed,
  type DemoSeedLearner,
  demoUuid,
  lapseCountsFor,
  progressTotalsFor,
  sessionStatsForDay,
} from '@/lib/demo';

import { mustSucceed } from './shared';

export async function insertGroup(
  sb: SupabaseClient,
  teacherId: string,
  seed: DemoSeed,
  learnerIds: Map<string, string>,
): Promise<string> {
  const { data: group, error: groupError } = await sb
    .from('groups')
    .insert({ organizer_id: teacherId, name: seed.group.name, emoji: '📚', pinned: false })
    .select('id')
    .single();
  if (groupError || !group) {
    throw new Error(`insert groups failed: ${groupError?.message}`);
  }
  const groupId = group.id as string;

  const memberRows = seed.learners.map((learner) => ({
    group_id: groupId,
    member_id: learnerIds.get(learner.username),
    organizer_id: teacherId,
  }));
  await mustSucceed('insert group_members', await sb.from('group_members').insert(memberRows));

  for (const learner of seed.learners) {
    const memberId = learnerIds.get(learner.username);
    await mustSucceed(
      `update profile pointer for ${learner.username}`,
      await sb
        .from('profiles')
        .update({ organizer_id: teacherId, group_id: groupId })
        .eq('id', memberId),
    );
  }

  return groupId;
}

export async function insertDeckAndCards(
  sb: SupabaseClient,
  teacherId: string,
  seed: DemoSeed,
): Promise<string> {
  const deckId = demoUuid(seed.deck.id);

  await mustSucceed(
    'insert decks',
    await sb.from('decks').insert({
      id: deckId,
      user_id: teacherId,
      name: seed.deck.name,
      description: null,
      emoji: seed.deck.emoji,
      pinned: false,
      is_public: false,
      position: 0,
      card_count: seed.cards.length,
      reading_practice: false,
    }),
  );

  const cardRows = seed.cards.map((card) => ({
    id: demoUuid(card.id),
    deck_id: deckId,
    word: card.word,
    reading: card.reading,
    meaning: card.meaning,
    image_url: null,
    image_query: '',
    example_jp: card.example_jp,
    example_en: card.example_en,
    main_view_mode: card.mainViewMode,
    card_type: card.cardType,
    jlpt_level: card.jlptLevel,
    position: card.position,
  }));
  await mustSucceed('insert cards', await sb.from('cards').insert(cardRows));

  const sentenceRows = seed.sentences.map((sentence) => ({
    deck_id: deckId,
    sentence_jp: sentence.sentence_jp,
    sentence_en: sentence.sentence_en,
    target_particle: sentence.target_particle,
    particle_index: sentence.particle_index,
    distractors: sentence.distractors,
    sentence_type: sentence.sentence_type,
    conversation_group: sentence.conversation_group,
    sort_order: sentence.sort_order,
    source_card_ids: sentence.source_card_ids.map((id) => demoUuid(id)),
    for_member_id: null,
  }));
  await mustSucceed(
    'insert deck_practice_sentences',
    await sb.from('deck_practice_sentences').insert(sentenceRows),
  );

  return deckId;
}

export async function insertAssignments(
  sb: SupabaseClient,
  teacherId: string,
  groupId: string,
  deckId: string,
  seed: DemoSeed,
  learnerIds: Map<string, string>,
): Promise<void> {
  const a = seed.assignment;
  const rows = seed.learners.map((learner) => ({
    organizer_id: teacherId,
    member_id: learnerIds.get(learner.username),
    deck_id: deckId,
    group_id: groupId,
    kana_set: null,
    title: a.title,
    note: a.note,
    due_date: a.due_date,
    available_on: a.available_on,
    // Not "now": that would make a 14-day-old handout look brand new nightly.
    created_at: a.created_at,
    completed_at: a.completed_at,
    required_accuracy: a.required_accuracy,
    required_mode: a.required_mode,
    // No pure function computes these for a simulated history; left null, not guessed.
    progress_accuracy: a.progress_accuracy,
    baseline_accuracy: a.baseline_accuracy,
    goal_met_at: a.goal_met_at,
  }));
  await mustSucceed('insert assignments', await sb.from('assignments').insert(rows));
}

export async function insertLearnerHistory(
  sb: SupabaseClient,
  deckId: string,
  learner: DemoSeedLearner,
  learnerId: string,
  now: Date,
): Promise<number> {
  const lapses = lapseCountsFor(learner.days);
  const progressRows = learner.progress.map((row) => ({
    user_id: learnerId,
    card_id: demoUuid(row.cardId),
    correct_count: row.correctCount,
    wrong_count: row.wrongCount,
    last_reviewed_at: row.lastReviewedAt,
    next_review_at: row.nextReviewAt,
    interval_days: row.intervalDays,
    ease: row.ease,
    lapse_count: lapses.get(row.cardId) ?? 0,
  }));
  if (progressRows.length > 0) {
    await mustSucceed(
      `insert card_progress for ${learner.username}`,
      await sb.from('card_progress').insert(progressRows),
    );
  }

  const sessionRows = learner.days.flatMap((day) =>
    sessionStatsForDay(day).map((stats) => ({
      user_id: learnerId,
      deck_id: deckId,
      practice_mode: stats.practiceMode,
      cards_studied: stats.cardsStudied,
      cards_correct: stats.cardsCorrect,
      xp_earned: stats.xpEarned,
      duration_secs: Math.round((Date.parse(stats.endedAt) - Date.parse(stats.startedAt)) / 1000),
      started_at: stats.startedAt,
      ended_at: stats.endedAt,
    })),
  );
  if (sessionRows.length > 0) {
    await mustSucceed(
      `insert study_sessions for ${learner.username}`,
      await sb.from('study_sessions').insert(sessionRows),
    );
  }

  const totals = progressTotalsFor(learner.days, now);
  await mustSucceed(
    `insert user_progress for ${learner.username}`,
    await sb.from('user_progress').insert({
      user_id: learnerId,
      total_xp: totals.totalXp,
      level: totals.level,
      streak_days: totals.streakDays,
      longest_streak: totals.longestStreak,
      last_study_date: totals.lastStudyDate,
      total_cards_studied: totals.totalCardsStudied,
      total_correct: totals.totalCorrect,
      total_sessions: totals.totalSessions,
    }),
  );

  return progressRows.length;
}
