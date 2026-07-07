import type { Metadata } from 'next';

import { ParticlePicker } from '@/components/Games';

export const metadata: Metadata = {
  title: 'Particle Picker — Practice Games | Kannanao',
  description: 'Fill in the right Japanese particle (は・が・を・に・の…) to complete sentences.',
};

export default function ParticlePickerPage() {
  return <ParticlePicker />;
}
