/** Above this many inactive learners, the rows collapse into one summary row. */
export const MAX_INACTIVE_ROWS = 3;
/** Same, for review backlogs — an uncapped info list would bury the warnings. */
export const MAX_BACKLOG_ROWS = 3;
/** Assignments due within this many days surface as "due soon" (warning). */
export const DUE_SOON_DAYS = 3;
/** A learner's best accuracy within this many points of the goal counts as "close". */
export const CLOSE_ACCURACY_MARGIN = 10;
/** Rows shown before the panel collapses behind "View all". */
export const MAX_VISIBLE_ROWS = 4;
/** Fewer forgotten words than this is normal churn, not a pattern to reteach. */
export const MIN_FORGOTTEN_WORDS = 3;
/** Words named in the forgotten row's sub-line before it gets unreadable. */
export const WORDS_PREVIEW_COUNT = 3;

export const MS_PER_DAY = 86_400_000;
