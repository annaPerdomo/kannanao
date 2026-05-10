'use client';

import { DailyPhrasePack, RequireAuth } from '@/components/Travel';

export default function DailyPage() {
  return (
    <RequireAuth feature="Daily Phrase Pack">
      <DailyPhrasePack />
    </RequireAuth>
  );
}
