'use client';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { useTranslations } from 'next-intl';

import { LearnerWordList } from '@/components/Group/HandoutDetailDialog/LearnerWordList';
import { SectionCard } from '@/components/Group/SectionCard';
import { Loading } from '@/components/Loading';
import type { useHandoutWordEdits } from '@/hooks/useHandoutWordEdits';
import type { HandoutWords } from '@/hooks/useHandoutWords';
import type { HandoutLearnerSummary } from '@/lib/handoutWords';
import type { Flashcard } from '@/types/flashcard';
import type { HandoutPatch, LessonUnit, LessonUnitWeek } from '@/types/lessonUnit';

import type { ViewMember } from './constants';
import { HandoutSettings } from './HandoutSettings';
import { HandoutWordsPanel } from './HandoutWordsPanel';
import { LearnersPanel } from './LearnersPanel';
import { SoundsSection } from './SoundsSection';

interface HandoutPageBodyProps {
  groupId: string;
  deckId: string;
  week: LessonUnitWeek;
  unit: LessonUnit | null;
  isDraft: boolean;
  cards: Flashcard[];
  viewMember: ViewMember | null;
  onSetViewMember: (member: ViewMember | null) => void;
  words: {
    data: HandoutWords | null;
    loading: boolean;
    error: string | null;
  };
  edits: ReturnType<typeof useHandoutWordEdits>;
  onWordsSaved: (message: string) => void;
  onSoundsSaved: (message: string) => void;
  onSelectLearner: (learner: HandoutLearnerSummary) => void;
  onAssign: (learner: HandoutLearnerSummary) => void;
  assigningId: string | null;
  onSendEncouragement: (memberId: string, message: string, emoji?: string) => Promise<unknown>;
  groupName: string;
  savingSchedule: boolean;
  onSaveSchedule: (patch: HandoutPatch) => Promise<boolean>;
  onRemoveWeek: () => Promise<boolean>;
  onShift?: () => void;
}

export function HandoutPageBody({
  groupId,
  deckId,
  week,
  unit,
  isDraft,
  cards,
  viewMember,
  onSetViewMember,
  words,
  edits,
  onWordsSaved,
  onSoundsSaved,
  onSelectLearner,
  onAssign,
  assigningId,
  onSendEncouragement,
  groupName,
  savingSchedule,
  onSaveSchedule,
  onRemoveWeek,
  onShift,
}: HandoutPageBodyProps) {
  const t = useTranslations('Materials.handoutPage');

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) 360px' },
        gap: 2.5,
        mt: 2.5,
        alignItems: 'start',
      }}
    >
      <Stack id="handout-words" spacing={2.5} sx={{ scrollMarginTop: 80 }}>
        {viewMember ? (
          <SectionCard title={t('learnerViewTitle', { name: viewMember.name })}>
            <LearnerWordList
              groupId={groupId}
              deckId={deckId}
              memberId={viewMember.id}
              memberName={viewMember.name}
              requiredMode={week.requiredMode}
              onBack={() => onSetViewMember(null)}
              scroll={false}
            />
          </SectionCard>
        ) : (
          <>
            <HandoutWordsPanel
              deckId={deckId}
              data={words.data}
              loading={words.loading}
              error={words.error}
              edits={edits}
              onSaved={onWordsSaved}
              isDraft={isDraft}
            />
            <SoundsSection
              key={deckId}
              groupId={groupId}
              deckId={deckId}
              cards={cards}
              kanaSets={week.kanaSets}
              handedOut={week.handedOut}
              onSaved={onSoundsSaved}
            />
          </>
        )}
      </Stack>

      {!isDraft && (
        <Stack spacing={2.5} sx={{ position: { md: 'sticky' }, top: { md: 88 } }}>
          {words.data?.learners ? (
            <LearnersPanel
              groupId={groupId}
              learners={words.data.learners}
              selectedId={viewMember?.id ?? null}
              onSelect={onSelectLearner}
              onAssign={onAssign}
              assigningId={assigningId}
              deckName={week.deckName}
              onSendEncouragement={onSendEncouragement}
            />
          ) : (
            words.loading && (
              <SectionCard title={t('learnersLoading')}>
                <Loading />
              </SectionCard>
            )
          )}
          <HandoutSettings
            key={deckId}
            week={week}
            groupName={groupName}
            saving={savingSchedule}
            onSave={onSaveSchedule}
            onRemove={onRemoveWeek}
            onShift={unit ? onShift : undefined}
          />
        </Stack>
      )}
    </Box>
  );
}
