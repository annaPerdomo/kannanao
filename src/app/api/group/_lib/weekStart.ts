/**
 * The start of "this week" for every group-facing weekly total.
 *
 * The leaderboard and the home page's per-group XP both answer the same
 * question — "how much has this group earned this week?" — so they must share
 * one definition of when the week began. Two independent copies would drift the
 * moment one of them changed its Monday offset, and the home row would quietly
 * disagree with the leaderboard it links to.
 *
 * Monday-start, in the server's local time. `study_sessions.started_at` is a
 * real timestamp (unlike the client-written `last_study_date`), so this is a
 * plain timestamp comparison and needs no reference timezone.
 */
export function weekStart(now: Date = new Date()): Date {
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const start = new Date(now);
  start.setDate(now.getDate() - mondayOffset);
  start.setHours(0, 0, 0, 0);
  return start;
}
