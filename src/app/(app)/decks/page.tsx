'use client';

import { LearnerRedirect } from '@/components/LearnerRedirect';
import Decks from '@/pages/Decks';

export default function DecksPage() {
  return (
    <>
      <LearnerRedirect to="/binder" />
      <Decks />
    </>
  );
}
