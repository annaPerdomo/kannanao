/**
 * At or above this many waiting reviews the learners table emphasises the
 * number. Shared so the table and the needs-attention panel can't disagree.
 */
export const REVIEW_BACKLOG_THRESHOLD = 20;

/**
 * Whether a backlog is worth nagging an organizer about. A wrong answer
 * reschedules its card ten minutes out, so the raw count clears the threshold
 * for nearly every learner right after a session; requiring something 3+ days
 * late keeps the panel to backlogs that have actually gone stale.
 */
export function hasReviewBacklog(member: {
  reviewsWaiting: number | null;
  reviewsOverdue3d: number | null;
}): boolean {
  return (
    (member.reviewsWaiting ?? 0) >= REVIEW_BACKLOG_THRESHOLD && (member.reviewsOverdue3d ?? 0) > 0
  );
}
