import type { Metadata } from 'next';

import { QuestionQuest } from '@/components/Games';

export const metadata: Metadata = {
  title: 'Question Quest — Review | Kannanao',
  description: 'Practice Japanese question words — pick the answer that fits each question.',
};

export default function QuestionQuestPage() {
  return <QuestionQuest />;
}
