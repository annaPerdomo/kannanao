'use client';

import { EmergencyCard, RequireAuth } from '@/components/Travel';

export default function EmergencyPage() {
  return (
    <RequireAuth feature="Emergency Card">
      <EmergencyCard />
    </RequireAuth>
  );
}
