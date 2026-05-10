'use client';

import { RequireAuth, ShowCardViewer } from '@/components/Travel';

export default function ShowCardsPage() {
  return (
    <RequireAuth feature="Point & Communicate">
      <ShowCardViewer />
    </RequireAuth>
  );
}
