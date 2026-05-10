'use client';

import { RequireAuth, ScenarioPlayer } from '@/components/Travel';

export default function ScenariosPage() {
  return (
    <RequireAuth feature="Scenario Practice">
      <ScenarioPlayer />
    </RequireAuth>
  );
}
