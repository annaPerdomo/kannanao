import { DifficultWords } from '../DifficultWords';

interface WordsTabProps {
  groupId: string;
}

export function WordsTab({ groupId }: WordsTabProps) {
  return <DifficultWords groupId={groupId} />;
}
