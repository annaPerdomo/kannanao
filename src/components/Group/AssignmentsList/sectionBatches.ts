import type { AssignmentBatch } from './groupAssignments';

export interface BatchSections {
  upcoming: AssignmentBatch[];
  current: AssignmentBatch[];
  finished: AssignmentBatch[];
}

export function sectionBatches(batches: AssignmentBatch[], today: string): BatchSections {
  const upcoming: AssignmentBatch[] = [];
  const current: AssignmentBatch[] = [];
  const finished: AssignmentBatch[] = [];

  for (const batch of batches) {
    const isFinished = batch.completed === batch.total;
    const isUpcoming = !isFinished && !!batch.availableOn && batch.availableOn > today;
    if (isFinished) {
      finished.push(batch);
    } else if (isUpcoming) {
      upcoming.push(batch);
    } else {
      current.push(batch);
    }
  }

  upcoming.sort((a, b) => (a.availableOn ?? '').localeCompare(b.availableOn ?? ''));
  finished.sort((a, b) => {
    if (!a.finishedAt && !b.finishedAt) return 0;
    if (!a.finishedAt) return 1;
    if (!b.finishedAt) return -1;
    return b.finishedAt.localeCompare(a.finishedAt);
  });

  return { upcoming, current, finished };
}
