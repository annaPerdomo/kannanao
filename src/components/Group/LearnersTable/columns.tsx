import type { ComponentType } from 'react';

import type { GroupMember } from '@/hooks/useGroup';

import { AccuracyCell } from './AccuracyCell';
import { CardsCell } from './CardsCell';
import type { SortKey } from './derive';
import { ReviewsWaitingCell } from './ReviewsWaitingCell';
import { StatusLabel } from './StatusLabel';
import { StreakCell } from './StreakCell';

export interface LearnerColumn {
  key: SortKey;
  labelKey: string;
  align: 'left' | 'right';
  Cell: ComponentType<{ member: GroupMember }>;
}

/**
 * Header + row-cell definition in one place. The Learner (identity) and
 * chevron columns are fixed and drawn directly by the table; everything
 * sortable lives here, so a new column is a Cell component plus one entry.
 */
export const LEARNER_COLUMNS: LearnerColumn[] = [
  { key: 'status', labelKey: 'colStatus', align: 'left', Cell: StatusLabel },
  { key: 'streak', labelKey: 'colStreak', align: 'right', Cell: StreakCell },
  { key: 'cards', labelKey: 'colCards', align: 'right', Cell: CardsCell },
  { key: 'reviews', labelKey: 'colReviewsWaiting', align: 'right', Cell: ReviewsWaitingCell },
  { key: 'accuracy', labelKey: 'colAccuracy', align: 'right', Cell: AccuracyCell },
];
