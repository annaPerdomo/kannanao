const TAB_TO_SOURCE: Record<string, string> = {
  lessonSet: 'lesson',
  kana: 'kana',
  quizlet: 'quizlet',
  deck: 'blank',
};

export function materialsRedirectTarget(searchParams: { group?: string; tab?: string }): string {
  const { group, tab } = searchParams;

  if (group) {
    const source = tab ? TAB_TO_SOURCE[tab] : undefined;
    if (source) return `/group/${encodeURIComponent(group)}/add/${source}`;
    return `/group/${encodeURIComponent(group)}?tab=plan`;
  }

  if (tab === 'quizlet') return '/group?next=quizlet';
  return '/group';
}
